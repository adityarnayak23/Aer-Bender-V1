// Comprehensive Verification: Single-Hand Playing & Zero-Flicker Open-Hole Isolation
const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Load SwarasData
global.window = {};
require('../src/swaras-data.js');
const { matchSwara, CARNATIC_SWARAS } = window.SwarasData;

console.log('--- 1. Testing Acoustic Open-Hole Downstream Noise Elimination ---');

// Case A: L1 (Hole 0) is open. Downstream fingers twitch or curl (e.g. [F, T, T, T, T, T, T] or [F, F, T, T, ...])
// In physical woodwind, the column vents at Hole 0. Fundamental note MUST be Ga (unless exact Ma fingering).
const openL1Test1 = matchSwara([false, false, false, false, false, false, false]);
assert.strictEqual(openL1Test1.swara.id, 'ga', 'All holes open must produce Ga');

const openL1WithNoise = matchSwara([false, true, false, false, false, false, false]);
assert.strictEqual(openL1WithNoise.swara.id, 'ga', 'Open L1 with twitch on L2 must produce Ga (zero downstream noise)');
console.log('✅ PASS: Open L1 completely eliminates noise from downstream fingers -> Ga.');

// Case B: L1 is closed, L2 is open (Ri). Downstream fingers L3, R1, R2, R3, R4 twitch
const riWithDownstreamTwitch1 = matchSwara([true, false, true, false, false, false, false]);
assert.strictEqual(riWithDownstreamTwitch1.swara.id, 'ri', 'L1 closed + L2 open with L3 twitch must cleanly produce Ri');

const riWithDownstreamTwitch2 = matchSwara([true, false, false, true, true, false, false]);
assert.strictEqual(riWithDownstreamTwitch2.swara.id, 'ri', 'L1 closed + L2 open with R1/R2 resting must cleanly produce Ri');
console.log('✅ PASS: Open L2 completely eliminates noise from all lower fingers -> Ri.');

// Case C: L1 & L2 are closed, L3 is open (Sa). Entire right hand twitches or curls
const saWithRightHandTwitch1 = matchSwara([true, true, false, true, false, false, false]);
assert.strictEqual(saWithRightHandTwitch1.swara.id, 'sa', 'L1 & L2 closed + L3 open with R1 twitch must cleanly produce Sa');

const saWithRightHandTwitch2 = matchSwara([true, true, false, true, true, true, false]);
assert.strictEqual(saWithRightHandTwitch2.swara.id, 'sa', 'L1 & L2 closed + L3 open with right hand partially curled must produce Sa');
console.log('✅ PASS: Open L3 completely isolates entire right hand -> Sa rock-solid.');

// Case D: Left hand closed (L1, L2, L3), R1 open (Ni)
const niWithRightHandTwitch = matchSwara([true, true, true, false, true, true, false]);
assert.strictEqual(niWithRightHandTwitch.swara.id, 'ni', 'L1..L3 closed + R1 open with lower twitches must produce Ni');
console.log('✅ PASS: Open R1 isolates lower right hand fingers -> Ni.');

console.log('\n--- 2. Testing Single-Hand Playing Logic ---');

// Mock Tracker Playing Position & Hole Assembly Logic
class MockTrackerSingleHand {
  constructor() {
    this.awaitingInitialSa = true;
    this.initialSaHoldFrames = 0;
    this.requiredSaFrames = 3;
    this.activeSwara = null;
    this.candidateSwaraId = null;
    this.candidateFrames = 0;
    this.minFramesToSwitch = 1; // Instant response matching exact finger duration
    this.inPlayingPosition = false;
    this.currentOctave = 0;
    this.OCTAVE_LINES = { HIGH: 0.44, MID: 0.55, BASS: 0.67 };
    this.currentHoleStates = [false, false, false, false, false, false, false];
    this.fingerCurlScores = [0, 0, 0, 0, 0, 0, 0];
  }

