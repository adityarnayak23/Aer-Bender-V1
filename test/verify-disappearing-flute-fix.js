// Verification Test: Disappearing Flute Glitch Fix
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const dummyWindow = {};
const swarasCode = fs.readFileSync(path.join(__dirname, '../src/swaras-data.js'), 'utf8');
eval(`(function(window) { ${swarasCode} })(dummyWindow)`);
global.window = dummyWindow;

const trackerCode = fs.readFileSync(path.join(__dirname, '../src/carnatic-flute-tracker.js'), 'utf8');
eval(`(function(window) { ${trackerCode} })(dummyWindow)`);
const CarnaticFluteTracker = dummyWindow.CarnaticFluteTracker;

console.log('\n--- 1. Testing 90° Profile View Playing (Hands Overlap in Camera X) ---');
let renderedCount = 0;
const tracker = new CarnaticFluteTracker();
tracker.canvasElement = { width: 640, height: 480 };
tracker.canvasCtx = {
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  arc: () => {},
  fill: () => {},
  fillText: () => {},
  setLineDash: () => {},
  measureText: () => ({ width: 60 }),
  clearRect: () => {},
  rect: () => {}
};

// Hook renderCleanOverlay to verify it is always called
const origRender = tracker.renderCleanOverlay.bind(tracker);
tracker.renderCleanOverlay = function(...args) {
  renderedCount++;
  return origRender(...args);
};

function createMockHand(screenX, screenY, isLeft = true) {
  const lm = [];
  for (let i = 0; i < 21; i++) {
    lm.push({ x: 1.0 - screenX, y: screenY, z: 0.0 });
  }
  const dir = isLeft ? 1 : -1;
  lm[0]  = { x: 1.0 - (screenX - 0.06 * dir), y: screenY + 0.05, z: 0.0 };
  lm[5]  = { x: 1.0 - (screenX + 0.04 * dir), y: screenY, z: 0.0 };
  lm[9]  = { x: 1.0 - screenX, y: screenY, z: 0.0 };
  lm[13] = { x: 1.0 - (screenX - 0.04 * dir), y: screenY, z: 0.0 };
  lm[17] = { x: 1.0 - (screenX - 0.08 * dir), y: screenY, z: 0.0 };
  // Finger curl setup: curled (closed)
  lm[8]  = { x: 1.0 - (screenX + 0.04 * dir), y: screenY - 0.02, z: 0.0 };
  lm[12] = { x: 1.0 - screenX, y: screenY - 0.02, z: 0.0 };
  lm[16] = { x: 1.0 - (screenX - 0.04 * dir), y: screenY - 0.02, z: 0.0 };
  lm[20] = { x: 1.0 - (screenX - 0.08 * dir), y: screenY - 0.02, z: 0.0 };
  return lm;
}

// In 90° profile view, Left hand and Right hand are aligned along line of sight (screenX difference is only 0.02)
const profileLeft = createMockHand(0.50, 0.55, true);
const profileRight = createMockHand(0.52, 0.56, false); // Span only 0.02!

tracker.onResults({
  multiHandLandmarks: [profileLeft, profileRight],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});

assert.strictEqual(tracker.inPlayingPosition, true, '90° profile view with small X span MUST be in playing position at playing height!');
console.log('✅ PASS: Profile view hands (span 0.02 at flute height Y=0.55) enter playing position without disappearing.');

console.log('\n--- 2. Testing Posture Dropout Smoothing (1-2 Frame MediaPipe Flutter) ---');
// Frame 1: Active playing note
let detectedSwara = null;
tracker.onSwaraDetected = (res) => {
  detectedSwara = res ? res.swara : null;
};
tracker.sessionUnlocked = true; // Actively playing
tracker.awaitingInitialSa = false;
tracker.activeSwara = { id: 'pa', swara: 'P' };

tracker.onResults({
  multiHandLandmarks: [profileLeft, profileRight],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});
assert.strictEqual(tracker.inPlayingPosition, true);

// Frame 2: MediaPipe drops hand detection for 1 frame (e.g. motion blur)
tracker.onResults({
  multiHandLandmarks: [],
  multiHandedness: []
});
assert.strictEqual(tracker.inPlayingPosition, true, '1-frame MediaPipe tracking drop MUST be absorbed by dropout smoothing!');
console.log('✅ PASS: 1-frame tracking loss is absorbed, preventing note and flute from disappearing.');

// Frame 3: Hands back
tracker.onResults({
  multiHandLandmarks: [profileLeft, profileRight],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});
assert.strictEqual(tracker.inPlayingPosition, true);
console.log('✅ PASS: Continuous playing unbroken across tracking drops.');

console.log('\n--- 3. Testing Non-Blocking Playing (No Forced Sa Lockout on Musical Pause) ---');
// User pauses for 30 frames (~0.5s) between musical phrases
for (let i = 0; i < 30; i++) {
  tracker.onResults({
    multiHandLandmarks: [],
    multiHandedness: []
  });
}
assert.strictEqual(tracker.awaitingInitialSa, false, 'Musical pause (30 frames) must NEVER lock the user out with mandatory Sa!');
console.log('✅ PASS: Musical pause does NOT lock out the player; player can resume on any note immediately.');

console.log('\n--- 4. Testing Canvas Overlay Guarantee (Try-Finally Protection) ---');
const prevRenderCount = renderedCount;
tracker.onResults({
  multiHandLandmarks: [profileLeft, profileRight],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});
assert.strictEqual(renderedCount, prevRenderCount + 1, 'renderCleanOverlay MUST be called on every frame.');
console.log('✅ PASS: Flute overlay (lines and tone holes) is rendered on every frame without disappearing.');

console.log('\n🌟 ALL DISAPPEARING FLUTE GLITCH FIX TESTS PASSED 100%!\n');
