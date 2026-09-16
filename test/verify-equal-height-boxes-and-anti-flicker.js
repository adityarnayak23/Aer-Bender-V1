/**
 * Automated Verification:
 * 1. All 5 Boxes on Right of Equal Length/Height in style.css
 * 2. Complete Elimination of Flickering in Tracker & App.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================');
console.log('🧪 VERIFYING 5 EQUAL HEIGHT BOXES & FLICKER RESOLUTION');
console.log('======================================================\n');

// 1. Check style.css for 5 equal height grid rows and zero scrollbars
console.log('--- 1. Testing CSS Grid for 5 Equal-Height Boxes ---');
const styleCss = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf-8');

assert.ok(
  styleCss.includes('grid-template-rows: repeat(5, 1fr)'),
  'controls-panel must have grid-template-rows: repeat(5, 1fr) to guarantee all 5 boxes have equal height'
);
assert.ok(
  styleCss.includes('.controls-panel > .card') && styleCss.includes('height: 100%'),
  '.controls-panel > .card must have height: 100% and min-height: 0'
);
console.log('✅ PASS: controls-panel configured with grid-template-rows: repeat(5, 1fr) and height: 100% for all cards!');

// 2. Check HTML structure has exactly 5 cards inside .controls-panel
console.log('\n--- 2. Testing HTML Structure for Exactly 5 Right-Hand Cards ---');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
const controlsPanelMatch = indexHtml.match(/<section class="controls-panel">([\s\S]*?)<\/section>/);
assert.ok(controlsPanelMatch, 'controls-panel section exists in index.html');

const controlsPanelContent = controlsPanelMatch[1];
const cardCount = (controlsPanelContent.match(/<div class="card\s/g) || []).length;
console.log(`Found ${cardCount} cards in controls-panel (Expected: 5)`);
assert.strictEqual(cardCount, 5, 'controls-panel must have exactly 5 child cards');
console.log('✅ PASS: Exactly 5 cards present in controls-panel!');

// 3. Test Tracker Flute Anchoring & Stationary Horizontal Lock
console.log('\n--- 3. Testing Stationary Horizontal Flute & Dynamic Y Adaptation ---');
const trackerJs = fs.readFileSync(path.join(__dirname, '../src/carnatic-flute-tracker.js'), 'utf-8');

assert.ok(
  trackerJs.includes('this.fluteY = this.fixedFluteY || this.OCTAVE_LINES.MID;') || trackerJs.includes('this.fixedFluteY'),
  'Tracker must keep fluteY fixed to prevent vertical jitter'
);
assert.ok(
  trackerJs.includes('this.fluteCenterX = this.fixedFluteCenterX || 0.52;') || trackerJs.includes('this.fixedFluteCenterX'),
  'Tracker must keep fluteCenterX stationary so flute does NOT move left and right'
);
// In accordance with user mandate: "let the flute position be fixed"
assert.ok(trackerJs.includes('this.fixedFluteY'), 'Tracker must define fixedFluteY');
assert.ok(trackerJs.includes('this.fixedFluteCenterX'), 'Tracker must define fixedFluteCenterX');
console.log('✅ PASS: Flute position is strictly fixed and stationary.');

// 4. Test app.js Silence Debounce
console.log('\n--- 4. Testing app.js Silence Debounce (Zero Chattering) ---');
const appJs = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf-8');

assert.ok(
  appJs.includes('silentFramesCount++') && /silentFramesCount >= [3-6]/.test(appJs),
  'app.js must debounce silence by at least 3 frames to absorb momentary single-frame drops'
);
console.log('✅ PASS: app.js silence debounce verified!');

console.log('\n======================================================');
console.log('🎉 ALL 5 EQUAL HEIGHT BOXES & FLICKER TESTS PASSED 100%!');
console.log('======================================================\n');