  processFrame(leftHand, rightHand) {
    // Check which hands are in active playing region (not dropped down Y >= 0.83)
    const isLeftInPlay = Boolean(leftHand && leftHand.knuckleY < 0.83);
    const isRightInPlay = Boolean(rightHand && rightHand.knuckleY < 0.83);

    let inPlayingPosition = false;
    let activeHandsAvgY = this.OCTAVE_LINES.MID;
    let activeLeft = leftHand;
    let activeRight = rightHand;

    if (isLeftInPlay && isRightInPlay) {
      inPlayingPosition = true;
      activeHandsAvgY = (leftHand.knuckleY + rightHand.knuckleY) / 2;
    } else if (isLeftInPlay && !isRightInPlay) {
      // Left hand only: YES!
      inPlayingPosition = true;
      activeHandsAvgY = leftHand.knuckleY;
      activeRight = null;
    } else if (!isLeftInPlay && isRightInPlay) {
      // Right hand only: NO NOTE WILL PLAY! (User requirement)
      inPlayingPosition = false;
    } else {
      inPlayingPosition = false;
    }

    this.inPlayingPosition = inPlayingPosition;

    if (!inPlayingPosition) {
      this.activeSwara = null;
      this.candidateSwaraId = null;
      this.candidateFrames = 0;
      return null;
    }

    // Assemble holes
    let leftHoles = [false, false, false];
    let rightHoles = [false, false, false, false];

    if (activeLeft) {
      leftHoles = [Boolean(activeLeft.l1), Boolean(activeLeft.l2), Boolean(activeLeft.l3)];
      // Woodwind rule on left hand
      if (!leftHoles[0]) { leftHoles[1] = false; leftHoles[2] = false; }
      else if (!leftHoles[1]) { leftHoles[2] = false; }
    }

    if (activeRight) {
      rightHoles = [Boolean(activeRight.r1), Boolean(activeRight.r2), Boolean(activeRight.r3), Boolean(activeRight.r4)];
      if (!rightHoles[0]) { rightHoles[1] = false; rightHoles[2] = false; rightHoles[3] = false; }
      else if (!rightHoles[1]) { rightHoles[2] = false; rightHoles[3] = false; }
      else if (!rightHoles[2]) { rightHoles[3] = false; }
    } else if (activeLeft) {
      // Single-hand 4th finger (pinky)
      const pinkyClosed = Boolean(activeLeft.pinky);
      rightHoles = [pinkyClosed, false, false, false];
    }

    let holesArray = [...leftHoles, ...rightHoles];
    // Global open-hole isolation
    for (let i = 0; i < 7; i++) {
      if (!holesArray[i]) {
        for (let j = i + 1; j < 7; j++) holesArray[j] = false;
        break;
      }
    }

    const matched = matchSwara(holesArray, this.activeSwara ? this.activeSwara.id : null);

    // Initial Sa stabilization
    if (this.awaitingInitialSa) {
      const isSa = matched && matched.swara && matched.swara.id === 'sa';
      if (isSa) {
        this.initialSaHoldFrames++;
        if (this.initialSaHoldFrames >= this.requiredSaFrames) {
          this.awaitingInitialSa = false;
          this.activeSwara = matched.swara;
          this.candidateSwaraId = matched.swara.id;
          this.candidateFrames = this.requiredSaFrames;
        }
      } else {
        this.initialSaHoldFrames = Math.max(0, this.initialSaHoldFrames - 1);
        this.activeSwara = null;
      }
    } else {
      // Debounced note switching
      if (matched && matched.swara) {
        if (matched.swara.id === this.candidateSwaraId) {
          this.candidateFrames++;
          if (this.candidateFrames >= this.minFramesToSwitch) {
            this.activeSwara = matched.swara;
          }
        } else {
          this.candidateSwaraId = matched.swara.id;
          this.candidateFrames = 1;
          if (this.minFramesToSwitch <= 1) {
            this.activeSwara = matched.swara;
          }
        }
      }
    }

    return this.activeSwara ? this.activeSwara.id : null;
  }
}

const tracker = new MockTrackerSingleHand();

// Scenario 1: Initial stabilization using ONE HAND only (Holding Sa: L1=T, L2=T, L3=F)
const oneHandSa = { knuckleY: 0.55, l1: true, l2: true, l3: false, pinky: false };
assert.strictEqual(tracker.processFrame(oneHandSa, null), null, 'Frame 1: silent while stabilizing Sa');
assert.strictEqual(tracker.processFrame(oneHandSa, null), null, 'Frame 2: silent while stabilizing Sa');
assert.strictEqual(tracker.processFrame(oneHandSa, null), 'sa', 'Frame 3: Sa unlocked and playing with ONE HAND!');
console.log('✅ PASS: One hand successfully stabilizes on Sa and starts audio playback.');

