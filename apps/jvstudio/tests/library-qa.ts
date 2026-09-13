import * as Tone from 'tone';
import { initializeInstrumentCatalog, instruments, createInstrument, selectSample, instrumentCacheStats, clearInstrumentCache } from '../src/audio/instruments';
import { renderProjectWav } from '../src/audio/exportWav';
import { createProject, createTrack, createClip, createNote } from '../src/project';
const result = document.querySelector('#result')!;
const log = (text: string) => { result.textContent += '\n' + text; };
function check(value: unknown, message: string) { if (!value) throw new Error(message); }
async function run(ids?: string[]) {
  result.textContent = 'Validando…';
  await initializeInstrumentCatalog();
  check(instrumentCacheStats().buffers === 0, 'Startup decoded samples');
  log(`Catálogo: ${instruments.length}; cero samples precargados`);
  for (const definition of instruments.filter(d => !ids || ids.includes(d.id))) {
    const m = definition.manifest;
    let cases = 0;
    for (const layer of m.velocityLayers) {
      const midi = Math.round((m.range.lowestMidi + m.range.highestMidi) / 2);
      for (const v of [layer.velocityMin, layer.velocityMax]) {
        const velocity = v / 127;
        const selected = selectSample(m, midi, velocity)!;
        const reference = new OfflineAudioContext(m.audio.channels, 44100 * 2, 44100);
        const raw = await reference.decodeAudioData(await (await fetch('/jvstudio/' + definition.manifestPath.replace('manifest.json', '') + selected.sample.file)).arrayBuffer());
        check(raw.numberOfChannels === m.audio.channels, 'Channel mismatch');
        const source = reference.createBufferSource(); source.buffer = raw;
        source.playbackRate.value = 2 ** ((midi - selected.sample.rootMidi) / 12);
        const gain = reference.createGain(); source.connect(gain); gain.connect(reference.destination);
        const amplitude = velocity * 10 ** (m.playback.gainDb / 20);
        gain.gain.setValueAtTime(m.playback.attack ? 0 : amplitude, 0);
        if (m.playback.attack) gain.gain.linearRampToValueAtTime(amplitude, m.playback.attack);
        gain.gain.setValueAtTime(amplitude, 0.5);
        gain.gain.linearRampToValueAtTime(0, 0.5 + m.playback.release);
        source.start(0);
        const expected = await reference.startRendering();
        let voice;
        const actual = await Tone.Offline(async () => {
          voice = createInstrument(m.id, Tone.getDestination());
          await voice.prepare([{ midi, velocity }]);
          voice.triggerAttackRelease(Tone.Frequency(midi, 'midi').toNote(), 0.5, 0, velocity);
        }, 2, m.audio.channels, 44100);
        voice!.dispose();
        const rendered = actual.get()!;
        let energy = 0, error = 0, peak = 0;
        for (let c = 0; c < m.audio.channels; c++) {
          const a = rendered.getChannelData(c), b = expected.getChannelData(c);
          for (let n = 0; n < a.length; n++) { energy += b[n] ** 2; error += (a[n] - b[n]) ** 2; peak = Math.max(peak, Math.abs(a[n])); }
        }
        check(energy > 0 && peak > 0, 'Silent render');
        check(error / energy < 0.0001, `Manifest/reference audio mismatch ${m.id}: ${error / energy}`);
        actual.dispose(); cases++;
      }
    }
    const midi = Math.round((m.range.lowestMidi + m.range.highestMidi) / 2);
    const project = createProject({ lengthBars: 1, tracks: [createTrack({ instrumentId: m.id, clips: [createClip({ notes: [createNote({ midi })] })] })] });
    const wav = new DataView(await (await renderProjectWav(project)).arrayBuffer());
    let nonzero = false;
    for (let n = 44; n < wav.byteLength; n += 2) if (wav.getInt16(n, true)) { nonzero = true; break; }
    check(wav.getUint16(22, true) === 2 && nonzero, 'Empty/invalid WAV');
    check(instrumentCacheStats().bytes <= instrumentCacheStats().limitBytes, 'Cache exceeded budget');
    log(`PASS ${m.id}: ${cases} límites velocity, ${m.audio.channels} canal(es), gain/attack/release/transposición contra referencia nativa; WAV ${wav.byteLength} bytes; cache ${(instrumentCacheStats().bytes / 1048576).toFixed(1)} MiB`);
  }
  clearInstrumentCache();
  check(instrumentCacheStats().bytes === 0, 'Cache not cleared');
  log('PASS: caché liberada. Validación terminada.');
}
document.querySelector('#pilot')!.addEventListener('click', () => run(['jv-grand-piano','jv-solo-cello']).then(() => { (document.querySelector('#all') as HTMLButtonElement).disabled = false; }).catch(e => log('FAIL: ' + e.stack)));
document.querySelector('#all')!.addEventListener('click', () => run().catch(e => log('FAIL: ' + e.stack)));

async function lifecycle() {
  result.textContent = 'Validando cambios y memoria...';
  await initializeInstrumentCatalog();
  clearInstrumentCache();
  const d = instruments.find(d => d.id === 'jv-grand-piano')!;
  let oldVoice, newVoice;
  const silent = await Tone.Offline(async () => {
    oldVoice = createInstrument(d.id, Tone.getDestination());
    const pending = oldVoice.prepare([{ midi: 60, velocity: 0.5 }]);
    oldVoice.triggerAttackRelease('C4', 0.5, 0, 0.5);
    oldVoice.dispose();
    await pending;
  }, 1, 2, 44100);
  check(silent.get()!.getChannelData(0).every(v => v === 0), 'Disposed instrument played a late note');
  silent.dispose();
  let measured = 0;
  const rendered = await Tone.Offline(async () => {
    newVoice = createInstrument(d.id, Tone.getDestination());
    const notes = d.manifest.samples.slice(0, 40).map(s => ({ midi: s.rootMidi, velocity: s.velocityMax / 127 }));
    await newVoice.prepare(notes);
    measured = instrumentCacheStats().bytes;
    check(measured <= instrumentCacheStats().limitBytes, 'LRU exceeded budget');
    newVoice.triggerAttackRelease(Tone.Frequency(notes[0].midi, 'midi').toNote(), 0.5, 0, notes[0].velocity);
  }, 2, 2, 44100);
  check(rendered.get()!.getChannelData(0).some(v => v !== 0), 'Protected sample lost during eviction');
  newVoice!.dispose(); rendered.dispose(); clearInstrumentCache();
  log(`PASS cambio durante descarga: voz anterior cancelada; nueva voz audible. LRU con 40 samples: ${(measured/1048576).toFixed(1)} MiB; sample activo conservado tras expulsion; cache final ${instrumentCacheStats().bytes} bytes.`);
}
document.querySelector('#lifecycle')!.addEventListener('click', () => lifecycle().catch(e => log('FAIL: ' + e.stack)));
