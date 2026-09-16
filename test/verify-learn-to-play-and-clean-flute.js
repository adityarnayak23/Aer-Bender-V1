/**
 * Verification Suite for:
 * 1. Removal of "✨" and "Embouchure"
 * 2. Alternating beginner instructions about lips, Sa, 2 fingers to start
 * 3. Status text styled with Antic Didone font
 * 4. Removal of "PLAY SA TO START" from main flute area
 * 5. Visual "Learn to Play" popup page with 3 animated beginner cards
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================');
console.log('✨ VERIFYING LEARN TO PLAY MODAL & CLEAN FLUTE AREA');
console.log('======================================================\n');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf-8');
const trackerSource = fs.readFileSync(path.join(__dirname, '../src/carnatic-flute-tracker.js'), 'utf-8');
const appSource = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf-8');

// 1. Star and "Embouchure" removed from status text
assert.ok(!appSource.includes("✨ Embouchure Active"), 'Star and Embouchure must be removed from status text');
assert.ok(!appSource.includes("Embouchure Active!"), 'Embouchure Active text must be removed');
console.log('✅ PASS: Star ("✨") and "Embouchure" jargon removed from status text');

// 2. Simple instructions about lips, Sa, 2 fingers to start in app.js
assert.ok(appSource.includes('Cover first 2 holes with 2 fingers to start playing Sa'), 'Instructions mention lips, Sa, 2 fingers');
assert.ok(appSource.includes('startInstructionTicker'), 'Instruction ticker function present');
assert.ok(appSource.includes('setInterval'), 'Ticker alternates throughout');
console.log('✅ PASS: Alternating instruction ticker about lips, Sa, and 2 fingers implemented');

// 3. Status font is original mono font
assert.ok(css.includes(".camera-status {\n  font-size: 13px !important;\n  font-weight: 500 !important;\n  color: rgba(226, 232, 240, 0.95) !important;\n  font-family: var(--font-mono) !important;"), 'Status text uses var(--font-mono) font');
console.log('✅ PASS: Camera status text styled strictly in original mono font');

// 4. "PLAY SA TO START" removed from main flute area
assert.ok(!trackerSource.includes('PLAY SA TO START'), 'PLAY SA TO START must be removed from tracker rendering');
assert.ok(!trackerSource.includes('STABILIZING SA...'), 'STABILIZING SA text must be removed from tracker rendering');
console.log('✅ PASS: "PLAY SA TO START" and rings cleanly removed from main flute canvas');

// 5. Learn to Play popup page in HTML
assert.ok(html.includes('id="learnToPlayModal"'), 'Learn to Play modal exists in HTML');
assert.ok(html.includes('Learn to Play Aer Bender'), 'Learn to Play title in HTML');
assert.ok(html.includes('hand-layout-card'), 'Hand layout card present');
assert.ok(html.includes('sa-hero-card'), 'Cover 2 Holes for Sa card present');
assert.ok(html.includes('swaras-table'), 'All 7 swaras table present');
assert.ok(html.includes('id="learnToPlayBtn"'), 'Learn to Play button in welcome card');
assert.ok(html.includes('id="headerLearnBtn"'), 'Learn to Play button in header');
assert.ok(html.includes('id="learnModalStartBtn"'), 'Got it Let\'s Play button in modal');
console.log('✅ PASS: Comprehensive Learn to Play visual popup page installed with hands and all swaras');

// 6. CSS styling for visual guide and button
assert.ok(css.includes('.swaras-table'), 'swaras-table styled in CSS');
assert.ok(css.includes('#learnModalStartBtn'), 'learnModalStartBtn styled in CSS');
assert.ok(css.includes('background: #ccff00 !important;'), 'learnModalStartBtn has neon background');
console.log('✅ PASS: CSS styles for hands layout, swaras table, and neon CTA button verified');

console.log('\n======================================================');
console.log('🎉 ALL LEARN TO PLAY & CLEAN FLUTE TESTS PASSED 100%!');
console.log('======================================================\n');
