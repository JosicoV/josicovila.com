import * as Tone from 'tone';

import { barsToBeats, type InstrumentTrack, type Project } from '../project';
import { createInstrument, type InstrumentVoice } from './instruments';
import { trackGain } from './mix';
import { scheduleEvents } from './projectEvents';

export type AudioState = 'idle' | 'starting' | 'playing' | 'paused' | 'stopped' | 'error';

type StateListener = (state: AudioState) => void;
type ScheduledNote = {
  time: string;
  trackId: string;
  midi: number;
  duration: string;
  velocity: number;
};
type TrackVoice = {
  instrumentId: string;
  playback: InstrumentVoice;
  preview: InstrumentVoice;
  gain: Tone.Gain;
  panner: Tone.Panner;
  previewGain: Tone.Gain;
  previewPanner: Tone.Panner;
};

export class AudioEngine {
  private readonly transport = Tone.getTransport();
  private readonly masterGain: Tone.Gain;
  private readonly voices = new Map<string, TrackVoice>();
  private project: Project;
  private previewRequest = 0;
  private disposed = false;
  private playRequest = 0;
  private part: Tone.Part<ScheduledNote> | null = null;
  private state: AudioState = 'idle';
  private listener: StateListener | null = null;

  constructor(project: Project) {
    this.project = structuredClone(project);
    this.masterGain = new Tone.Gain(project.master.volume).toDestination();
    this.transport.bpm.value = project.bpm;
    this.transport.loop = true;
    this.transport.loopStart = 0;
    this.transport.loopEnd = this.toTicks(barsToBeats(project.lengthBars, project.timeSignature));
    this.syncVoices(project);
  }

  async previewNote(trackId: string, midi: number, velocity = 0.8): Promise<void> {
    if (this.disposed) return;
    const request = ++this.previewRequest;
    await Tone.start();
    if (this.disposed || request !== this.previewRequest) return;
    const voice = this.voices.get(trackId);
    if (!voice) return;
    voice.preview.triggerAttackRelease(Tone.Frequency(midi, 'midi').toNote(), 0.3, Tone.now(), velocity);
  }

  onStateChange(listener: StateListener): void {
    this.listener = listener;
    listener(this.state);
  }

  async play(): Promise<void> {
    if (this.state === 'playing' || this.state === 'starting') return;
    this.setState('starting');
    const request = ++this.playRequest;
    try {
      await Tone.start();
      if (request !== this.playRequest) return;
      await this.prepareScheduledSamples();
      if (request !== this.playRequest) return;
      this.ensurePart();
      this.transport.start('+0.05');
      this.setState('playing');
    } catch (error) {
      console.error('JV Studio could not start the audio context.', error);
      this.setState('error');
    }
  }

  stop(): void {
    this.previewRequest++;
    this.playRequest++;
    this.transport.stop();
    this.transport.position = 0;
    this.releaseAll();
    this.setState('stopped');
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.playRequest++;
    this.transport.pause();
    this.releaseAll();
    this.setState('paused');
  }

  setBpm(bpm: number): void {
    this.transport.bpm.rampTo(bpm, 0.08);
  }

  setTrackMix(project: Project): void {
    this.project = structuredClone(project);
    this.masterGain.gain.value = project.master.volume;
    this.syncVoices(project);
  }

  setProject(project: Project): void {
    this.stop();
    this.part?.dispose();
    this.part = null;
    this.project = structuredClone(project);
    this.masterGain.gain.value = project.master.volume;
    this.syncVoices(project);
    this.transport.loopEnd = this.toTicks(barsToBeats(project.lengthBars, project.timeSignature));
    this.setBpm(project.bpm);
  }

  getProgress(): number {
    return this.state === 'playing' || this.state === 'paused' ? this.transport.progress : 0;
  }

  isPlaying(): boolean {
    return this.state === 'playing';
  }

  isPaused(): boolean {
    return this.state === 'paused';
  }

  dispose(): void {
    this.disposed = true;
    this.previewRequest++;
    this.playRequest++;
    this.transport.stop();
    this.part?.dispose();
    this.disposeVoices();
    this.masterGain.dispose();
  }

  private ensurePart(): void {
    if (this.part) return;
    const events = scheduleEvents(this.project).map((note) => ({
      time: this.toTicks(note.startBeat),
      trackId: note.trackId,
      midi: note.midi,
      duration: this.toTicks(note.durationBeats),
      velocity: note.velocity,
    }));
    const part = new Tone.Part<ScheduledNote>((time, note) => {
      const voice = this.voices.get(note.trackId);
      if (!voice || voice.gain.gain.value <= 0) return;
      voice.playback.triggerAttackRelease(
        Tone.Frequency(note.midi, 'midi').toNote(),
        note.duration,
        time,
        note.velocity,
      );
    }, events).start(0);
    part.loop = false;
    this.part = part;
  }

  private async prepareScheduledSamples(): Promise<void> {
    const notes = scheduleEvents(this.project);
    for (const track of this.project.tracks) {
      await this.voices.get(track.id)?.playback.prepare(
        notes.filter((note) => note.trackId === track.id).map((note) => ({ midi: note.midi, velocity: note.velocity })),
      );
    }
  }

  private syncVoices(project: Project): void {
    const currentIds = new Set(project.tracks.map((track) => track.id));
    for (const [trackId, voice] of this.voices) {
      if (!currentIds.has(trackId)) {
        this.disposeVoice(voice);
        this.voices.delete(trackId);
      }
    }
    for (const track of project.tracks) {
      let voice = this.voices.get(track.id);
      if (!voice || voice.instrumentId !== track.instrumentId) {
        if (voice) this.disposeVoice(voice);
        voice = this.createVoice(track);
        this.voices.set(track.id, voice);
      }
      voice.gain.gain.value = trackGain(track, project.tracks);
      voice.panner.pan.value = track.pan;
      voice.previewGain.gain.value = track.volume;
      voice.previewPanner.pan.value = track.pan;
    }
  }

  private createVoice(track: InstrumentTrack): TrackVoice {
    const gain = new Tone.Gain(track.volume).connect(this.masterGain);
    const panner = new Tone.Panner(track.pan).connect(gain);
    const previewGain = new Tone.Gain(track.volume).connect(this.masterGain);
    const previewPanner = new Tone.Panner(track.pan).connect(previewGain);
    return {
      instrumentId: track.instrumentId,
      playback: createInstrument(track.instrumentId, panner),
      preview: createInstrument(track.instrumentId, previewPanner),
      gain,
      panner,
      previewGain,
      previewPanner,
    };
  }

  private releaseAll(): void {
    for (const voice of this.voices.values()) {
      voice.playback.releaseAll();
      voice.preview.releaseAll();
    }
  }

  private disposeVoice(voice: TrackVoice): void {
    voice.playback.dispose();
    voice.preview.dispose();
    voice.gain.dispose();
    voice.panner.dispose();
    voice.previewGain.dispose();
    voice.previewPanner.dispose();
  }

  private disposeVoices(): void {
    for (const voice of this.voices.values()) this.disposeVoice(voice);
    this.voices.clear();
  }

  private setState(state: AudioState): void {
    this.state = state;
    this.listener?.(state);
  }

  private toTicks(beats: number): string {
    return `${Math.round(beats * this.transport.PPQ)}i`;
  }
}
