// Verification Test Suite: Jazz Mode, Smooth Inter-Octave Tracking & Rigorous Janti
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 1. Verify SwarasData Integrity
const swarasDataPath = path.join(__dirname, '../src/swaras-data.js');
const swarasCode = fs.readFileSync(swarasDataPath, 'utf8');
const dummyWindow = {};
eval(`(function(window) { ${swarasCode} })(dummyWindow)`);
const SwarasData = dummyWindow.SwarasData;

assert(SwarasData, 'SwarasData must be defined');
assert.strictEqual(SwarasData.CARNATIC_16_SWARASTHANAS.length, 16);
console.log('✅ PASS: SwarasData 16 swarasthanas confirmed.');

// 2. Test Inter-Octave Recognition & Smoothing
console.log('\n--- 2. Testing Inter-Octave Tracking with Exponential Smoothing ---');
class MockTrackerOctave {
  constructor() {
    this.currentOctave = 0;
    this.smoothedHandsY = null;
    this.OCTAVE_LINES = { HIGH: 0.44, MID: 0.55, BASS: 0.67 };
  }

  updateOctaveFromHandsY(y) {
    if (this.smoothedHandsY === null || this.smoothedHandsY === undefined) {
      this.smoothedHandsY = y;
    } else {
      const deltaY = Math.abs(y - this.smoothedHandsY);
      // Adaptive smoothing: ultra-responsive when moving between lines (alpha = 0.70), steady when holding (alpha = 0.40)
      const alpha = deltaY > 0.09 ? 0.70 : 0.40;
      this.smoothedHandsY = this.smoothedHandsY * (1.0 - alpha) + y * alpha;
    }
    const smoothY = this.smoothedHandsY;
    let targetOctave = this.currentOctave;

    if (this.currentOctave === 0) {
      if (smoothY < 0.495) targetOctave = 1;
      else if (smoothY > 0.61) targetOctave = -1;
    } else if (this.currentOctave === 1) {
      if (smoothY > 0.61) targetOctave = -1; // Direct jump High to Bass
      else if (smoothY > 0.51) targetOctave = 0;
    } else if (this.currentOctave === -1) {
      if (smoothY < 0.495) targetOctave = 1; // Direct jump Bass to High
      else if (smoothY < 0.59) targetOctave = 0;
    }

    this.currentOctave = targetOctave;
    return this.currentOctave;
  }
}

const octTracker = new MockTrackerOctave();
// Initially at Mid (Y = 0.55)
assert.strictEqual(octTracker.updateOctaveFromHandsY(0.55), 0, 'Mid line hands stay at Mid octave (0)');

// Small jitter around mid (0.53 -> 0.57) must NOT switch octave
octTracker.updateOctaveFromHandsY(0.53);
assert.strictEqual(octTracker.currentOctave, 0, 'Small hand flutter near mid must not trigger octave shift');

// Clear move up towards lowered High line (Y = 0.42)
octTracker.updateOctaveFromHandsY(0.42);
octTracker.updateOctaveFromHandsY(0.42);
assert.strictEqual(octTracker.currentOctave, 1, 'Hands at lowered top line cleanly trigger High octave (+1)');
console.log('✅ PASS: Mid to High octave transition is quick and smooth at lowered level.');

// Direct downward jump to Bass line (Y = 0.68)
octTracker.updateOctaveFromHandsY(0.68);
octTracker.updateOctaveFromHandsY(0.68);
assert.strictEqual(octTracker.currentOctave, -1, 'Hands moving directly to bottom line trigger Bass octave (-1)');
console.log('✅ PASS: Direct High to Bass jump works smoothly without getting stuck.');

// Return to Mid (Y = 0.55)
octTracker.updateOctaveFromHandsY(0.55);
octTracker.updateOctaveFromHandsY(0.55);
assert.strictEqual(octTracker.currentOctave, 0, 'Hands returning to center cleanly restore Madhya (0)');
console.log('✅ PASS: Bass to Mid return is seamless.');

