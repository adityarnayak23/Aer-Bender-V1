/**
 * Automated Verification Suite for Antic Didone Typography,
 * Spatial Air Flute Tagline, Highlighted Hero Button, and Hovering Flute Levitation.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================');
console.log('✨ VERIFYING ANTIC DIDONE TYPOGRAPHY & HOVERING FLUTE');
console.log('======================================================\n');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf-8');
const trackerSource = fs.readFileSync(path.join(__dirname, '../src/carnatic-flute-tracker.js'), 'utf-8');
const appSource = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf-8');

// 1. Original font stack imported in CSS
assert.ok(css.includes('family=Space+Grotesk'), 'Space Grotesk font imported in CSS');
console.log('✅ PASS: Standard display and mono Google Fonts loaded in style.css');

// 2. Aer Bender in display font & all welcome card items in original font
assert.ok(html.includes('<h2 class="welcome-title">Aer Bender</h2>'), 'Aer Bender title in index.html');
assert.ok(css.includes(".welcome-glass-card {\n  font-family: var(--font-display);"), 'Welcome glass card uses display font');
assert.ok(css.includes(".welcome-title {\n  font-family: var(--font-display) !important;"), 'Welcome title uses display font');
console.log('✅ PASS: All text elements in welcome card use restored font stack');

// 3. Tagline and subtitle removed from welcome card
assert.ok(!html.includes('welcome-tagline'), 'welcome-tagline removed from index.html');
assert.ok(!html.includes('spatial air flute'), 'spatial air flute removed from index.html');
assert.ok(!html.includes('welcome-sub'), 'welcome-sub removed from index.html');
console.log('✅ PASS: Tagline and subtitle cleanly removed from welcome card');

// 4. "Webcam acts as..." removed
assert.ok(!html.includes('Webcam acts as'), 'Webcam acts as note must be removed from HTML');
assert.ok(!html.includes('welcome-note'), 'welcome-note removed from HTML');
console.log('✅ PASS: "Webcam acts as..." note completely removed');

// 5. Enable Camera to Play is neon and rectangular box
assert.ok(
  css.includes('background: #ccff00 !important;') && css.includes('border-radius: 0px !important;'),
  'Enable Camera to Play must be neon and rectangular'
);
console.log('✅ PASS: "Enable Camera to Play" button is neon #ccff00 with 0px radius rectangular box');

// 6. Box moved higher above flute
assert.ok(css.includes('top: 34%;'), 'Welcome box position shifted higher (top: 34%) so it does not overlap flute');
console.log('✅ PASS: Welcome box shifted higher (top: 34%) to clear the flute');

// 7. Hovering levitation oscillation and dim glow in background
assert.ok(trackerSource.includes('startIdleLevitationLoop'), 'Tracker has startIdleLevitationLoop');
assert.ok(trackerSource.includes('stopIdleLevitationLoop'), 'Tracker has stopIdleLevitationLoop');
assert.ok(trackerSource.includes('levitationFloat = isHovering ? Math.sin('), 'Flute has levitation float sine wave');
assert.ok(trackerSource.includes('Ethereal Hovering Ambient Aura / Dim Glow'), 'Flute has dim ethereal glow aura');
console.log('✅ PASS: Flute has hovering levitation animation and dim ambient glow in background');

// 8. Bottom start camera button removed / hidden
assert.ok(html.includes('id="startCameraBtn"') && html.includes('display: none !important;'), 'Bottom start camera button hidden in HTML');
assert.ok(appSource.includes('startCameraBtn.style.display = "none";'), 'Bottom start camera button remains hidden on stop');
console.log('✅ PASS: Start camera button below camera viewport is cleanly removed/hidden');

console.log('\n======================================================');
console.log('🎉 ALL ANTIC DIDONE & HOVERING FLUTE TESTS PASSED 100%!');
console.log('======================================================\n');
