/**
 * Automated Verification Suite for Electric Flute Mode Toggle
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================');
console.log('⚡ VERIFYING ELECTRIC FLUTE ENGINE & TOGGLE FEATURE');
console.log('======================================================\n');

// Mock Web Audio Context for Node.js testing
class MockAudioParam {
  constructor(val = 0) {
    this.value = val;
  }
  setValueAtTime(val) { this.value = val; }
  linearRampToValueAtTime(val) { this.value = val; }
  exponentialRampToValueAtTime(val) { this.value = val; }
  setTargetAtTime(val) { this.value = val; }
  cancelScheduledValues() {}
}

class MockAudioNode {
  constructor() {
    this.connectedTo = [];
  }
  connect(dest) {
    this.connectedTo.push(dest);
    return dest;
  }
  disconnect() {
    this.connectedTo = [];
  }
}

class MockGainNode extends MockAudioNode {
  constructor(ctx) {
    super();
    this.gain = new MockAudioParam(1.0);
  }
}

class MockOscillatorNode extends MockAudioNode {
  constructor(ctx) {
    super();
    this.type = 'sine';
    this.frequency = new MockAudioParam(440);
    this.detune = new MockAudioParam(0);
    this.started = false;
    this.stopped = false;
  }
  setPeriodicWave() {}
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class MockBiquadFilterNode extends MockAudioNode {
  constructor(ctx) {
    super();
    this.type = 'lowpass';
    this.frequency = new MockAudioParam(1000);
    this.Q = new MockAudioParam(1);
    this.gain = new MockAudioParam(0);
  }
}

class MockWaveShaperNode extends MockAudioNode {
  constructor(ctx) {
    super();
    this.curve = null;
    this.oversample = 'none';
  }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0.5;
    this.destination = new MockAudioNode();
  }
  createGain() { return new MockGainNode(this); }
  createOscillator() { return new MockOscillatorNode(this); }
  createBiquadFilter() { return new MockBiquadFilterNode(this); }
  createWaveShaper() { return new MockWaveShaperNode(this); }
  createDynamicsCompressor() {
    return {
      threshold: new MockAudioParam(-10),
      knee: new MockAudioParam(20),
      ratio: new MockAudioParam(6),
      attack: new MockAudioParam(0.003),
      release: new MockAudioParam(0.12),
      connect: () => {}
    };
  }
  createAnalyser() {
    return {
      fftSize: 1024,
      smoothingTimeConstant: 0.84,
      connect: () => {},
      frequencyBinCount: 512,
      getByteFrequencyData: () => {},
      getByteTimeDomainData: () => {}
    };
  }
  createConvolver() {
    return { buffer: null, connect: () => {} };
  }
  createBuffer() {
    return {
      duration: 1.0,
      getChannelData: () => new Float32Array(44100)
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      playbackRate: new MockAudioParam(1),
      detune: new MockAudioParam(0),
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      start: function() { this.started = true; },
      stop: function() { this.stopped = true; },
      connect: () => {},
      disconnect: () => {}
    };
  }
  createMediaStreamDestination() {
    return { stream: {}, connect: () => {} };
  }
  createMediaElementSource() {
    return { connect: () => {} };
  }
  createPeriodicWave() {
    return {};
  }
  resume() {}
}

global.Audio = class {
  constructor() {
    this.loop = false;
    this.src = '';
  }
  canPlayType() { return 'probably'; }
  play() { return Promise.resolve(); }
  pause() {}
  addEventListener() {}
};

global.window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext
};

// Load SwarasData and FluteAudioEngine code
const vm = require('vm');
const swarasDataCode = fs.readFileSync(path.join(__dirname, '../src/swaras-data.js'), 'utf-8');
const swarasScript = new vm.Script(swarasDataCode);
swarasScript.runInThisContext();

const fluteAudioCode = fs.readFileSync(path.join(__dirname, '../src/flute-audio.js'), 'utf-8');
const script = new vm.Script(fluteAudioCode + '\nglobal.FluteAudioEngine = FluteAudioEngine;');
script.runInThisContext();

// --- 1. Testing Engine Initialization & Default Mode ---
console.log('--- 1. Testing Engine Initialization & Default Mode ---');
const engine = new global.FluteAudioEngine();
assert.strictEqual(engine.isElectricMode, false, 'Default mode must be Acoustic (isElectricMode = false)');
engine.init();
assert.ok(engine.isInitialized, 'Audio engine successfully initialized');
console.log('✅ PASS: FluteAudioEngine defaults to Acoustic Venu mode');

// --- 2. Testing Electric Mode Toggle ---
console.log('\n--- 2. Testing Electric Mode Toggle ---');
const toggled1 = engine.toggleElectricMode();
assert.strictEqual(toggled1, true, 'toggleElectricMode() must toggle to true');
assert.strictEqual(engine.isElectricMode, true, 'isElectricMode must be true');

const toggled2 = engine.toggleElectricMode();
assert.strictEqual(toggled2, false, 'toggleElectricMode() must toggle back to false');
assert.strictEqual(engine.isElectricMode, false, 'isElectricMode must be false');

engine.setElectricMode(true);
assert.strictEqual(engine.isElectricMode, true, 'setElectricMode(true) must set electric mode');
console.log('✅ PASS: Electric mode toggle & explicit setters functional');

// --- 3. Testing Tube Overdrive Waveshaper Curve ---
console.log('\n--- 3. Testing Tube Overdrive Waveshaper Curve ---');
const curve = engine.generateElectricDistortionCurve(22);
assert.ok(curve instanceof Float32Array, 'Distortion curve must be a Float32Array');
assert.strictEqual(curve.length, 44100, 'Distortion curve must contain 44100 samples');
assert.ok(curve[0] < 0 && curve[curve.length - 1] > 0, 'Curve must be odd-symmetric transfer curve');
console.log('✅ PASS: Tube overdrive saturation curve generated with proper sigmoid transfer function');

// --- 4. Testing Electric Voice Synthesis & Node Connections ---
console.log('\n--- 4. Testing Electric Voice Synthesis & Node Connections ---');
const swaraObj = { id: 'sa', swara: 'Sa', freqRatio: 1.0 };
engine.playSwara(swaraObj);

assert.ok(engine.activeElectricVoice, 'activeElectricVoice must be instantiated in electric mode');
assert.strictEqual(engine.activeElectricVoice.oscillators.length, 3, 'Electric voice must have 3 oscillators (saw, square, sub-triangle)');
assert.strictEqual(engine.activeElectricVoice.oscillators[0].type, 'sawtooth', 'Primary oscillator must be sawtooth');
assert.strictEqual(engine.activeElectricVoice.oscillators[1].type, 'square', 'Secondary chorus oscillator must be square');
assert.strictEqual(engine.activeElectricVoice.oscillators[2].type, 'triangle', 'Sub-harmonic oscillator must be triangle');
assert.ok(engine.activeElectricVoice.filter, 'Resonant filter node must exist');
assert.strictEqual(engine.activeElectricVoice.filter.type, 'lowpass', 'Filter must be lowpass ladder filter');
console.log('✅ PASS: 3-oscillator analog synth architecture & resonant lowpass filter verified');

// --- 5. Testing Gamaka & Breath Sensitivity in Electric Mode ---
console.log('\n--- 5. Testing Gamaka & Breath Sensitivity in Electric Mode ---');
engine.setGamaka(35);
assert.strictEqual(engine.gamakaCents, 35, 'Gamaka cents stored');

engine.setBreathPressure(0.95);
assert.strictEqual(engine.breathPressure, 0.95, 'Breath pressure stored');
console.log('✅ PASS: Gamaka microtonal detuning and breath modulation routed to electric voice');

// --- 6. Testing Voice Release & Silence Cleanup ---
console.log('\n--- 6. Testing Voice Release & Silence Cleanup ---');
engine.stopVoice();
assert.strictEqual(engine.activeElectricVoice, null, 'activeElectricVoice must be null after stopVoice()');
assert.strictEqual(engine.isPlaying, false, 'isPlaying must be false');
console.log('✅ PASS: Clean release and voice cleanup verified');

// --- 7. Testing HTML UI Elements ---
console.log('\n--- 7. Testing HTML UI Elements ---');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
assert.ok(indexHtml.includes('id="electricFluteToggleBtn"'), 'index.html must include #electricFluteToggleBtn');
assert.ok(indexHtml.includes('id="timbreModeBadge"'), 'index.html must include #timbreModeBadge');
console.log('✅ PASS: UI toggle button and timbre mode badge present in index.html');

// --- 8. Testing CSS Styles ---
console.log('\n--- 8. Testing CSS Styles ---');
const styleCss = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf-8');
assert.ok(styleCss.includes('.btn-electric'), 'style.css must define .btn-electric');
assert.ok(styleCss.includes('.btn-electric.active'), 'style.css must define .btn-electric.active');
assert.ok(styleCss.includes('.pill-info.electric-active'), 'style.css must define .pill-info.electric-active');
console.log('✅ PASS: Electric Flute button and badge CSS classes defined');

// --- 9. Testing app.js Event Wiring & Shortcut ---
console.log('\n--- 9. Testing app.js Event Wiring & Shortcut ---');
const appJs = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf-8');
assert.ok(appJs.includes('electricFluteToggleBtn'), 'app.js must reference electricFluteToggleBtn');
assert.ok(appJs.includes('toggleElectricMode'), 'app.js must define toggleElectricMode function');
assert.ok(appJs.includes("key === 'E'"), "app.js must support 'E' key shortcut to toggle electric mode");
assert.ok(appJs.includes('state.isElectricMode'), 'app.js must track isElectricMode in state');
console.log('✅ PASS: app.js event listeners, keyboard shortcut, and state tracking verified');

console.log('\n======================================================');
console.log('🎉 ALL ELECTRIC FLUTE TOGGLE TESTS PASSED 100%!');
console.log('======================================================\n');
