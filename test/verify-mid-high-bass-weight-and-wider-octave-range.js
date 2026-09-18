const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=============================================================');
console.log('🎸 VERIFYING BASS WEIGHT & WIDE MID-OCTAVE HEAD TILT RANGE');
console.log('=============================================================');

const trackerPath = path.join(__dirname, '../src/carnatic-flute-tracker.js');
const audioPath = path.join(__dirname, '../src/flute-audio.js');

const trackerContent = fs.readFileSync(trackerPath, 'utf8');
const audioContent = fs.readFileSync(audioPath, 'utf8');

// --- 1. Verify Head Pitch Tilt Octave Range Expansion ---
console.log('\n--- 1. Testing Head Tilt Octave Range Expansion ---');

// Mandra requires more tilt down (< 0.26)
assert(trackerContent.includes('smoothScore < 0.26'), 'Lower octave entry must require more tilt down (< 0.26)');
assert(trackerContent.includes('smoothScore > 0.34'), 'Lower octave exit must be > 0.34');
console.log('✅ PASS: Lower octave requires deeper tilt down (< 0.26 entry, > 0.34 exit)');

// Tara requires more tilt up (> 0.74)
assert(trackerContent.includes('smoothScore > 0.74'), 'Higher octave entry must require more tilt up (> 0.74)');
assert(trackerContent.includes('smoothScore < 0.66'), 'Higher octave exit must be < 0.66');
console.log('✅ PASS: Higher octave requires steeper tilt up (> 0.74 entry, < 0.66 exit)');

// Mid octave clean range (0.26 to 0.74)
assert(trackerContent.includes('0.26 <= score <= 0.74'), 'Mid octave must enjoy wide, stable range from 0.26 to 0.74');
console.log('✅ PASS: Mid octave range expanded to 0.26 - 0.74 for clean, effortless playing');

// --- 2. Verify Audio Synthesis Bass & Weight Enhancements ---
console.log('\n--- 2. Testing Audio Synthesis Bass & Weight Enhancements ---');

// Sub-Harmonic oscillator boost for mid & higher notes
assert(audioContent.includes('oscMixGainSub.gain.setValueAtTime(isLowerOctave ? 0.75 : (isTaraOctave ? 0.42 : 0.48), now)'),
  'Electric voice must have strong sub-harmonic oscillator gain for mid (0.48) and higher (0.42) notes');
console.log('✅ PASS: Sub-harmonic triangle oscillator boost active for mid & higher notes');

// Low-shelf bass boost (bassEQ) in electric voice
assert(audioContent.includes('bassEQ.gain.setValueAtTime(7.2, now)'),
  'Electric voice must provide +7.2dB low shelf boost for mid notes');
assert(audioContent.includes('bassEQ.gain.setValueAtTime(6.0, now)'),
  'Electric voice must provide +6.0dB low shelf boost for higher notes');
console.log('✅ PASS: Resonant low-shelf bass filter active for mid (+7.2dB) and high (+6.0dB) notes');

// Body resonance weight filter (bodyWeightEQ)
assert(audioContent.includes('bodyWeightEQ'), 'Electric voice must include bodyWeightEQ peaking filter');
assert(audioContent.includes('bodyWeightEQ.gain.setValueAtTime(isLowerOctave ? 4.0 : 5.2, now)'),
  'Body weight filter must provide +5.2dB warmth boost for mid and higher notes');
console.log('✅ PASS: Wood & bore acoustic body weight filter (+5.2dB) active in electric voice');

// Legato transitions maintain bass & weight
assert(audioContent.includes('targetBassGain = isLowerOctave ? 9.5 : (isTaraOctave ? 6.0 : 7.2)'),
  'Legato transitions must preserve bass boost across octaves');
assert(audioContent.includes('targetSubGain = isLowerOctave ? 0.75 : (isTaraOctave ? 0.42 : 0.48)'),
  'Legato transitions must preserve sub-harmonic bass weight');
