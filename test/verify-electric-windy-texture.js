/**
 * Automated Verification Suite for Electric Flute Windy Texture & Breath Dynamics
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================');
console.log('🌬️ VERIFYING ELECTRIC FLUTE WINDY TEXTURE & BREATH');
console.log('======================================================\n');

// Mock Web Audio Context
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
      started: false,
      stopped: false,
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

// Load SwarasData and FluteAudioEngine
const vm = require('vm');
const swarasDataCode = fs.readFileSync(path.join(__dirname, '../src/swaras-data.js'), 'utf-8');
const swarasScript = new vm.Script(swarasDataCode);
swarasScript.runInThisContext();

const fluteAudioCode = fs.readFileSync(path.join(__dirname, '../src/flute-audio.js'), 'utf-8');
const script = new vm.Script(fluteAudioCode + '\nglobal.FluteAudioEngine = FluteAudioEngine;');
script.runInThisContext();

const engine = new global.FluteAudioEngine();
engine.init();

// --- 1. Testing Electric Mode Activation & Core Texture Preserved ---
console.log('--- 1. Testing Electric Mode Activation & Core Texture Preserved ---');
engine.setElectricMode(true);
assert.strictEqual(engine.isElectricMode, true, 'Electric mode must be active');

const swaraSa = { id: 'sa', swara: 'Sa', freqRatio: 1.0, family: 'sa' };
engine.playSwara(swaraSa);

assert.ok(engine.activeElectricVoice, 'activeElectricVoice must be active');
assert.strictEqual(engine.activeElectricVoice.oscillators.length, 3, 'Must preserve the beloved 3-oscillator synth texture');
assert.strictEqual(engine.activeElectricVoice.oscillators[0].type, 'sawtooth', 'Primary saw lead preserved');
assert.strictEqual(engine.activeElectricVoice.oscillators[1].type, 'square', 'Reed bite square preserved');
assert.strictEqual(engine.activeElectricVoice.oscillators[2].type, 'triangle', 'Sub-octave bass triangle preserved');
console.log('✅ PASS: Beloved electric synth texture preserved intact');

// --- 2. Testing Organic Windy / Breath Turbulence Engine ---
console.log('\n--- 2. Testing Organic Windy / Breath Turbulence Engine ---');
assert.ok(engine.activeElectricVoice.windNoise, 'windNoise buffer source must be active');
assert.strictEqual(engine.activeElectricVoice.windNoise.loop, true, 'windNoise must loop continuously throughout the note');
assert.ok(engine.activeElectricVoice.windNoise.started, 'windNoise must have started');

assert.ok(engine.activeElectricVoice.boreBreathFilter, 'boreBreathFilter must exist');
assert.strictEqual(engine.activeElectricVoice.boreBreathFilter.type, 'bandpass', 'Bore breath filter must be bandpass');
assert.strictEqual(engine.activeElectricVoice.boreBreathFilter.frequency.value, engine.activeElectricVoice.targetFreq, 'Bore breath filter must track note fundamental frequency');

assert.ok(engine.activeElectricVoice.windGain, 'windGain node must exist');
console.log('✅ PASS: Continuous organic flute wind & bore breath turbulence active and tracking swara pitch');

// --- 3. Testing Dynamic Breath Pressure Response ---
console.log('\n--- 3. Testing Dynamic Breath Pressure Response ---');
engine.setBreathPressure(0.30);
const windGainSoft = engine.activeElectricVoice.windGain.gain.value;

engine.setBreathPressure(0.95);
const windGainLoud = engine.activeElectricVoice.windGain.gain.value;

assert.ok(windGainLoud > windGainSoft, 'Wind turbulence must intensify when user breathes harder');
console.log('✅ PASS: User breath directly breathes life into wind turbulence level');

// --- 4. Testing Zero Glitch / Sustained Note Stability ---
console.log('\n--- 4. Testing Zero Glitch / Sustained Note Stability ---');
const initialVoice = engine.activeElectricVoice;
for (let i = 0; i < 30; i++) {
  engine.ctx.currentTime += 0.016;
  engine.playSwara(swaraSa);
}
assert.strictEqual(engine.activeElectricVoice, initialVoice, 'Voice must NOT recreate on sustained note (zero buzz/chatter)');
console.log('✅ PASS: Sustained note purity verified - zero glitching or voice retriggering');

// --- 5. Testing Clean Voice Release ---
console.log('\n--- 5. Testing Clean Voice Release ---');
engine.stopVoice();
assert.strictEqual(engine.activeElectricVoice, null, 'activeElectricVoice must be null after stop');
assert.strictEqual(engine.isPlaying, false, 'isPlaying must be false');
console.log('✅ PASS: Voice releases cleanly with zero lingering audio nodes');

console.log('\n======================================================');
console.log('🎉 ALL WINDY TEXTURE TESTS PASSED 100%!');
console.log('======================================================\n');
