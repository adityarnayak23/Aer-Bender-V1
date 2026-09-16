// Verification tests for chords and musical data

// Mock window for Node testing
global.window = {};
require('../src/chords-data.js');

const { noteToMidi, midiToFreq, noteToFreq, midiToNote, transposeNotes, CHORD_PRESETS } = window.ChordsData;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('--- Testing Note to MIDI & Frequency ---');
assert(noteToMidi('A4') === 69, 'A4 should be MIDI 69');
assert(Math.round(midiToFreq(69)) === 440, 'MIDI 69 should be 440 Hz');
assert(noteToMidi('C4') === 60, 'C4 should be MIDI 60');
assert(Math.round(noteToFreq('C4')) === 262, 'C4 should be approx 261.63 Hz (262)');
assert(midiToNote(60) === 'C4', 'MIDI 60 should convert to C4');
assert(midiToNote(69) === 'A4', 'MIDI 69 should convert to A4');

console.log('\n--- Testing Transpositions ---');
const cMajorNotes = ['C3', 'E3', 'G3'];
const dMajorNotes = transposeNotes(cMajorNotes, 2, 0);
assert(JSON.stringify(dMajorNotes) === JSON.stringify(['D3', 'F#3', 'A3']), 'C Major transposed +2 semitones should be D Major (D3, F#3, A3)');

const cMajorOctaveUp = transposeNotes(cMajorNotes, 0, 1);
assert(JSON.stringify(cMajorOctaveUp) === JSON.stringify(['C4', 'E4', 'G4']), 'C Major +1 octave should be C4, E4, G4');

console.log('\n--- Testing Preset Data Integrity ---');
const presets = Object.keys(CHORD_PRESETS);
assert(presets.length >= 5, `Found ${presets.length} presets`);

presets.forEach(pId => {
  const p = CHORD_PRESETS[pId];
  assert(p.chords[0].name === 'Mute', `${p.name} chord 0 should be Mute`);
  for (let f = 1; f <= 5; f++) {
    const chord = p.chords[f];
    assert(chord && chord.notes.length > 0, `${p.name} chord ${f} (${chord?.name}) has valid notes: [${chord?.notes.join(', ')}]`);
    chord.notes.forEach(note => {
      const midi = noteToMidi(note);
      assert(midi >= 21 && midi <= 108, `Note ${note} in ${chord.name} is within valid 88-key piano range (MIDI ${midi})`);
    });
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