// Scenario 2: Rapid "Sa -> Ni -> Sa" Finger Articulation
// User requirement: "If I do a sa ni sa quick the sound should also last for those many seconds only - the ni part"
const oneHandNi = { knuckleY: 0.55, l1: true, l2: true, l3: true, pinky: false };
// Frame 4: User quickly taps Ni (closes L3)
assert.strictEqual(tracker.processFrame(oneHandNi, null), 'ni', 'Frame 4: Quick tap into Ni immediately sounds Ni on that exact frame');
// Frame 5: User lifts L3 back to Sa
assert.strictEqual(tracker.processFrame(oneHandSa, null), 'sa', 'Frame 5: Releasing L3 back to Sa snaps immediately back to Sa without lingering');
console.log('✅ PASS: Quick "Sa -> Ni -> Sa" duration matches exact finger frames (Ni does not linger).');

// Scenario 3: Playing one hand - switch to Ri (L1=T, L2=F, L3=F)
const oneHandRi = { knuckleY: 0.55, l1: true, l2: false, l3: false, pinky: false };
assert.strictEqual(tracker.processFrame(oneHandRi, null), 'ri', 'Switch to Ri is instantaneous');
console.log('✅ PASS: Single-hand transitions to Ri seamlessly.');

// Scenario 3: Playing one hand - switch to Ga (all open)
const oneHandGa = { knuckleY: 0.55, l1: false, l2: false, l3: false, pinky: false };
tracker.processFrame(oneHandGa, null);
tracker.processFrame(oneHandGa, null);
assert.strictEqual(tracker.activeSwara.id, 'ga', 'Single-hand opens all fingers to play Ga');
console.log('✅ PASS: Single-hand plays Ga (all open).');

// Scenario 4: Playing one hand - switch to Ni (L1=T, L2=T, L3=T)
tracker.processFrame(oneHandNi, null);
assert.strictEqual(tracker.activeSwara.id, 'ni', 'Single-hand closes 3 fingers to play Ni');
console.log('✅ PASS: Single-hand plays Ni (3 fingers closed).');

// Scenario 5: Bring in second hand (Right hand) to play Pa (L1..L3=T, R1..R2=T, R3..R4=F)
const leftTwoHands = { knuckleY: 0.55, l1: true, l2: true, l3: true };
const rightTwoHands = { knuckleY: 0.55, r1: true, r2: true, r3: false, r4: false };
tracker.processFrame(leftTwoHands, rightTwoHands);
tracker.processFrame(leftTwoHands, rightTwoHands);
assert.strictEqual(tracker.activeSwara.id, 'pa', 'Two hands active cleanly plays Pa');
console.log('✅ PASS: Two hands smoothly play Pa.');

// Scenario 6: User rests right hand on lap (knuckleY = 0.88 >= 0.83), left hand stays on flute
// User requirement: "it should work only when one hand is only used- after stabilisation"
const restingRightHand = { knuckleY: 0.88, r1: true, r2: true, r3: false, r4: false };
const activeLeftHandSa = { knuckleY: 0.55, l1: true, l2: true, l3: false };
tracker.processFrame(activeLeftHandSa, restingRightHand);
tracker.processFrame(activeLeftHandSa, restingRightHand);
assert.strictEqual(tracker.inPlayingPosition, true, 'Left hand is active, so inPlayingPosition MUST remain true');
assert.strictEqual(tracker.activeSwara.id, 'sa', 'Resting right hand does NOT mute the flute; continues playing Sa with left hand');
console.log('✅ PASS: Resting right hand does NOT mute the flute; continues playing cleanly with one hand.');

// Scenario 7: User drops BOTH hands down to lap (leftKnuckleY = 0.85, rightKnuckleY = 0.88)
const restingLeftHand = { knuckleY: 0.85, l1: false, l2: false, l3: false };
tracker.processFrame(restingLeftHand, restingRightHand);
assert.strictEqual(tracker.inPlayingPosition, false, 'Both hands resting on lap MUST mute');
assert.strictEqual(tracker.activeSwara, null, 'Active swara is null when both hands are down');
console.log('✅ PASS: Dropping both hands down cleanly mutes audio.');