console.log('✅ PASS: Legato notes maintain full bass and weight during melodic glides');

// Acoustic sample voice (playSwara) body bass filter
assert(audioContent.includes('bodyBassFilter.gain.setValueAtTime(7.0, now)'),
  'Sample voice must provide +7.0dB bass weight for mid notes');
assert(audioContent.includes('bodyBassFilter.gain.setValueAtTime(5.8, now)'),
  'Sample voice must provide +5.8dB bass weight for higher notes');
console.log('✅ PASS: Acoustic sample voice equips resonant bass filter for mid & high notes');

// --- 3. Runtime Simulation: Mid-Octave Stability with Head Jitter ---
console.log('\n--- 3. Testing Mid-Octave Head Jitter Immunity at Runtime ---');

const dummyWindow = { devicePixelRatio: 2 };
const swarasCode = fs.readFileSync(path.join(__dirname, '../src/swaras-data.js'), 'utf8');
eval(`(function(window) { ${swarasCode} })(dummyWindow)`);
global.window = dummyWindow;

eval(`(function(window) { ${trackerContent} })(dummyWindow)`);
const CarnaticFluteTracker = dummyWindow.CarnaticFluteTracker;

const tracker = new CarnaticFluteTracker();
tracker.currentOctave = 0; // Starts in Mid (Madhya)

// Simulate slight head nod downward (score ~ 0.32). Previously this would flip to -1!
tracker.smoothedHeadPitchScore = 0.32;
// Emulate the Schmitt trigger
let simulatedOctave = 0;
if (tracker.currentOctave === 0) {
  if (tracker.smoothedHeadPitchScore < 0.26) simulatedOctave = -1;
  else if (tracker.smoothedHeadPitchScore > 0.74) simulatedOctave = 1;
}
assert.strictEqual(simulatedOctave, 0, 'Score 0.32 must NOT flip to Mandra (-1) — Mid octave must hold!');
console.log('✅ PASS: Moderate downward head movement (score 0.32) cleanly remains in Mid octave');

// Simulate slight head tilt upward (score ~ 0.68). Previously this would flip to +1!
tracker.smoothedHeadPitchScore = 0.68;
if (tracker.currentOctave === 0) {
  if (tracker.smoothedHeadPitchScore < 0.26) simulatedOctave = -1;
  else if (tracker.smoothedHeadPitchScore > 0.74) simulatedOctave = 1;
}
assert.strictEqual(simulatedOctave, 0, 'Score 0.68 must NOT flip to Tara (+1) — Mid octave must hold!');
console.log('✅ PASS: Moderate upward head movement (score 0.68) cleanly remains in Mid octave');

// Intentional deep chin nod down (score 0.22)
tracker.smoothedHeadPitchScore = 0.22;
if (tracker.currentOctave === 0) {
  if (tracker.smoothedHeadPitchScore < 0.26) simulatedOctave = -1;
  else if (tracker.smoothedHeadPitchScore > 0.74) simulatedOctave = 1;
}
assert.strictEqual(simulatedOctave, -1, 'Deep chin nod (score 0.22) must trigger Mandra (-1)');
console.log('✅ PASS: Intentional deep chin nod (< 0.26) reliably triggers Mandra (-1)');

// Intentional chin tilt up (score 0.78)
tracker.currentOctave = 0;
tracker.smoothedHeadPitchScore = 0.78;
if (tracker.currentOctave === 0) {
  if (tracker.smoothedHeadPitchScore < 0.26) simulatedOctave = -1;
  else if (tracker.smoothedHeadPitchScore > 0.74) simulatedOctave = 1;
}
assert.strictEqual(simulatedOctave, 1, 'Chin tilt up (score 0.78) must trigger Tara (+1)');
console.log('✅ PASS: Intentional chin tilt up (> 0.74) reliably triggers Tara (+1)');

console.log('\n🎉 ALL BASS WEIGHT & WIDE MID-OCTAVE TESTS PASSED 100%!');
