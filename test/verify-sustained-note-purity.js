// Verification Test: Sustained Note Purity (Zero Buzz, Zero Unwanted Pitch Oscillation)
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

const audioCode = fs.readFileSync(path.join(__dirname, '../src/flute-audio.js'), 'utf8');

class MockAudioParam {
  constructor(initial = 0) {
    this.value = initial;
    this.events = [];
  }
  setValueAtTime(val, time) {
    this.value = val;
    this.events.push({ type: 'setValueAtTime', val, time });
  }
  linearRampToValueAtTime(val, time) {
    this.events.push({ type: 'linearRampToValueAtTime', val, time });
  }
  exponentialRampToValueAtTime(val, time) {
    this.events.push({ type: 'exponentialRampToValueAtTime', val, time });
  }
  setTargetAtTime(val, time, constant) {
    this.events.push({ type: 'setTargetAtTime', val, time, constant });
  }
  cancelScheduledValues(time) {
    this.events.push({ type: 'cancelScheduledValues', time });
  }
}

class MockAudioNode {
  constructor() {
    this.gain = new MockAudioParam(1.0);
    this.detune = new MockAudioParam(0);
    this.playbackRate = new MockAudioParam(1.0);
    this.frequency = new MockAudioParam(440);
    this.threshold = new MockAudioParam(-10);
    this.knee = new MockAudioParam(20);
    this.ratio = new MockAudioParam(6);
    this.attack = new MockAudioParam(0.003);
    this.release = new MockAudioParam(0.12);
    this.Q = new MockAudioParam(1.0);
    this.buffer = null;
    this.loop = false;
  }
  setPeriodicWave() {}
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class MockAudioContext {
  constructor() {
    this.currentTime = 10.0;
    this.state = 'running';
    this.destination = new MockAudioNode();
  }
  createMediaElementSource() { return new MockAudioNode(); }
  createDynamicsCompressor() { return new MockAudioNode(); }
  createGain() { return new MockAudioNode(); }
  createAnalyser() { return new MockAudioNode(); }
  createConvolver() { return new MockAudioNode(); }
  createMediaStreamDestination() { return new MockAudioNode(); }
  createBufferSource() { return new MockAudioNode(); }
  createBiquadFilter() { return new MockAudioNode(); }
  createOscillator() { return new MockAudioNode(); }
  createWaveShaper() { return { curve: null, oversample: 'none', connect: () => {} }; }
  createBuffer(channels, length, rate) {
    return { numberOfChannels: channels, length, sampleRate: rate, getChannelData: () => new Float32Array(length) };
  }
  createPeriodicWave() { return {}; }
  resume() { return Promise.resolve(); }
}

global.fetch = () => Promise.resolve({ ok: false });
global.AudioContext = MockAudioContext;
dummyWindow.AudioContext = MockAudioContext;

class MockAudio {
  constructor() {
    this.src = '';
    this.loop = false;
    this.volume = 1.0;
  }
  play() { return Promise.resolve(); }
  pause() {}
  canPlayType() { return 'probably'; }
  addEventListener() {}
  removeEventListener() {}
}

global.Audio = MockAudio;
dummyWindow.Audio = MockAudio;

eval(`(function(window) { ${audioCode} })(dummyWindow)`);
const FluteAudioEngine = dummyWindow.FluteAudioEngine;

console.log('\n======================================================');
console.log('🧪 TESTING SUSTAINED NOTE PURITY & ZERO BUZZ/OSCILLATION');
console.log('======================================================');

// 1. Test Electric Flute Sustained Note Does NOT Re-trigger Voice
console.log('\n--- 1. Testing Electric Flute Sustained Note Stability ---');
{
  const audio = new FluteAudioEngine();
  audio.init();
  audio.setElectricMode(true);

  const swaraSa = window.SwarasData.CARNATIC_16_SWARASTHANAS.find(s => s.id === 'sa');

  // Trigger Sa initially
  audio.playSwara(swaraSa);
  assert(audio.activeElectricVoice, 'Active electric voice must exist');
  const initialVoice = audio.activeElectricVoice;

  // Simulate 30 consecutive video frames holding Sa
  for (let f = 0; f < 30; f++) {
    audio.ctx.currentTime += 0.016; // 60 FPS
    audio.playSwara(swaraSa);
  }

  assert.strictEqual(audio.activeElectricVoice, initialVoice, 'Must NOT recreate electric voice on sustained note');
  console.log('✅ PASS: Electric voice is sustained cleanly without rapid voice recreation buzz.');
}

// 2. Test Gamaka Pitch Stability during Natural Posture
console.log('\n--- 2. Testing Gamaka Posture Deadband & Pitch Stability ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.inPlayingPosition = true;
  tracker.lineAngleDeg = 12;

  let reportedCents = null;
  tracker.onGamakaBend = (cents) => { reportedCents = cents; };

  // Hands held at natural ~12 degree posture with micro-jitter (12.5°, 11.7°, 13.1°)
  const jitterAngles = [12.0, 12.8, 11.4, 13.0, 12.2, 11.8];
  for (const angle of jitterAngles) {
    const rad = angle * (Math.PI / 180);
    const dx = 0.25;
    const dy = dx * Math.tan(rad);
    const mockLeft = [{ x: 0.6, y: 0.5 }, null, null, null, null, null, null, null, null, { x: 0.6, y: 0.5 }];
    const mockRight = [{ x: 0.35, y: 0.5 + dy }, null, null, null, null, null, null, null, null, { x: 0.35, y: 0.5 + dy }];

    tracker.calculateFluteTilt(mockLeft, mockRight);
    assert.strictEqual(reportedCents, 0, `Natural posture at ${angle}° must yield 0 cents detune`);
  }
  console.log('✅ PASS: Camera landmark micro-tremor yields exactly 0.0 cents detune (zero pitch flutter).');
}

// 3. Test Audio Engine Gamaka Micro-Jitter Filtering
console.log('\n--- 3. Testing Audio Engine Detune Jitter Filtering ---');
{
  const audio = new FluteAudioEngine();
  audio.init();
  const swaraSa = window.SwarasData.CARNATIC_16_SWARASTHANAS.find(s => s.id === 'sa');
  audio.playSwara(swaraSa);

  const initialGamaka = audio.gamakaCents;
  // Send 0.2 cents micro-jitter
  audio.setGamaka(0.2);
  assert.strictEqual(audio.gamakaCents, initialGamaka, 'Must ignore micro-jitter under 0.6 cents');
  console.log('✅ PASS: Audio engine successfully rejects micro-jitter under 0.6 cents.');
}

// 4. Test Physical Model Zero Flutter
console.log('\n--- 4. Testing Physical Modeling Sustained Voice (No Flutter Oscillators) ---');
{
  const audio = new FluteAudioEngine();
  audio.init();
  const swaraSa = window.SwarasData.CARNATIC_16_SWARASTHANAS.find(s => s.id === 'sa');
  audio.samplesLoaded = false;
  audio.playSwara(swaraSa);

  assert(audio.activeVoice, 'Active physical modeling voice must exist');
  assert(!audio.activeVoice.flutter1, 'Must NOT contain flutter1 oscillator');
  assert(!audio.activeVoice.flutter2, 'Must NOT contain flutter2 oscillator');
  console.log('✅ PASS: Physical modeling voice contains zero artificial flutter LFOs.');
}

console.log('\n======================================================');
console.log('🎉 ALL SUSTAINED NOTE PURITY TESTS PASSED 100%!');
console.log('======================================================\n');