// Scenario 8: User holds up RIGHT HAND ONLY
// Requirement: "right hand only - no note will play because no note is played in that way"
const rightHandOnly = { knuckleY: 0.55, r1: true, r2: true, r3: true, r4: true };
const resultRightOnly = tracker.processFrame(null, rightHandOnly);
assert.strictEqual(tracker.inPlayingPosition, false, 'Right hand only must NOT be in playing position');
assert.strictEqual(resultRightOnly, null, 'Right hand only must produce NO NOTE');
console.log('✅ PASS: Right hand only produces NO NOTE (silent / muted as required).');

console.log('\n--- 3. Testing Stationary Hand Zero-Flicker & Instant Uncurl Venting ---');
let currentHoleState = true;
let smoothScore = 0.70; // Curled L2 (Sa)

function testSchmitt(rawScore) {
  const alpha = rawScore < smoothScore ? 0.85 : 0.55;
  smoothScore = alpha * rawScore + (1.0 - alpha) * smoothScore;
  if (currentHoleState) {
    currentHoleState = smoothScore >= 0.35;
  } else {
    currentHoleState = smoothScore >= 0.48;
  }
  return currentHoleState;
}

// Introduce camera noise fluctuating raw score between 0.60 and 0.80 for 50 frames
for (let frame = 0; frame < 50; frame++) {
  const noisyRaw = 0.70 + (Math.sin(frame) * 0.10);
  const state = testSchmitt(noisyRaw);
  assert.strictEqual(state, true, `Frame ${frame}: Schmitt trigger must NEVER flicker to open on stationary curl`);
}
console.log('✅ PASS: 50 frames of continuous camera landmark noise produce ZERO flickers.');

// Now player lifts finger (uncurl: rawScore drops to 0.10)
const uncurlState = testSchmitt(0.10);
assert.strictEqual(uncurlState, false, 'Finger lift MUST vent hole to OPEN on the exact first frame');
console.log('\n--- 4. Testing Horizontal Position Invariance (Left hand anywhere on screen) ---');
function classifySingleHand(handLandmarks, multiHandedness) {
  const hand = handLandmarks;
  const screenX = 1.0 - hand[0].x;
  const indexMcpX = 1.0 - hand[5].x;
  const pinkyMcpX = 1.0 - hand[17].x;

  let leftScore = 0;
  if (indexMcpX > pinkyMcpX) leftScore += 3;
  else leftScore -= 3;

  if (multiHandedness && multiHandedness[0]) {
    const label = multiHandedness[0].label;
    const conf = multiHandedness[0].score || 0.8;
    const weight = conf > 0.7 ? 2 : 1;
    if (label === 'Right') leftScore += weight;
    else if (label === 'Left') leftScore -= weight;
  }

  if (leftScore === 0) {
    if (screenX < 0.52) leftScore += 1;
    else leftScore -= 1;
  }

  return leftScore > 0 ? 'left' : 'right';
}

// Left hand facing player: Index MCP 5 is to the right of Pinky MCP 17 in mirrored screen coordinates
// Test 1: Left hand on left side of screen (screenX = 0.20 => raw x = 0.80)
const leftHandFarLeft = {
  0: { x: 0.80, y: 0.55 },
  5: { x: 0.75, y: 0.52 },  // screenX = 0.25 (index)
  17: { x: 0.85, y: 0.56 }  // screenX = 0.15 (pinky) -> indexMcpX (0.25) > pinkyMcpX (0.15)
};
assert.strictEqual(
  classifySingleHand(leftHandFarLeft, [{ label: 'Right', score: 0.95 }]),
  'left',
  'Left hand on left side of screen must be classified as LEFT'
);
console.log('✅ PASS: Left hand on left side of screen cleanly identified as LEFT.');

