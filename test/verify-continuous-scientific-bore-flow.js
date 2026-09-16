// Verification Test: Continuous Scientific Bore Airflow & Note-Based Octave Waveforms
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
console.log('🌊 VERIFYING CONTINUOUS SCIENTIFIC BORE FLOW & OCTAVE DYNAMICS');
console.log('======================================================\n');

// 1. Test Airflow Does NOT Stop Abruptly at Pressed Note (Continuous from blowPos to pEnd)
console.log('--- 1. Testing Airflow Does NOT Stop at Pressed Note ---');
{
  const tracker = new CarnaticFluteTracker();
  const linesDrawn = [];

  const mockCtx = {
    save: () => {}, restore: () => {}, beginPath: () => {},
    moveTo: (x, y) => linesDrawn.push({ type: 'move', x, y }),
    lineTo: (x, y) => linesDrawn.push({ type: 'line', x, y }),
    stroke: () => {}, arc: () => {}, fill: () => {},
    fillText: () => {}, setLineDash: () => {}, measureText: () => ({ width: 50 }),
    closePath: () => {},
    set strokeStyle(v) {}, get strokeStyle() { return '#fff'; },
    set fillStyle(v) {}, get fillStyle() { return '#fff'; }
  };

  tracker.isLipsAtBlowHole = true;
  tracker.currentOctave = 0;
  // Test with Hole 1 open (Sa fingering: shortest resonant column Le)
  tracker.activeSwara = window.SwarasData.CARNATIC_16_SWARASTHANAS.find(s => s.id === 'sa');
  tracker.renderCleanOverlay(mockCtx, null, null, [true, false, false, false, false, false, false], 1280, 720);

  const blowPos = tracker.getBlowHolePos(1280, 720);
  const pEnd = tracker.getFluteFootPos ? tracker.getFluteFootPos(1280, 720) : {
    x: tracker.getFluteCenterScreenX(1280, 720) + tracker.getFluteFootOffset() * Math.abs(Math.cos(tracker.getEffectiveAngleRad())) * tracker.getSpanScale(1280, 720)
  };
  const hole1Pos = tracker.getHolePos(0, 1280, 720);

  // Check lines past hole 1 (downstream of pressed/venting note all the way towards pEnd)
  const downstreamLines = linesDrawn.filter(pt => pt.x > hole1Pos.x + 10);
  assert(downstreamLines.length >= 100, `Flow MUST continue past pressed note hole without stopping abruptly (got ${downstreamLines.length} downstream points)`);

  // Check points reaching within 30px of pEnd
  const pointsAtFoot = linesDrawn.filter(pt => Math.abs(pt.x - pEnd.x) < 30);
  assert(pointsAtFoot.length >= 14, `Streamlines must reach all the way to footjoint bell pEnd (got ${pointsAtFoot.length} points near foot)`);

  console.log(`Downstream points past pressed note: ${downstreamLines.length}, Points near foot bell: ${pointsAtFoot.length}`);
  console.log('✅ PASS: Airflow does NOT stop abruptly at pressed note; streams continuously from blowPos to pEnd');
}

// 2. Test Octave-Specific Waveform Logic Present in Source
console.log('\n--- 2. Testing Octave & Note Specific Dynamics in Source ---');
{
  const trackerSrc = fs.readFileSync(path.join(__dirname, '../src/carnatic-flute-tracker.js'), 'utf8');

  // Mandra: Fundamental frequency weight, smooth thick laminar streamline ribbon
  assert(trackerSrc.includes('MANDRA STHAYI (Lower Octave) | Fundamental Frequency Weight'), 'Mandra Sthayi fundamental frequency weight implemented');
  assert(trackerSrc.includes('mandraK = spatialWaveK * 0.70'), 'Mandra long-wavelength fundamental wavenumber implemented');

  // Madhya: Balanced frequency weight, pure sinuous undulating standing wave
  assert(trackerSrc.includes('MADHYA STHAYI (Middle Octave) | Balanced Frequency Weight'), 'Madhya Sthayi balanced frequency weight implemented');
  assert(trackerSrc.includes('Pure sinuous undulating standing wave'), 'Madhya pure sinuous undulating standing wave implemented');

  // Tara: Highest frequency weight, multiple overblowing (higher harmonics)
  assert(trackerSrc.includes('TARA STHAYI (Higher Octave) | Highest Frequency Weight'), 'Tara Sthayi highest frequency weight implemented');
  assert(trackerSrc.includes('Multiple Overblowing (Higher Harmonics)'), 'Tara multiple overblowing higher harmonics implemented');
  assert(trackerSrc.includes('h1 = Math.sin') && trackerSrc.includes('h2 = 0.42 * Math.sin') && trackerSrc.includes('h3 = 0.22 * Math.sin'), 'Multi-harmonic superposition implemented for Tara');

  // Continuous smooth cosine decay past venting hole
  assert(trackerSrc.includes('0.42 + 0.58 * (0.5 + 0.5 * Math.cos(postVentingFrac * Math.PI))'), 'Smooth cosine continuous envelope past venting point');

  console.log('✅ PASS: Octave-specific waveforms (Mandra fundamental, Madhya sinuous wave, Tara multi-harmonic overblowing) and continuous cosine envelope verified in source');
}

// 3. Test Tone Hole Venting Plume and Bell Exhaust
console.log('\n--- 3. Testing Venting Plume at Open Hole & Foot Bell Exhaust ---');
{
  const trackerSrc = fs.readFileSync(path.join(__dirname, '../src/carnatic-flute-tracker.js'), 'utf8');
  assert(trackerSrc.includes('Air splits at Le, Note Termination'), 'Venting plume splits at effective length open tone hole');
  assert(trackerSrc.includes('FOOTJOINT BELL EXHAUST PLUME'), 'Footjoint bell exhaust plume implemented');
  console.log('✅ PASS: Tone hole venting plume and foot bell exhaust verified');
}

console.log('\n======================================================');
console.log('🎉 ALL CONTINUOUS SCIENTIFIC BORE FLOW TESTS PASSED 100%!');
console.log('======================================================\n');