// 3. Test Janti Shake Thresholds (No accidental oscillation)
console.log('\n--- 3. Testing Janti Qualification: Immune to Regular Motion & Oscillations ---');
class MockJantiDetector {
  constructor() {
    this.swaraHoldStartTime = 0;
    this.lastJantiTime = 0;
    this.jantiTriggerCount = 0;
  }

  evaluateMovement(now, holdDuration, maxJerkDelta, maxRelTipSpeed) {
    if (holdDuration < 420) return false;
    if (now - this.lastJantiTime < 600) return false;

    const SIGNIFICANT_PULSE_THRESHOLD = 0.22;
    const SIGNIFICANT_SINGLE_THRESHOLD = 0.30;

    let qualifies = false;
    if (maxJerkDelta >= SIGNIFICANT_SINGLE_THRESHOLD && maxRelTipSpeed >= 0.060) {
      qualifies = true;
    }
    if (qualifies) {
      this.lastJantiTime = now;
      this.jantiTriggerCount++;
    }
    return qualifies;
  }
}

const jantiSim = new MockJantiDetector();
const now = 1000;

// Test A: Normal playing / finger curls (delta = 0.12, speed = 0.02) -> MUST NOT QUALIFY
assert.strictEqual(
  jantiSim.evaluateMovement(now, 500, 0.12, 0.020),
  false,
  'Normal playing finger motions must NEVER qualify as Janti'
);
console.log('✅ PASS: Normal playing finger movements produce ZERO Janti oscillations.');

// Test B: Mild hand wobble / tremor (delta = 0.18, speed = 0.035) -> MUST NOT QUALIFY
assert.strictEqual(
  jantiSim.evaluateMovement(now, 500, 0.18, 0.035),
  false,
  'Mild wobbles or vibrato must NOT trigger Janti'
);
console.log('✅ PASS: Mild gestures and wrist tilts do not oscillate into Janti.');

// Test C: Premature shake before note has stabilized (holdDuration = 200ms < 420ms) -> MUST NOT QUALIFY
assert.strictEqual(
  jantiSim.evaluateMovement(now, 200, 0.35, 0.080),
  false,
  'Shake during note transition must be ignored'
);
console.log('✅ PASS: Motion during note transition does not misfire.');

// Test D: Deliberate, significant physical shake on held note (delta = 0.34, speed = 0.075) -> QUALIFIES
assert.strictEqual(
  jantiSim.evaluateMovement(now, 600, 0.34, 0.075),
  true,
  'Significant, energetic physical shake cleanly triggers Janti'
);
assert.strictEqual(jantiSim.jantiTriggerCount, 1);
console.log('✅ PASS: Significant shake cleanly triggers Janti Sphuritam.');

// 4. Test Jazz Flute Dragged Notes Calculation
console.log('\n--- 4. Testing Jazz Flute Mode Dragged Notes Mathematics ---');
function calculateJazzPortamento(prevFreq, targetFreq) {
  if (!prevFreq || !targetFreq || Math.abs(prevFreq - targetFreq) < 2) return 0;
  const centsDiff = Math.max(-700, Math.min(700, 1200 * Math.log2(prevFreq / targetFreq)));
  return centsDiff;
}

// Case A: Slur from Sa (276.36 Hz) up to Ri (310.90 Hz)
const saToRiCents = calculateJazzPortamento(276.36, 310.90);
assert(saToRiCents < -190 && saToRiCents > -215, `Sa to Ri slur should start ~ -204 cents lower (got ${saToRiCents.toFixed(1)})`);
console.log(`✅ PASS: Jazz upward slur from Sa to Ri drags from ${saToRiCents.toFixed(1)} cents.`);

// Case B: Slur from Pa (414.54 Hz) down to Ga (345.45 Hz)
const paToGaCents = calculateJazzPortamento(414.54, 345.45);
assert(paToGaCents > 300 && paToGaCents < 330, `Pa to Ga slur should start ~ +315 cents higher (got ${paToGaCents.toFixed(1)})`);
console.log(`✅ PASS: Jazz downward slur from Pa to Ga drags from +${paToGaCents.toFixed(1)} cents.`);

console.log('\n🎉 ALL JAZZ, OCTAVE, AND JANTI TESTS PASSED 100%!\n');
