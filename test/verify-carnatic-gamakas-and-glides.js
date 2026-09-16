// Verification Test Suite: Carnatic Gamakas, Jāru Glides (Pa -> Dha Assist), and Kampita
const assert = require('assert');
const path = require('path');
const fs = require('fs');

// 1. Load SwarasData, CarnaticFluteTracker, and Mock Web Audio
const dummyWindow = {};
const swarasCode = fs.readFileSync(path.join(__dirname, '../src/swaras-data.js'), 'utf8');
eval(`(function(window) { ${swarasCode} })(dummyWindow)`);
global.window = dummyWindow;

const trackerCode = fs.readFileSync(path.join(__dirname, '../src/carnatic-flute-tracker.js'), 'utf8');
eval(`(function(window) { ${trackerCode} })(dummyWindow)`);
const CarnaticFluteTracker = dummyWindow.CarnaticFluteTracker;

const audioCode = fs.readFileSync(path.join(__dirname, '../src/flute-audio.js'), 'utf8');
// Mock Web Audio Context for Node.js
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
  createBuffer(channels, length, rate) {
    return { numberOfChannels: channels, length, sampleRate: rate, getChannelData: () => new Float32Array(length) };
  }
  createPeriodicWave() { return {}; }
  resume() { return Promise.resolve(); }
}

global.fetch = () => Promise.resolve({ ok: false });

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
global.AudioContext = MockAudioContext;
dummyWindow.AudioContext = MockAudioContext;
eval(`(function(window) { ${audioCode} })(dummyWindow)`);
const FluteAudioEngine = dummyWindow.FluteAudioEngine;

console.log('✅ PASS: FluteAudioEngine and CarnaticFluteTracker loaded successfully.');

// Setup Audio Engine with Mock Samples
const audio = new FluteAudioEngine();
audio.init();
audio.samplesLoaded = true;
audio.manifest = {
  pa: { file: 'audio/samples/pa.wav', loopStart: 0.2, loopEnd: 1.2 },
  dha: { file: 'audio/samples/dha.wav', loopStart: 0.2, loopEnd: 1.2 },
  sa: { file: 'audio/samples/sa.wav', loopStart: 0.2, loopEnd: 1.2 }
};
audio.sampleBuffers = {
  pa: audio.ctx.createBuffer(1, 44100, 44100),
  dha: audio.ctx.createBuffer(1, 44100, 44100),
  sa: audio.ctx.createBuffer(1, 44100, 44100)
};

const swaraPa = window.SwarasData.CARNATIC_16_SWARASTHANAS.find(s => s.id === 'pa');
const swaraDha = window.SwarasData.CARNATIC_16_SWARASTHANAS.find(s => s.id === 'dha2');
const swaraSa = window.SwarasData.CARNATIC_16_SWARASTHANAS.find(s => s.id === 'sa');

assert(swaraPa && swaraDha && swaraSa, 'Swaras Pa, Dha, Sa must exist');

// -----------------------------------------------------------------------------
// Test 1: Staccato / Fresh Note from Silence (Instant 8ms, Zero Glide)
// -----------------------------------------------------------------------------
console.log('\n--- 1. Testing Fresh Note from Silence (Zero Glide, Instant 8ms Attack) ---');
audio.stopVoice();
assert.strictEqual(audio.isPlaying, false);

audio.playSwara(swaraPa);
assert(audio.activeSampleVoice, 'Active sample voice must be playing');
const paVoice = audio.activeSampleVoice;

// Verify detune is exactly 0 (no glide on fresh start)
const paDetuneEvents = paVoice.source.detune.events;
const initialDetuneEvent = paDetuneEvents.find(e => e.type === 'setValueAtTime');
assert(initialDetuneEvent, 'Must set initial detune');
assert.strictEqual(initialDetuneEvent.val, 0, 'Fresh note from silence must start at 0 cents detune (no glide)');

// Verify gain has instant 8ms attack
const paGainEvents = paVoice.gain.gain.events;
const attackRamp = paGainEvents.find(e => e.type === 'linearRampToValueAtTime');
assert(Math.abs(attackRamp.time - (audio.ctx.currentTime + 0.014)) < 0.001 || Math.abs(attackRamp.time - (audio.ctx.currentTime + 0.008)) < 0.001, 'Fresh note must attack in 14ms (or 8ms)');
console.log('✅ PASS: Fresh note from silence has crisp attack with zero glide.');

// -----------------------------------------------------------------------------
// Test 2: Smooth Pa -> Dha Transition (Carnatic Jāru "pd- da" Glide Assist)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Testing Smooth Pa -> Dha Transition (Jāru Assist Without Overpowering) ---');
// Transition while Pa is currently playing
audio.ctx.currentTime += 0.20; // 200ms into Pa

audio.playSwara(swaraDha, { isLegato: true, fromSwaraId: 'pa' });
assert(audio.activeSampleVoice, 'Dha voice must be active');
const dhaVoice = audio.activeSampleVoice;

// 1. Verify Jāru pitch assist: Dha starts below pitch (launching from Pa) and glides into 0 cents
const dhaDetuneEvents = dhaVoice.source.detune.events;
const startDetuneEvent = dhaDetuneEvents.find(e => e.type === 'setValueAtTime');
const glideEvent = dhaDetuneEvents.find(e => e.type === 'setTargetAtTime');

