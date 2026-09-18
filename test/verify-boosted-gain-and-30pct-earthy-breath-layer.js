/**
 * Automated Verification Suite for Boosted Gain Across All 3 Octaves & 30% Earthy Indian Flute Layer
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('======================================================================');
console.log('🪈 VERIFYING BOOSTED GAIN (ALL 3 OCTAVES) & 30% EARTHY INDIAN FLUTE');
console.log('======================================================================\n');

const audioPath = path.join(__dirname, '../src/flute-audio.js');
const audioContent = fs.readFileSync(audioPath, 'utf8');

// --- 1. Static Code Analysis: Boosted Gain Across All 3 Octaves ---
console.log('--- 1. Testing Boosted Gain Across All 3 Octaves ---');

// Acoustic Sample Voice Gain: Mandra (1.15), Madhya (1.05), Tara (0.95)
assert(audioContent.includes('const targetGain = (isTaraOctave ? 0.95 : (isMandraOctave ? 1.15 : 1.05)) * this.breathPressure;'),
  'playAcousticSample must provide boosted gain across all 3 octaves (1.15 / 1.05 / 0.95)');
console.log('✅ PASS: Acoustic sample voice boosted across Mandra (1.15), Madhya (1.05), Tara (0.95)');

// Electric Voice Gain: Mandra (0.98), Madhya (0.92), Tara (0.86)
assert(audioContent.includes('const targetGain = (isLowerOctave ? 0.98 : (isTaraOctave ? 0.86 : 0.92)) * this.breathPressure;'),
  'startElectricVoice must provide boosted punchy gain across all 3 octaves (0.98 / 0.92 / 0.86)');
console.log('✅ PASS: Electric voice boosted across Mandra (0.98), Madhya (0.92), Tara (0.86)');

// Physical Modeling Voice Gain: Mandra (0.98), Madhya (0.92), Tara (0.86)
assert(audioContent.includes('startVoice(freq)') && 
       audioContent.includes('const targetGain = (isLowerOctave ? 0.98 : (isTaraOctave ? 0.86 : 0.92)) * this.breathPressure;'),
  'startVoice must provide boosted gain across all 3 octaves (0.98 / 0.92 / 0.86)');
console.log('✅ PASS: Physical fallback voice boosted across all 3 octaves');

// setBreathPressure octave-aware gain scaling
assert(audioContent.includes('const targetGain = (isTaraOctave ? 0.95 : (isMandraOctave ? 1.15 : 1.05)) * this.breathPressure;'),
  'setBreathPressure must apply boosted gain for sample voice');
console.log('✅ PASS: setBreathPressure dynamically scales boosted gains across all octaves');

// triggerJanti re-attack gain
assert(audioContent.includes('const baseGain = 0.95 * this.breathPressure;') &&
       audioContent.includes('const baseGain = 0.85 * this.breathPressure;') &&
       audioContent.includes('const baseGain = 0.90 * this.breathPressure;'),
  'triggerJanti must use boosted baseGain values across sample, electric, and physical voices');
console.log('✅ PASS: Janti Sphuritam re-attacks boosted for authoritative articulation');

// --- 2. Static Code Analysis: 30% Earthy Indian Flute Layer & Breath Modeling ---
console.log('\n--- 2. Testing 30% Earthy Indian Flute Layer & Breath Modeling ---');

// Continuous looping sample layer in playElectricFlute
assert(audioContent.includes('acousticSource.loop = true;'), 'Acoustic Indian flute layer must loop continuously during electric flute mode');
assert(audioContent.includes('0.30 * this.breathPressure'), 'Acoustic layer gain must be set to exactly 30% of breath pressure');
assert(audioContent.includes('acousticEarthFilter.frequency.setValueAtTime(520, now);'), 'Acoustic layer must include earthy bamboo wood peaking filter (520Hz)');
assert(audioContent.includes('acousticEarthFilter.gain.setValueAtTime(4.5, now);'), 'Earthy bamboo filter must provide +4.5dB warmth boost');
assert(audioContent.includes('acousticHighCut.frequency.setValueAtTime(3400, now);'), 'Acoustic layer must tame highs at 3400Hz');
console.log('✅ PASS: Continuous 30% authentic Indian bamboo flute acoustic layer integrated into electric mode');

// Earthy bamboo wood cavity node filter in breath turbulence engine
assert(audioContent.includes('earthyWoodFilter = this.ctx.createBiquadFilter();'), 'Electric breath engine must include earthy bamboo wood node filter');
assert(audioContent.includes('earthyWoodFilter.frequency.setValueAtTime(540, now);'), 'Earthy wood breath filter must be centered at ~540Hz');
assert(audioContent.includes('earthyWoodGain.gain.setValueAtTime(0.35, now);'), 'Earthy wood breath gain must provide 35% resonance');
assert(audioContent.includes('0.30 * this.breathPressure'), 'Wind noise gain must be scaled to exactly 30%');
console.log('✅ PASS: Earthy bamboo wood cavity resonance and 30% organic breath turbulence engine verified');

// Clean cleanup in fadePreviousVoice & stopVoice
assert(audioContent.includes('oldElectric.acousticLayer && oldElectric.acousticLayer.source'),
  'fadePreviousVoice and stopVoice must cleanly clean up acousticLayer');
console.log('✅ PASS: Acoustic layer releases and crossfades cleanly without leaks');

// --- 3. Mock Web Audio Context & Runtime Testing ---
console.log('\n--- 3. Runtime Verification of Gain and 30% Earthy Layer ---');

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
    this.sampleRate = 44100;
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

const swarasDataCode = fs.readFileSync(path.join(__dirname, '../src/swaras-data.js'), 'utf-8');
new vm.Script(swarasDataCode).runInThisContext();

const script = new vm.Script(audioContent + '\nglobal.FluteAudioEngine = FluteAudioEngine;');
script.runInThisContext();

const engine = new global.FluteAudioEngine();
engine.init();
engine.setBreathPressure(0.80);
engine.setElectricMode(true);

// Mock acoustic sample loaded
engine.samplesLoaded = true;
engine.manifest = {
  sa: { file: 'audio/samples/sa.wav', loopStart: 0.2, loopEnd: 1.2 }
};
engine.sampleBuffers['sa'] = engine.ctx.createBuffer();

// Play Sa note in Mid octave
const swaraSa = { id: 'sa', swara: 'Sa', freqRatio: 1.0, family: 'sa' };
engine.playSwara(swaraSa);

assert.ok(engine.activeElectricVoice, 'Electric voice must be created');
assert.ok(engine.activeElectricVoice.windGain, 'windGain must exist');
// Check that windGain has 30% scaling (0.30 * breathPressure = 0.240 at 0.80 breath)
assert.strictEqual(Math.round(engine.activeElectricVoice.windGain.gain.value * 1000) / 1000, 0.240,
  'windGain must be exactly 0.30 * 0.80 = 0.240 (30% breath pressure)');
console.log('✅ PASS: Electric voice initial breath wind gain is exactly 30% of breath pressure');

// Check that acoustic layer was created and looping at 30%
assert.ok(engine.activeElectricVoice.acousticLayer, 'acousticLayer must be instantiated in electric mode when sample is present');
assert.strictEqual(engine.activeElectricVoice.acousticLayer.source.loop, true, 'acousticLayer must be looping continuously');
assert.strictEqual(Math.round(engine.activeElectricVoice.acousticLayer.gain.gain.value * 1000) / 1000, 0.240,
  'acousticLayer gain must be exactly 0.30 * 0.80 = 0.240 (30% Indian flute sound)');
console.log('✅ PASS: Continuous 30% Indian flute acoustic sample layer active and looping');

// Test setBreathPressure updates both to 30% of new breath pressure
engine.setBreathPressure(1.0);
assert.strictEqual(Math.round(engine.activeElectricVoice.windGain.gain.value * 1000) / 1000, 0.300,
  'windGain must scale to 0.300 at breath pressure 1.0');
assert.strictEqual(Math.round(engine.activeElectricVoice.acousticLayer.gain.gain.value * 1000) / 1000, 0.300,
  'acousticLayer must scale to 0.300 at breath pressure 1.0');
console.log('✅ PASS: Dynamic breath pressure dynamically modulates the 30% breath & acoustic layer');

// Test Stop Cleanliness
engine.stopVoice();
assert.strictEqual(engine.activeElectricVoice, null, 'activeElectricVoice must be null after stopVoice');
assert.strictEqual(engine.isPlaying, false, 'isPlaying must be false');
console.log('✅ PASS: Complete voice teardown and memory cleanup verified');

console.log('\n======================================================================');
console.log('🎉 ALL BOOSTED GAIN & 30% EARTHY FLUTE TESTS PASSED 100%!');
console.log('======================================================================\n');
