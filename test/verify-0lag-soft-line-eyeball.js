const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=============================================================');
console.log('⚡ VERIFYING 0-LAG RESPONSE & SOFT LINE EYEBALL ENGINE');
console.log('=============================================================');

const trackerPath = path.join(__dirname, '../src/carnatic-flute-tracker.js');
const trackerContent = fs.readFileSync(trackerPath, 'utf8');

// 1. Check 0-Lag frame scheduling (no frame % 4 throttle on FaceMesh)
assert(!trackerContent.includes('this.frameCount % 4 === 0 && !this.isProcessingFace'), 'Must NOT throttle FaceMesh every 4th frame');
assert(trackerContent.includes('if (!this.isProcessingFace)'), 'Must dispatch FaceMesh as soon as previous frame finishes');
console.log('✅ PASS: FaceMesh 4-frame throttling removed — continuous 0-lag frame dispatch active');

// 2. Check 0-lag adaptive motion snapping (alpha = 1.0 on movement)
assert(trackerContent.includes('dLeft > 1.2 ? 1.0 : 0.85'), 'Left eye must snap instantly (alpha = 1.0) on motion');
assert(trackerContent.includes('dRight > 1.2 ? 1.0 : 0.85'), 'Right eye must snap instantly (alpha = 1.0) on motion');
console.log('✅ PASS: Adaptive motion snap verified — 0 lag during eye movement or head shifts');

// 3. Check Soft Line styling (NOT fully colored)
// Must NOT have filled sclera or pupil washes
assert(!trackerContent.includes('scleraGrad'), 'Sclera must not have full background color fill');
assert(!trackerContent.includes('irisGrad'), 'Iris must not have full disk color fill');
assert(trackerContent.includes('lineRingGrad'), 'Must use feathered soft line ring gradient');
assert(trackerContent.includes('rInner'), 'Must calculate inner radius cutout');
assert(trackerContent.includes('rOuter'), 'Must calculate outer radius border');
console.log('✅ PASS: Full-color washes removed; replaced with soft glowing line ring and uncolored pupil');

// 4. Test runtime simulation for 0-lag motion and soft line rendering
function createMockCtx() {
  const calls = [];
  return {
    calls,
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    beginPath: () => calls.push('beginPath'),
    closePath: () => calls.push('closePath'),
    moveTo: (x, y) => calls.push({ type: 'moveTo', x, y }),
    lineTo: (x, y) => calls.push({ type: 'lineTo', x, y }),
    clip: () => calls.push('clip'),
    arc: (...args) => calls.push({ type: 'arc', args }),
    fill: () => calls.push('fill'),
    stroke: () => calls.push('stroke'),
    createRadialGradient: (...args) => {
      calls.push({ type: 'createRadialGradient', args });
      return {
        addColorStop: (stop, color) => calls.push({ type: 'colorStop', stop, color })
      };
    },
    set fillStyle(val) { calls.push({ type: 'fillStyle', val }); },
    set strokeStyle(val) { calls.push({ type: 'strokeStyle', val }); },
    set lineWidth(val) { calls.push({ type: 'lineWidth', val }); },
    set shadowColor(val) { calls.push({ type: 'shadowColor', val }); },
    set shadowBlur(val) { calls.push({ type: 'shadowBlur', val }); },
    set globalAlpha(val) { calls.push({ type: 'globalAlpha', val }); }
  };
}

const dummyWindow = { devicePixelRatio: 2 };
const swarasCode = fs.readFileSync(path.join(__dirname, '../src/swaras-data.js'), 'utf8');
eval(`(function(window) { ${swarasCode} })(dummyWindow)`);
global.window = dummyWindow;

eval(`(function(window) { ${trackerContent} })(dummyWindow)`);
const CarnaticFluteTracker = dummyWindow.CarnaticFluteTracker;

const tracker = new CarnaticFluteTracker();
const mockLandmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
mockLandmarks[33] = { x: 0.42, y: 0.35, z: 0 };
mockLandmarks[133] = { x: 0.48, y: 0.35, z: 0 };
mockLandmarks[159] = { x: 0.45, y: 0.33, z: 0 };
mockLandmarks[145] = { x: 0.45, y: 0.37, z: 0 };
mockLandmarks[468] = { x: 0.45, y: 0.35, z: 0 };
mockLandmarks[469] = { x: 0.46, y: 0.35, z: 0 };

mockLandmarks[362] = { x: 0.52, y: 0.35, z: 0 };
mockLandmarks[263] = { x: 0.58, y: 0.35, z: 0 };
mockLandmarks[386] = { x: 0.55, y: 0.33, z: 0 };
mockLandmarks[374] = { x: 0.55, y: 0.37, z: 0 };
mockLandmarks[473] = { x: 0.55, y: 0.35, z: 0 };
mockLandmarks[474] = { x: 0.56, y: 0.35, z: 0 };

tracker.lastFaceLandmarks = mockLandmarks;
const toScreen = (pt) => ({ x: (1.0 - pt.x) * 1280, y: pt.y * 720 });

// First frame initializes smoothed positions
const mockCtx1 = createMockCtx();
tracker.renderEyeballOctaveGlow(mockCtx1, 1280, 720, 2.0, toScreen, 1000);
const initialLeftX = tracker.smoothedEyes.left.x;

// Sudden glance / movement (jump 20 pixels)
mockLandmarks[468] = { x: 0.43, y: 0.35, z: 0 }; // moved left in normalized space
const targetX = (1.0 - 0.43) * 1280;

const mockCtx2 = createMockCtx();
tracker.renderEyeballOctaveGlow(mockCtx2, 1280, 720, 2.0, toScreen, 1016);

// Verify 0-lag snap: smoothed position immediately equals targetX!
assert.strictEqual(
  Math.round(tracker.smoothedEyes.left.x),
  Math.round(targetX),
  `Expected 0-lag immediate snap to ${targetX}, but got ${tracker.smoothedEyes.left.x}`
);
console.log('✅ PASS: Verified 0-lag immediate position snap during rapid eye glance');

// Verify strokes and radial gradient line ring
const strokes = mockCtx2.calls.filter(c => c === 'stroke');
assert(strokes.length >= 2, 'Must render clean core soft line stroke for both eyes');

const radGrads = mockCtx2.calls.filter(c => c.type === 'createRadialGradient');
assert(radGrads.length >= 2, 'Must create feathered line ring radial gradient for both eyes');
console.log('✅ PASS: Soft line stroke & feathered limbal ring verified at runtime');

console.log('\n🎉 ALL 0-LAG & SOFT LINE EYEBALL TESTS PASSED 100%!');
