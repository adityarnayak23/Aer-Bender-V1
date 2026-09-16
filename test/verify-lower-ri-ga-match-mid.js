// Verification Test: Lower Octave Ri & Ga Match Mid Octave (Technical Purpose)
const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('\n--- Testing Lower Octave Ri & Ga Match Mid Octave ---');

const samplesDir = path.join(__dirname, '../audio/samples');
const riBuf = fs.readFileSync(path.join(samplesDir, 'ri.wav'));
const bassRiBuf = fs.readFileSync(path.join(samplesDir, 'bass_ri.wav'));
assert(riBuf.equals(bassRiBuf), 'bass_ri.wav must match ri.wav 100% in samples and bytes');
console.log('✅ PASS: bass_ri.wav is a bit-for-bit identical match to mid octave ri.wav');

const gaBuf = fs.readFileSync(path.join(samplesDir, 'ga.wav'));
const bassGaBuf = fs.readFileSync(path.join(samplesDir, 'bass_ga.wav'));
assert(gaBuf.equals(bassGaBuf), 'bass_ga.wav must match ga.wav 100% in samples and bytes');
console.log('✅ PASS: bass_ga.wav is a bit-for-bit identical match to mid octave ga.wav');

const saBuf = fs.readFileSync(path.join(samplesDir, 'sa.wav'));
const bassSaBuf = fs.readFileSync(path.join(samplesDir, 'bass_sa.wav'));
assert(saBuf.equals(bassSaBuf), 'bass_sa.wav must match sa.wav 100% in samples and bytes');
console.log('✅ PASS: bass_sa.wav remains a bit-for-bit identical match to mid octave sa.wav');

const manifest = JSON.parse(fs.readFileSync(path.join(samplesDir, 'manifest.json'), 'utf8'));

// Verify Ri match
assert.strictEqual(manifest.bass_ri.targetFreq, manifest.ri.targetFreq, 'bass_ri frequency must match ri frequency');
assert.strictEqual(manifest.bass_ri.loopStart, manifest.ri.loopStart, 'bass_ri loopStart must match ri loopStart');
assert.strictEqual(manifest.bass_ri.loopEnd, manifest.ri.loopEnd, 'bass_ri loopEnd must match ri loopEnd');
assert.strictEqual(manifest.bass_ri.duration, manifest.ri.duration, 'bass_ri duration must match ri duration');
console.log('✅ PASS: Manifest metadata for bass_ri matches mid octave ri exactly.');

// Verify Ga match
assert.strictEqual(manifest.bass_ga.targetFreq, manifest.ga.targetFreq, 'bass_ga frequency must match ga frequency');
assert.strictEqual(manifest.bass_ga.loopStart, manifest.ga.loopStart, 'bass_ga loopStart must match ga loopStart');
assert.strictEqual(manifest.bass_ga.loopEnd, manifest.ga.loopEnd, 'bass_ga loopEnd must match ga loopEnd');
assert.strictEqual(manifest.bass_ga.duration, manifest.ga.duration, 'bass_ga duration must match ga duration');
console.log('✅ PASS: Manifest metadata for bass_ga matches mid octave ga exactly.');

console.log('\n🎉 ALL LOWER RI & GA MID-OCTAVE MATCH TESTS PASSED 100%!\n');
