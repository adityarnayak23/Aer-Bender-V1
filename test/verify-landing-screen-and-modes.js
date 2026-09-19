// Verification test for landing screen flute preview and 3-way sound modes
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=============================================================');
console.log('🧪 VERIFYING LANDING SCREEN FLUTE & 3-WAY SOUND MODES');
console.log('=============================================================');

// 1. Verify index.html contains timbreModeSelect with all 3 options
console.log('\n--- 1. Testing HTML Markup in index.html ---');
const htmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert(htmlContent.includes('id="timbreModeSelect"'), 'Must have timbreModeSelect dropdown');
assert(htmlContent.includes('value="electric"'), 'Must have electric flute option');
assert(htmlContent.includes('value="carnatic"'), 'Must have carnatic option');
assert(htmlContent.includes('value="sax"'), 'Must have sax option');
assert(htmlContent.includes('id="trackingCanvas"'), 'Must have trackingCanvas');
console.log('✅ PASS: HTML markup for timbreModeSelect and trackingCanvas verified');

// 2. Verify FluteAudioEngine methods are completely safe before user gesture / ctx initialization
console.log('\n--- 2. Testing FluteAudioEngine Safety Before Init ---');
global.window = global;
global.window.addEventListener = () => {};
global.document = {
  addEventListener: () => {}
};
require('../src/swaras-data.js');
require('../src/flute-audio.js');

const audio = new window.FluteAudioEngine();
assert.strictEqual(audio.ctx, null, 'Context must be null initially before gesture');

// All of these must NOT throw even when ctx is null!
assert.doesNotThrow(() => audio.stopVoice(), 'stopVoice must not throw when ctx is null');
assert.doesNotThrow(() => audio.fadePreviousVoice(), 'fadePreviousVoice must not throw when ctx is null');
assert.doesNotThrow(() => audio.setBreathPressure(0.85), 'setBreathPressure must not throw when ctx is null');
assert.doesNotThrow(() => audio.setMode('electric'), 'setMode(electric) must not throw when ctx is null');
assert.strictEqual(audio.isElectricMode, true);
assert.strictEqual(audio.isSaxMode, false);

assert.doesNotThrow(() => audio.setMode('sax'), 'setMode(sax) must not throw when ctx is null');
assert.strictEqual(audio.isSaxMode, true);
assert.strictEqual(audio.isElectricMode, false);

assert.doesNotThrow(() => audio.setMode('carnatic'), 'setMode(carnatic) must not throw when ctx is null');
assert.strictEqual(audio.isElectricMode, false);
assert.strictEqual(audio.isSaxMode, false);

assert.doesNotThrow(() => audio.setMode('electric'), 're-setting electric must not throw');
console.log('✅ PASS: FluteAudioEngine safely handles all mode switches and stop calls before AudioContext init');

// 3. Verify Tracker canvas preview on landing screen
console.log('\n--- 3. Testing Tracker Canvas Preview on Landing Screen ---');
require('../src/carnatic-flute-tracker.js');

let overlayRenderCount = 0;
const mockCanvas = {
  width: 0,
  height: 0,
  clientWidth: 1280,
  clientHeight: 720,
  getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }),
  getContext: () => ({
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    setTransform: () => {},
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} })
  }),
  addEventListener: () => {}
};

const tracker = new window.CarnaticFluteTracker({
  canvasElement: mockCanvas
});

// Spy on renderCleanOverlay
const originalRenderOverlay = tracker.renderCleanOverlay;
tracker.renderCleanOverlay = function(...args) {
  overlayRenderCount++;
  return originalRenderOverlay.apply(this, args);
};

assert.doesNotThrow(() => tracker.initCanvasPreview(), 'initCanvasPreview must not throw');
assert(mockCanvas.width > 0, 'Canvas width must be set');
assert(mockCanvas.height > 0, 'Canvas height must be set');
assert(overlayRenderCount > 0, 'renderCleanOverlay must be called to render flute on landing canvas');
tracker.stopIdleLevitationLoop();

console.log('✅ PASS: Flute preview correctly renders on landing canvas and starts levitation loop');

console.log('\n=============================================================');
console.log('🎉 ALL LANDING SCREEN & SOUND MODE TESTS PASSED 100%!');
console.log('=============================================================');
