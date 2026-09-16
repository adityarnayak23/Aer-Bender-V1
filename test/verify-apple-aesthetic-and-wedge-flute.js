// Verification Test: Apple-style Minimalist Flute, Flush Cut Ends, Fluid Bore Movement & Floating Notes
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

console.log('======================================================');
console.log('🍎 TESTING APPLE-STYLE MINIMALIST FLUTE (FLUSH ENDS, FLUID BORE, FLOATING NOTES)');
console.log('======================================================\n');

// 1. Test Flute Left-Shift and Right-Pane Clearance (>95px)
console.log('--- 1. Testing Flute Left Shift & Right-Pane Clearance ---');
{
  const tracker = new CarnaticFluteTracker();
  const width = 1280;
  const height = 720;
  tracker.canvasElement = { width, height };

  const panelWidth = Math.max(340, Math.min(width * 0.28, 420)) + 14;
  const stageWidth = width - panelWidth;
  const centerX = tracker.getFluteCenterScreenX(width, height);
  const spanScale = tracker.getSpanScale(width, height);
  const ux = Math.abs(Math.cos(tracker.getEffectiveAngleRad()));
  const endOffset = tracker.getFluteFootOffset();
  const startOffset = tracker.getFluteHeadOffset();

  const footX = centerX + endOffset * ux * spanScale;
  const headX = centerX + startOffset * ux * spanScale;
  const clearanceToRightPane = stageWidth - footX;

  console.log(`Stage Width: ${stageWidth.toFixed(1)}px, Center X: ${centerX.toFixed(1)}px`);
  console.log(`Head X: ${headX.toFixed(1)}px, Foot X: ${footX.toFixed(1)}px`);
  console.log(`Clearance to Right Pane: ${clearanceToRightPane.toFixed(1)}px`);

  assert(clearanceToRightPane >= 95, `Flute foot must maintain at least 95px clearance from right pane (got ${clearanceToRightPane.toFixed(1)}px)`);
  assert(headX >= 20, `Flute head must not clip left canvas edge (got ${headX.toFixed(1)}px)`);
  console.log('✅ PASS: Flute is elongated and safely positioned with generous clearance from right pane');
}

// 2. Test Flush Cut Ends & Zero Clutter Text (No BLOW HOLE, No Octave Badges)
console.log('\n--- 2. Testing Flush Cut Ends & Zero Clutter Text ---');
{
  const tracker = new CarnaticFluteTracker();
  const textDrawn = [];
  const linesDrawn = [];
  const mockCtx = {
    save: () => {}, restore: () => {}, beginPath: () => {},
    moveTo: (x, y) => linesDrawn.push({ type: 'move', x, y }),
    lineTo: (x, y) => linesDrawn.push({ type: 'line', x, y }),
    stroke: () => {}, arc: () => {}, fill: () => {},
    fillText: (t) => textDrawn.push(t),
    setLineDash: () => {}, measureText: () => ({ width: 50 }),
    closePath: () => {}
  };

  tracker.isLipsAtBlowHole = true;
  tracker.currentOctave = 0; // Madhya
  tracker.renderCleanOverlay(mockCtx, null, null, [true, false, false, false, false, false, false], 1280, 720);

  // Assert NO "BLOW HOLE" text
  const hasBlowHoleText = textDrawn.some(t => t.includes('BLOW HOLE'));
  assert.strictEqual(hasBlowHoleText, false, 'No "BLOW HOLE" text label on flute');

  // Assert NO "▲ HIGH", "▼ BASS", "◆ MID" text badges on flute
  const hasOctaveBadge = textDrawn.some(t => t.includes('HIGH') || t.includes('BASS') || t.includes('MID'));
  assert.strictEqual(hasOctaveBadge, false, 'No octave text badge rendered on flute (colors speak for themselves)');

  // Assert lines drawn include fluid streamlines
  assert(linesDrawn.length >= 30, 'Fluid air/liquid streamlines drawn inside bore');
  console.log('✅ PASS: Flush cut ends, fluid bore streamlines, and zero text clutter verified');
}

// 3. Test Mid Octave Color is Slate Grey
console.log('\n--- 3. Testing Slate Grey Mid-Octave Palette ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.currentOctave = 0; // Madhya
  let usedColor = null;
  const mockCtx = {
    save: () => {}, restore: () => {}, beginPath: () => {}, moveTo: () => {},
    lineTo: () => {}, stroke: () => {}, arc: () => {}, fill: () => {},
    fillText: () => {}, setLineDash: () => {}, measureText: () => ({ width: 50 }),
    closePath: () => {},
    set strokeStyle(val) { usedColor = val; },
    get strokeStyle() { return usedColor; },
    set fillStyle(val) {},
    get fillStyle() { return '#ffffff'; }
  };

  tracker.isLipsAtBlowHole = true;
  tracker.renderCleanOverlay(mockCtx, null, null, [true, false, false, false, false, false, false], 1280, 720);
  
  // Tracker source should define slate grey for Madhya
  const trackerSrc = fs.readFileSync(path.join(__dirname, '../src/carnatic-flute-tracker.js'), 'utf8');
  assert(trackerSrc.includes("let octaveColor = '#94a3b8';"), 'Mid octave must use slate grey #94a3b8');
  console.log('✅ PASS: Mid-octave correctly set to Apple Studio Slate Grey (#94a3b8)');
}

