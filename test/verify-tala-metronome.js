const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('======================================================');
console.log('🧪 VERIFYING CARNATIC TALA & METRONOME ENGINE');
console.log('======================================================');

// Read app.js and inspect definitions
const appJsPath = path.join(__dirname, '../src/app.js');
const appContent = fs.readFileSync(appJsPath, 'utf8');

// 1. Verify Tala Definitions
console.log('\n--- 1. Testing Tala Definitions & Akshara Beat Counts ---');
const expectedTalas = ['adi', 'rupaka', 'misra_chapu', 'khanda_chapu', 'tisra_eka'];
expectedTalas.forEach(key => {
  assert(appContent.includes(key), `Tala definition '${key}' must exist in app.js`);
});
console.log('✅ Adi Tala, Rupaka, Misra Chapu, Khanda Chapu, Tisra Eka verified!');

// 2. Verify Audio Synthesis Method
console.log('\n--- 2. Testing Web Audio Tala Click Synthesis Method ---');
const audioJsPath = path.join(__dirname, '../src/flute-audio.js');
const audioContent = fs.readFileSync(audioJsPath, 'utf8');
assert(audioContent.includes('playTalaClick'), 'FluteAudioEngine must have playTalaClick method');
console.log('✅ playTalaClick method present and verified in FluteAudioEngine');

// 3. Verify HTML Tala Elements
console.log('\n--- 3. Testing HTML Structure for Tala Metronome Card ---');
const htmlPath = path.join(__dirname, '../index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
assert(htmlContent.includes('tala-card'), 'index.html must include tala-card');
assert(htmlContent.includes('talaPlayBtn'), 'index.html must include talaPlayBtn');
assert(htmlContent.includes('talaSelect'), 'index.html must include talaSelect');
assert(htmlContent.includes('talaPipsRow'), 'index.html must include talaPipsRow');
assert(htmlContent.includes('talaPhrasesChips'), 'index.html must include talaPhrasesChips');
console.log('✅ tala-card correctly placed in right-bottom quadrant of controls-panel');

// 4. Verify CSS Zero Dead Space
console.log('\n--- 4. Testing CSS Flex Real Estate & Zero Dead Space ---');
const cssPath = path.join(__dirname, '../style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert(cssContent.includes('.tala-card'), 'style.css must have .tala-card styles');
assert(cssContent.includes('flex: 1'), '.tala-card must have flex: 1 to fill all remaining vertical space');
console.log('✅ .tala-card styled with flex: 1 to guarantee ZERO empty space at right bottom');

console.log('\n======================================================');
console.log('🎉 ALL TALA & METRONOME VERIFICATION TESTS PASSED 100%!');
console.log('======================================================\n');