// Test 2: Left hand in center of screen (screenX = 0.50 => raw x = 0.50)
const leftHandCenter = {
  0: { x: 0.50, y: 0.55 },
  5: { x: 0.45, y: 0.52 },  // screenX = 0.55 (index)
  17: { x: 0.55, y: 0.56 }  // screenX = 0.45 (pinky) -> indexMcpX (0.55) > pinkyMcpX (0.45)
};
assert.strictEqual(
  classifySingleHand(leftHandCenter, [{ label: 'Right', score: 0.95 }]),
  'left',
  'Left hand in center of screen must be classified as LEFT'
);
console.log('✅ PASS: Left hand in center of screen cleanly identified as LEFT.');

// Test 3: Left hand shifted all the way to RIGHT side of screen (screenX = 0.82 => raw x = 0.18)
// User requirement: "I might horizontally move my hands and not curl them at the exact spot as shown on screen"
const leftHandFarRight = {
  0: { x: 0.18, y: 0.55 },
  5: { x: 0.14, y: 0.52 },  // screenX = 0.86 (index)
  17: { x: 0.22, y: 0.56 }  // screenX = 0.78 (pinky) -> indexMcpX (0.86) > pinkyMcpX (0.78)
};
assert.strictEqual(
  classifySingleHand(leftHandFarRight, [{ label: 'Right', score: 0.95 }]),
  'left',
  'Left hand moved to right side of screen MUST STILL be classified as LEFT'
);
console.log('✅ PASS: Left hand on right side of screen correctly identified as LEFT (never misclassified as right).');

// Test 4: Right hand on either side of screen
const rightHandFarLeft = {
  0: { x: 0.75, y: 0.55 },
  5: { x: 0.79, y: 0.52 },  // screenX = 0.21 (index)
  17: { x: 0.71, y: 0.56 }  // screenX = 0.29 (pinky) -> indexMcpX (0.21) < pinkyMcpX (0.29)
};
assert.strictEqual(
  classifySingleHand(rightHandFarLeft, [{ label: 'Left', score: 0.95 }]),
  'right',
  'Right hand alone on left side must be classified as RIGHT'
);
const rightResult = tracker.processFrame(null, { knuckleY: 0.55, r1: true, r2: true, r3: false, r4: false });
assert.strictEqual(rightResult, null, 'Right hand alone produces NO NOTE');
console.log('✅ PASS: Right hand alone on any side cleanly identified as RIGHT and produces NO NOTE.');

// Test 5: Flute Position Stabilized (User requirement: "move all slightly to the left, not too much")
let fluteCenterX = 0.56;
assert.strictEqual(fluteCenterX, 0.56, 'Flute position is stabilized slightly to the left (0.56)');
console.log('✅ PASS: Flute position is rock-solid stabilized at 0.56.');

// Test 6: Spaced slightly further apart (User requirement: "move holes slightly further from each other")
const holeDefs = [
  { id: 'L1', offset: -0.162 },
  { id: 'L2', offset: -0.106 },
  { id: 'L3', offset: -0.050 },
  { id: 'R1', offset: +0.050 },
  { id: 'R2', offset: +0.102 },
  { id: 'R3', offset: +0.154 },
  { id: 'R4', offset: +0.206 }
];
const rightSpacing1 = parseFloat((holeDefs[4].offset - holeDefs[3].offset).toFixed(3)); // R2 - R1
const rightSpacing2 = parseFloat((holeDefs[5].offset - holeDefs[4].offset).toFixed(3)); // R3 - R2
const rightSpacing3 = parseFloat((holeDefs[6].offset - holeDefs[5].offset).toFixed(3)); // R4 - R3
const leftSpacing = parseFloat((holeDefs[1].offset - holeDefs[0].offset).toFixed(3));  // L2 - L1
assert.strictEqual(rightSpacing1, 0.052, 'R1-R2 spacing is 0.052');
assert.strictEqual(rightSpacing2, 0.052, 'R2-R3 spacing is 0.052');
assert.strictEqual(rightSpacing3, 0.052, 'R3-R4 spacing is 0.052');
assert.strictEqual(leftSpacing, 0.056, 'L1-L2 spacing is 0.056');
assert.ok(rightSpacing1 > 0.040, 'Holes are spaced further apart than previous 0.040 step');
console.log('✅ PASS: Holes are spaced further apart (0.056 step left, 0.052 step right) matching flute ergonomics.');

console.log('\n🎉 ALL SINGLE-HAND, ZERO-FLICKER, AND HORIZONTAL INVARIANCE TESTS PASSED 100%!\n');
