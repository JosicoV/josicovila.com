import { describe, expect, it } from 'vitest';

import { encodeWav } from './exportWav';

describe('WAV encoding', () => {
  it('writes a stereo 16-bit PCM RIFF file', () => {
    const channels = [new Float32Array([-1, 0.5]), new Float32Array([1, -0.5])];
    const wav = encodeWav({ length: 2, numberOfChannels: 2, sampleRate: 44_100, getChannelData: (channel) => channels[channel] });
    const view = new DataView(wav);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe('RIFF');
    expect(new TextDecoder().decode(wav.slice(8, 12))).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44_100);
    expect(view.getUint32(40, true)).toBe(8);
    expect(view.getInt16(44, true)).toBe(-32_768);
    expect(view.getInt16(46, true)).toBe(32_767);
  });
});