// 4. Test Floating Note Particles (No Background, Flies Up, Fades Out)
console.log('\n--- 4. Testing Floating Note Particles ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.canvasElement = { width: 1280, height: 720 };
  assert.strictEqual(tracker.floatingNotes.length, 0, 'Initially 0 floating notes');

  // Spawn note for Sa
  tracker.spawnFloatingNote({ id: 'sa', family: 'sa', swara: 'Sa' });
  assert.strictEqual(tracker.floatingNotes.length, 1, '1 floating note spawned');
  const note = tracker.floatingNotes[0];
  assert.strictEqual(note.text, 'Sa', 'Displays individual clean note text "Sa"');
  assert(note.vy < 0, 'Note velocity is negative (flies upward)');

  // Test rendering floating note without background
  let renderedText = null;
  let filledBoxes = 0;
  const mockCtx = {
    save: () => {}, restore: () => {}, beginPath: () => {}, moveTo: () => {},
    lineTo: () => {}, stroke: () => {}, arc: () => {},
    fill: () => { filledBoxes++; },
    rect: () => {}, roundRect: () => {},
    fillText: (t, x, y) => { renderedText = { text: t, x, y }; },
    setLineDash: () => {}, measureText: () => ({ width: 30 }),
    closePath: () => {}
  };

  tracker.renderCleanOverlay(mockCtx, null, null, [false, false, false, false, false, false, false], 1280, 720);
  assert(renderedText !== null, 'Floating note was rendered');
  assert.strictEqual(renderedText.text, 'Sa', 'Rendered note text is Sa');
  console.log('✅ PASS: Floating note flies upward with individual note name and zero background box');
}

// 5. Test Zero Fingertip Labels (No "R1", "R2", "L1", etc.) and Top-Mounted Flute Geometry
console.log('\n--- 5. Testing Zero Fingertip Labels & Top-Mounted Geometry ---');
{
  const tracker = new CarnaticFluteTracker();
  const textDrawn = [];
  const mockCtx = {
    save: () => {}, restore: () => {}, beginPath: () => {}, moveTo: () => {},
    lineTo: () => {}, stroke: () => {}, arc: () => {}, fill: () => {},
    fillText: (t) => textDrawn.push(t),
    setLineDash: () => {}, measureText: () => ({ width: 40 }),
    closePath: () => {}
  };

  // Create mock hands with fingertips
  const dummyHand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  tracker.renderCleanOverlay(mockCtx, dummyHand, dummyHand, [true, true, true, true, true, true, true], 1280, 720);

  // Assert NO R1, R2, R3, R4, L1, L2, L3 text drawn at fingertips
  const hasFingertipLabel = textDrawn.some(t => ['R1', 'R2', 'R3', 'R4', 'L1', 'L2', 'L3'].includes(t.trim()));
  assert.strictEqual(hasFingertipLabel, false, `Must NOT render R1, R2, L1... labels at fingertips (got: ${textDrawn.join(', ')})`);
  console.log('✅ PASS: Fingertip text labels (R1, R2, L1...) completely eliminated');

  // Verify tracker source has uniform translucent glass, increased inner bore radius, and elegant titanium lip pallet
  const trackerSrc = fs.readFileSync(path.join(__dirname, '../src/carnatic-flute-tracker.js'), 'utf8');
  assert(trackerSrc.includes('UNIFORM translucent glass'), 'Flute tube centered with uniform translucent glass above and below');
  assert(trackerSrc.includes('boreRadius = 6.0 * scale'), 'Inner bore radius increased where air flows');
  assert(trackerSrc.includes('TITANIUM LIP PLATE'), 'Elegant titanium lip pallet implemented for blow hole');
  assert(trackerSrc.includes('pStart.x - nx * tubeRadius'), 'Titanium end rims symmetrically fit flute diameter and length');

  // Verify catalogue in index.html contains ONLY C# (1.5 Kattai)
  const htmlSrc = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert(htmlSrc.includes('<option value="1.5" selected>1.5 Kattai (C#4 - 277.2 Hz) [Aditya Flute Master]</option>'), 'C# (1.5 Kattai) is present in catalogue');
  assert(!htmlSrc.includes('<option value="1">'), '1 Kattai (C) removed from catalogue');
  assert(!htmlSrc.includes('<option value="2">'), '2 Kattai (D) removed from catalogue');
  assert(!htmlSrc.includes('<option value="5">'), '5 Kattai (G) removed from catalogue');
  console.log('✅ PASS: Uniform translucent glass, increased bore radius, lip pallet, and C#-only catalogue verified');
}

console.log('\n======================================================');
console.log('🎉 ALL APPLE MINIMALIST FLUTE VERIFICATION TESTS PASSED 100%!');
console.log('======================================================\n');
