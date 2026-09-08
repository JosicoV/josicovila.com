import * as Tone from 'tone';

import type { InstrumentTrack, Project } from '../project';
import { EffectChain } from './EffectChain';
import { MasterBus } from './MasterBus';
import { trackGain } from './mix';
import { SendBus } from './SendBus';

export interface StereoMeterLevel {
  left: number;
  right: number;
}

export interface MixerMeterLevels {
  tracks: Record<string, StereoMeterLevel>;
  master: StereoMeterLevel;
}

interface TrackChannel {
  inserts: EffectChain;
  panner: Tone.Panner;
  gain: Tone.Gain;
  meter: Tone.Meter;
  previewPanner: Tone.Panner;
  previewGain: Tone.Gain;
  reverbSend: Tone.Gain;
  delaySend: Tone.Gain;
}

export class MixerEngine {
  readonly master: MasterBus;
  readonly reverb: SendBus;
  readonly delay: SendBus;
  private readonly channels = new Map<string, TrackChannel>();
  private reverbRequired = false;

  constructor(project: Project) {
    this.master = new MasterBus(project.master, project.bpm);
    this.reverb = new SendBus(project.sendFx.reverb, project.bpm, this.master.input);
    this.delay = new SendBus(project.sendFx.delay, project.bpm, this.master.input);
    this.sync(project);
  }

  sync(project: Project): void {
    this.master.sync(project.master, project.bpm);
    this.reverb.sync(project.sendFx.reverb, project.bpm);
    this.delay.sync(project.sendFx.delay, project.bpm);
    this.reverbRequired = project.sendFx.reverb.enabled && project.tracks.some((track) => track.sends.reverb > 0);
    const ids = new Set(project.tracks.map((track) => track.id));
    for (const [trackId, channel] of this.channels) {
      if (!ids.has(trackId)) {
        disposeTrackChannel(channel);
        this.channels.delete(trackId);
      }
    }
    for (const track of project.tracks) {
      const channel = this.channels.get(track.id) ?? this.createTrackChannel(track);
      this.channels.set(track.id, channel);
      channel.inserts.sync(track.insertFx, project.bpm);
      channel.panner.pan.value = track.pan;
      channel.gain.gain.value = trackGain(track, project.tracks);
      channel.previewPanner.pan.value = track.pan;
      channel.previewGain.gain.value = track.volume;
      channel.reverbSend.gain.value = track.sends.reverb;
      channel.delaySend.gain.value = track.sends.delay;
    }
  }

  input(trackId: string): Tone.Gain {
    return this.requireChannel(trackId).inserts.input;
  }

  previewInput(trackId: string): Tone.Panner {
    return this.requireChannel(trackId).previewPanner;
  }

  levels(): MixerMeterLevels {
    const tracks: Record<string, StereoMeterLevel> = {};
    for (const [trackId, channel] of this.channels) tracks[trackId] = stereoMeterLevel(channel.meter.getValue());
    return { tracks, master: stereoMeterLevel(this.master.meter.getValue()) };
  }

  async ready(): Promise<void> {
    await Promise.all([
      this.master.ready(),
      this.reverbRequired ? this.reverb.ready() : Promise.resolve(),
      this.delay.ready(),
      ...Array.from(this.channels.values(), (channel) => channel.inserts.ready()),
    ]);
  }

  dispose(): void {
    for (const channel of this.channels.values()) disposeTrackChannel(channel);
    this.channels.clear();
    this.reverb.dispose();
    this.delay.dispose();
    this.master.dispose();
  }

  private createTrackChannel(track: InstrumentTrack): TrackChannel {
    const inserts = new EffectChain();
    const panner = new Tone.Panner(track.pan);
    const gain = new Tone.Gain(track.volume);
    const meter = new Tone.Meter({ channelCount: 2, smoothing: 0.72, normalRange: false });
    const previewPanner = new Tone.Panner(track.pan);
    const previewGain = new Tone.Gain(track.volume);
    const reverbSend = this.reverb.createTap(track.sends.reverb);
    const delaySend = this.delay.createTap(track.sends.delay);

    inserts.output.connect(panner);
    panner.connect(gain);
    gain.connect(meter);
    previewPanner.connect(previewGain);
    previewGain.connect(meter);
    meter.connect(this.master.input);
    meter.connect(reverbSend);
    meter.connect(delaySend);

    return { inserts, panner, gain, meter, previewPanner, previewGain, reverbSend, delaySend };
  }

  private requireChannel(trackId: string): TrackChannel {
    const channel = this.channels.get(trackId);
    if (!channel) throw new RangeError(`Mixer channel "${trackId}" was not found.`);
    return channel;
  }
}

function disposeTrackChannel(channel: TrackChannel): void {
  channel.inserts.dispose();
  channel.panner.dispose();
  channel.gain.dispose();
  channel.meter.dispose();
  channel.previewPanner.dispose();
  channel.previewGain.dispose();
  channel.reverbSend.dispose();
  channel.delaySend.dispose();
}

function stereoMeterLevel(value: number | number[]): StereoMeterLevel {
  const channels = Array.isArray(value) ? value : [value, value];
  return {
    left: normalizeMeterValue(channels[0]),
    right: normalizeMeterValue(channels[1] ?? channels[0]),
  };
}

function normalizeMeterValue(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(6, Math.max(-60, value)) : -60;
}
