import * as Tone from 'tone';

import { barsToBeats, type Project } from '../project';
import { createInstrument, type InstrumentVoice } from './instruments';
import { trackGain } from './mix';
import { scheduleEvents } from './projectEvents';

const SAMPLE_RATE = 44_100;
const RELEASE_TAIL_SECONDS = 1.5;
export const MAX_WAV_EXPORT_SECONDS = 20 * 60;

interface PcmAudioBuffer {
  length: number;
  numberOfChannels: number;
  sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

export async function renderProjectWav(project: Project): Promise<Blob> {
  const beatSeconds = 60 / project.bpm;
  const projectSeconds = barsToBeats(project.lengthBars, project.timeSignature) * beatSeconds;
  const renderSeconds = projectSeconds + RELEASE_TAIL_SECONDS;
  if (renderSeconds > MAX_WAV_EXPORT_SECONDS) throw new RangeError('WAV export exceeds the 20 minute safety limit.');

  const events = scheduleEvents(project);
  const rendered = await Tone.Offline(async () => {
    const voices = new Map<string, InstrumentVoice>();
    for (const track of project.tracks) {
      const panner = new Tone.Panner(track.pan).toDestination();
      const gain = new Tone.Gain(trackGain(track, project.tracks)).connect(panner);
      voices.set(track.id, createInstrument(track.instrumentId, gain));
    }
    for (const track of project.tracks) {
      await voices.get(track.id)?.prepare(
        events.filter((note) => note.trackId === track.id).map((note) => ({ midi: note.midi, velocity: note.velocity })),
      );
    }
    for (const note of events) {
      voices.get(note.trackId)?.triggerAttackRelease(
        Tone.Frequency(note.midi, 'midi').toNote(),
        note.durationBeats * beatSeconds,
        note.startBeat * beatSeconds,
        note.velocity,
      );
    }
  }, renderSeconds, 2, SAMPLE_RATE);

  const audioBuffer = rendered.get();
  if (!audioBuffer) throw new Error('Offline rendering did not produce an audio buffer.');
  return new Blob([encodeWav(audioBuffer)], { type: 'audio/wav' });
}

export function encodeWav(buffer: PcmAudioBuffer): ArrayBuffer {
  const channels = Math.min(2, buffer.numberOfChannels);
  const bytesPerSample = 2;
  const dataBytes = buffer.length * channels * bytesPerSample;
  const output = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(output);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  let offset = 44;
  for (let sample = 0; sample < buffer.length; sample += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const value = Math.max(-1, Math.min(1, channelData[channel][sample] ?? 0));
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
      offset += bytesPerSample;
    }
  }
  return output;
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}
