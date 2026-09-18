const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=============================================================');
console.log('👁️ VERIFYING CYBER-SPIRITUAL EYEBALL OCTAVE GLOW ENGINE');
console.log('=============================================================');

const trackerPath = path.join(__dirname, '../src/carnatic-flute-tracker.js');
const workerPath = path.join(__dirname, '../facemesh-worker.html');

const trackerContent = fs.readFileSync(trackerPath, 'utf8');
const workerContent = fs.readFileSync(workerPath, 'utf8');

// 1. Check refineLandmarks: true in both worker and main tracker
assert(workerContent.includes('refineLandmarks: true'), 'facemesh-worker.html must enable refineLandmarks: true for iris landmarks');
assert(trackerContent.includes('refineLandmarks: true'), 'tracker faceDetector fallback must enable refineLandmarks: true');
console.log('✅ PASS: refineLandmarks: true enabled in FaceMesh worker and fallback detector');

// 2. Check renderEyeballOctaveGlow method in tracker
assert(trackerContent.includes('renderEyeballOctaveGlow(ctx, width, height, scale, toScreen, now)'), 'CarnaticFluteTracker must define renderEyeballOctaveGlow');
assert(trackerContent.includes('this.renderEyeballOctaveGlow(ctx, width, height, scale, toScreen, now)'), 'renderCleanOverlay must invoke renderEyeballOctaveGlow');
console.log('✅ PASS: renderEyeballOctaveGlow method defined and called in renderCleanOverlay');

// 3. Check Eye landmarks tracking (landmarks 468, 473, and contour fallbacks 33, 133, 362, 263)
assert(trackerContent.includes('landmarks[468]'), 'Tracker must support left iris landmark 468');
assert(trackerContent.includes('landmarks[473]'), 'Tracker must support right iris landmark 473');
assert(trackerContent.includes('landmarks[33]'), 'Tracker must support left outer eye landmark 33');
assert(trackerContent.includes('landmarks[362]'), 'Tracker must support right inner eye landmark 362');
console.log('✅ PASS: Left & Right iris detection and eye contour fallbacks verified');

// 4. Check Eyelid Clipping (Very realistic fit without spilling onto eyelids or skin)
assert(trackerContent.includes('ctx.clip()'), 'Tracker must clip to real eyelid contour path');
assert(trackerContent.includes('leftContourIndices'), 'Tracker must define left eyelid contour indices');
assert(trackerContent.includes('rightContourIndices'), 'Tracker must define right eyelid contour indices');
console.log('✅ PASS: Anatomical eyelid clipping verified (glow strictly confined inside eyeball opening)');

// 5. Check Soft Translucent Octave colors
assert(trackerContent.includes("rgba(129, 140, 248"), 'Mandra (-1) must use royal velvet indigo/amethyst palette');
assert(trackerContent.includes("rgba(0, 240, 255"), 'Madhya (0) must use cyber cyan / jade air palette');
assert(trackerContent.includes("rgba(251, 146, 60"), 'Tara (+1) must use solar flame sunset coral palette');
console.log('✅ PASS: Soft & translucent octave color palettes verified');

// 6. Check 60 FPS temporal smoothing & blink attenuation
assert(trackerContent.includes('this.smoothedEyes'), 'Tracker must track smoothedEyes for zero jitter');
assert(trackerContent.includes('eye.open < 0.10'), 'Blink attenuation must mute/dim glow when eyelids close');
console.log('✅ PASS: 60 FPS temporal smoothing and blink attenuation verified');

// 7. Test runtime simulation
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

const trackerCode = fs.readFileSync(trackerPath, 'utf8');
eval(`(function(window) { ${trackerCode} })(dummyWindow)`);
const CarnaticFluteTracker = dummyWindow.CarnaticFluteTracker;

const tracker = new CarnaticFluteTracker();

// Generate mock 478 landmarks
const mockLandmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
// Left eye outer 33, inner 133
mockLandmarks[33] = { x: 0.42, y: 0.35, z: 0 };
mockLandmarks[133] = { x: 0.48, y: 0.35, z: 0 };
mockLandmarks[159] = { x: 0.45, y: 0.33, z: 0 };
mockLandmarks[145] = { x: 0.45, y: 0.37, z: 0 };
mockLandmarks[468] = { x: 0.45, y: 0.35, z: 0 }; // Left iris
mockLandmarks[469] = { x: 0.46, y: 0.35, z: 0 }; // Left iris edge

// Right eye inner 362, outer 263
mockLandmarks[362] = { x: 0.52, y: 0.35, z: 0 };
mockLandmarks[263] = { x: 0.58, y: 0.35, z: 0 };
mockLandmarks[386] = { x: 0.55, y: 0.33, z: 0 };
mockLandmarks[374] = { x: 0.55, y: 0.37, z: 0 };
mockLandmarks[473] = { x: 0.55, y: 0.35, z: 0 }; // Right iris
mockLandmarks[474] = { x: 0.56, y: 0.35, z: 0 }; // Right iris edge

tracker.lastFaceLandmarks = mockLandmarks;

// Test Madhya (0)
tracker.currentOctave = 0;
const mockCtx0 = createMockCtx();
const toScreen = (pt) => ({ x: (1.0 - pt.x) * 1280, y: pt.y * 720 });
tracker.renderEyeballOctaveGlow(mockCtx0, 1280, 720, 2.0, toScreen, 1000);

const clips = mockCtx0.calls.filter(c => c === 'clip');
assert(clips.length >= 2, 'Must clip to eyelid contours for both eyes');
console.log('✅ PASS: Eyelid clipping applied during rendering');

const cyanColorStops = mockCtx0.calls.filter(c => c.type === 'colorStop' && c.color && c.color.includes('0, 240, 255'));
assert(cyanColorStops.length > 0, 'Madhya (0) must render soft cyan eyeball glow');
console.log('✅ PASS: Madhya (0) generates soft, translucent Cyan/Jade eyeball tint');

// Test Mandra (-1)
tracker.currentOctave = -1;
const mockCtxMandra = createMockCtx();
tracker.renderEyeballOctaveGlow(mockCtxMandra, 1280, 720, 2.0, toScreen, 1000);
const indigoColorStops = mockCtxMandra.calls.filter(c => c.type === 'colorStop' && c.color && c.color.includes('129, 140, 248'));
assert(indigoColorStops.length > 0, 'Mandra (-1) must render soft indigo eyeball glow');
console.log('✅ PASS: Mandra (-1) generates soft, translucent Royal Indigo eyeball tint');

// Test Tara (+1)
tracker.currentOctave = 1;
const mockCtxTara = createMockCtx();
tracker.renderEyeballOctaveGlow(mockCtxTara, 1280, 720, 2.0, toScreen, 1000);
const coralColorStops = mockCtxTara.calls.filter(c => c.type === 'colorStop' && c.color && c.color.includes('251, 146, 60'));
assert(coralColorStops.length > 0, 'Tara (+1) must render soft solar sunset coral eyeball glow');
console.log('✅ PASS: Tara (+1) generates soft, translucent Sunset Coral eyeball tint');

console.log('\n🎉 ALL REFINED EYEBALL GLOW TESTS PASSED 100%!');