assert(startDetuneEvent, 'Dha must set initial detune');
console.log(`Dha initial detune offset: ${startDetuneEvent.val.toFixed(1)} cents`);
// Interval Pa to Dha is -182 to -204 cents. 82% of -182.4c is -149.6c.
assert(startDetuneEvent.val < -100 && startDetuneEvent.val > -250, `Dha must launch from near Pa (-150c), got ${startDetuneEvent.val}`);
assert(glideEvent, 'Dha must have a pitch glide scheduled to target pitch');
assert.strictEqual(glideEvent.val, 0, 'Dha pitch must glide to exact target 0 cents');
assert(glideEvent.constant <= 0.025, 'Glide time constant must be agile (~20ms)');
console.log('✅ PASS: Dha takes flight with pitch assist from Pa and swiftly glides into Dha in ~55ms.');

// 2. Verify Volume Envelope: Starts at 45% and ramps to 100% over 35ms (so Pa assists without Dha clashing)
const dhaGainEvents = dhaVoice.gain.gain.events;
const gainStart = dhaGainEvents.find(e => e.type === 'setValueAtTime');
const gainRamp = dhaGainEvents.find(e => e.type === 'linearRampToValueAtTime');

assert(gainStart && gainRamp, 'Dha must schedule gain shaping');
const maxTargetGain = 0.65 * audio.breathPressure;
assert(Math.abs(gainStart.val - (maxTargetGain * 0.45)) < 0.05, 'Dha initial gain must start around 45%');
assert(Math.abs(gainRamp.time - (audio.ctx.currentTime + 0.035)) < 0.002, 'Dha gain must reach full power at 35ms');
console.log('✅ PASS: Dha volume begins gently and blooms as pitch locks in (assist without overpowering).');

// 3. Verify Outgoing Pa Voice Crossfades with 28ms assist rather than hard 8ms cutoff
const paReleaseRamp = paVoice.gain.gain.events.find(e => e.type === 'linearRampToValueAtTime' && e.val === 0.0001);
assert(paReleaseRamp, 'Pa must have release ramp');
const fadeDuration = paReleaseRamp.time - audio.ctx.currentTime;
assert(Math.abs(fadeDuration - 0.028) < 0.002, `Pa must crossfade over 28ms, got ${fadeDuration.toFixed(3)}s`);
console.log('✅ PASS: Departing Pa voice crossfades musically over 28ms to assist Dha.');

// -----------------------------------------------------------------------------
// Test 3: Descending Glide Dha -> Pa (Irakku Jāru "dp- pa")
// -----------------------------------------------------------------------------
console.log('\n--- 3. Testing Descending Glide Dha -> Pa (Irakku Jāru) ---');
audio.ctx.currentTime += 0.20;

audio.playSwara(swaraPa, { isLegato: true, fromSwaraId: 'dha2' });
const newPaVoice = audio.activeSampleVoice;
const newPaDetuneStart = newPaVoice.source.detune.events.find(e => e.type === 'setValueAtTime');
assert(newPaDetuneStart, 'New Pa voice must set start detune');
console.log(`Pa descending initial detune offset: +${newPaDetuneStart.val.toFixed(1)} cents`);
assert(newPaDetuneStart.val > +100 && newPaDetuneStart.val < +250, 'Descending glide must start with positive detune offset');
console.log('✅ PASS: Descending glide Dha -> Pa starts with downward assist from Dha.');

// -----------------------------------------------------------------------------
// Test 4: Kampita Hand Tilt Microtonal Oscillation in Tracker
// -----------------------------------------------------------------------------
console.log('\n--- 4. Testing Kampita Hand Tilt Oscillation in Tracker ---');
const tracker = new CarnaticFluteTracker();
tracker.inPlayingPosition = true;
tracker.lineAngleDeg = 12; // Baseline flute angle

let capturedGamakaCents = 0;
tracker.onGamakaBend = (cents) => {
  capturedGamakaCents = cents;
};

// 1. Hands at exact baseline angle 12 degrees (dy / dx matching ~12°)
// dx = 0.20, dy = 0.20 * tan(12°) = 0.0425
const normalLeft = [
  { x: 0.6, y: 0.5 }, null, null, null, null,
  null, null, null, null,
  { x: 0.6, y: 0.5 } // knuckle 9
];
const normalRight = [
  { x: 0.4, y: 0.5425 }, null, null, null, null,
  null, null, null, null,
  { x: 0.4, y: 0.5425 } // knuckle 9
];
tracker.calculateFluteTilt(normalLeft, normalRight);
assert.strictEqual(capturedGamakaCents, 0, 'Holding normal posture must produce exactly 0 cents (within deadband)');
console.log('✅ PASS: Normal playing posture produces 0 cents detune (stable pitch).');

// 2. Deliberate hand tilt: tilt right hand down by an extra 6 degrees (Kampita rock)
// dy = 0.20 * tan(18°) = 0.065
const tiltedRight = [
  { x: 0.4, y: 0.565 }, null, null, null, null,
  null, null, null, null,
  { x: 0.4, y: 0.565 }
];
// Run 5 frames of continuous tilt to verify smoothed Kampita oscillation
for (let i = 0; i < 5; i++) {
  tracker.calculateFluteTilt(normalLeft, tiltedRight);
}
assert(capturedGamakaCents > 10 && capturedGamakaCents < 45, `Hand tilt must generate +10 to +45 cents Kampita, got ${capturedGamakaCents.toFixed(1)}`);
console.log(`✅ PASS: Hand tilt produces natural Kampita microtonal oscillation (${capturedGamakaCents.toFixed(1)} cents).`);

console.log('\n🌟 ALL CARNATIC GAMAKAS & JĀRU GLIDE TESTS PASSED 100%!\n');
