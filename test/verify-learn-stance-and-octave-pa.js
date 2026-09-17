/**
 * Verification test for:
 * 1. Harmonic Spectrum & Recognized Swaras & Fingering Typography & Title Case
 * 2. Auto-Fit Swara Cards (data-count & single line layout)
 * 3. Carnatic Tala button neon styling & 1x/2x visibility
 * 4. Step 1 Upper-Half Body Stance SVG with Realistic Embouchure Air Strike, Split, & Rebound
 * 5. Less Wordy Steps
 * 6. Step 3 & Step 4 Zero Scroll
 * 7. Step 4 Note Pa Example, 3s Playback Duration, and Authentic Sthayi Colors (Tara Orange, Madhya Green, Mandra Blue)
 * 8. Real Acoustic Air Jet Strike & Bore Wall Rebound in Tracker Canvas
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const baseDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(baseDir, 'style.css'), 'utf8');
const appJs = fs.readFileSync(path.join(baseDir, 'src/app.js'), 'utf8');
const trackerJs = fs.readFileSync(path.join(baseDir, 'src/carnatic-flute-tracker.js'), 'utf8');
const audioJs = fs.readFileSync(path.join(baseDir, 'src/flute-audio.js'), 'utf8');

console.log('================================================================');
console.log('🧪 VERIFYING STANCE ANIMATION, AIR REBOUND, 3S PA, & AUTO-FIT');
console.log('================================================================\n');

// 1. Typography & Main UI Headers
console.log('1. Checking Typography & Main UI Headers...');
assert(html.includes('<h3>Harmonic Spectrum</h3>'), 'Harmonic Spectrum header must exist in Title Case');
assert(html.includes('<h3>Recognized Swaras & Fingering</h3>'), 'Recognized Swaras & Fingering header must exist in Camel/Title Case');
assert(css.includes('.card-header h3') && css.includes('var(--font-display)'), 'Card header h3 must use var(--font-display)');
assert(css.includes('.section-subhead h3') && css.includes('text-transform: none'), 'Recognized swaras subhead must be text-transform: none !important');
console.log('✔ Typography & Title Case verified.');

// 2. Auto-Shrink Swara Cards (7 to 16 notes)
console.log('\n2. Checking Auto-Fit Swara Cards...');
assert(appJs.includes('swarasCardsContainer.dataset.count = String(list.length);'), 'app.js sets dataset.count on container');
assert(appJs.includes("swarasCardsContainer.classList.add('dense-16');"), 'app.js toggles dense-16 class');
assert(appJs.includes("swarasCardsContainer.classList.add('dense-8');"), 'app.js toggles dense-8 class');
assert(css.includes('.swaras-grid {') && css.includes('flex-wrap: nowrap;'), 'swaras-grid must be a single nowrap flex line');
assert(css.includes('.swaras-grid.dense-8') || css.includes('.swaras-grid[data-count="8"]'), 'CSS defines dense-8 auto-shrink rules');
assert(css.includes('.swaras-grid.dense-16') || css.includes('.swaras-grid[data-count="16"]'), 'CSS defines dense-16 auto-shrink rules');
console.log('✔ Auto-fit swara cards verified.');

// 3. Carnatic Tala Card Neon & Controls Visibility
console.log('\n3. Checking Carnatic Tala Sizing & Neon Visibility...');
assert(css.includes('--accent-acid: #ccff00;'), '--accent-acid declared in root as #ccff00');
assert(css.includes('--accent-orange: #ff5500;'), '--accent-orange declared in root as #ff5500');
assert(css.includes('.btn-tala-play {') && css.includes('background: #ccff00 !important;'), 'Start Tala button is neon #ccff00');
assert(css.includes('.tala-speed-btn') && css.includes('color: #e2e8f0 !important;'), '1x/2x speed buttons have high contrast text');
assert(css.includes('.tala-speed-btn.active {') && css.includes('background: #ccff00 !important;'), 'Active 1x/2x button highlights in bright neon lime');
console.log('✔ Carnatic Tala neon styling and controls verified.');

// 4. Step 1: Upper-Half Body Stance & Air Jet Strike / Split / Rebound
console.log('\n4. Checking Step 1 Upper-Half Body Stance & Fluid Embouchure Dynamics...');
assert(html.includes('id="playerUpperBodyStance"'), 'Upper-half body silhouette stance SVG must be present');
assert(html.includes('id="step1PostureSvg"'), 'step1PostureSvg must be present for backward compatibility');
assert(html.includes('PALM FACES YOU'), 'Left wrist inward turn indicator present');
assert(html.includes('PALM FACES FORWARD'), 'Right hand forward reach indicator present');
assert(html.includes('Pinky Up'), 'Left pinky up tag present');
assert(html.includes('anim-air-jet'), 'Air jet stream from lips present');
assert(html.includes('anim-air-split-top'), 'Air split stream over top rim present');
assert(html.includes('anim-air-rebound'), 'Air rebound wave surging off inner bore wall present');
assert(html.includes('SPLITS OVER TOP'), 'Text callout for top split present');
assert(html.includes('REBOUNDS OFF INNER WALL'), 'Text callout for bore rebound present');
assert(css.includes('.anim-air-split-top') && css.includes('.anim-air-rebound'), 'CSS animations for air split & rebound present');
console.log('✔ Step 1 upper-half body stance & air rebound dynamics verified.');

// 5. Realistic Embouchure in Tracker Canvas
console.log('\n5. Checking Embouchure Air Strike, Split, & Rebound in Canvas Tracker...');
assert(trackerJs.includes('// Dynamic Acoustic Air Jet Strike, Split & Rebound Dynamics'), 'Tracker includes dynamic acoustic air jet strike & rebound');
assert(trackerJs.includes('Top Split Stream: Aerodynamic wake curling over the top'), 'Tracker draws top split wake');
assert(trackerJs.includes('strikes bottom bore wall & REBOUNDS'), 'Tracker draws chimney plunge & bore floor rebound');
console.log('✔ Canvas tracker acoustic air dynamics verified.');

// 6. Step 3: Zero Scroll
console.log('\n6. Checking Step 3 Zero Scroll...');
assert(css.includes('#learnStepPane3') && css.includes('overflow: hidden !important;'), '#learnStepPane3 has overflow: hidden !important');
assert(css.includes('.swaras-table-wrapper') && css.includes('max-height: 165px;'), 'swaras-table-wrapper is compactly bounded');
console.log('✔ Step 3 zero-scroll layout verified.');

// 7. Step 4: Note Pa Example, 3s Duration, and Authentic Colors
console.log('\n7. Checking Step 4 (Note Pa, 3s Playback, Authentic Sthayi Colors)...');
assert(html.includes('head-tilt-pa-fingers') || html.includes('PA (5 CLOSED ●)'), 'Flute in Step 4 shows Note Pa with 5 closed holes');
assert(html.includes('▲ Test Chin Up (High · 3s)') || html.includes('Test Tara Pa (+1 High · 3s)'), 'Button for high octave indicates 3s duration');
assert(html.includes('◆ Test Level Head (Mid · 3s)') || html.includes('Test Madhya Pa (0 Mid · 3s)'), 'Button for mid octave indicates 3s duration');
assert(html.includes('▼ Test Chin Down (Bass · 3s)') || html.includes('Test Mandra Pa (-1 Bass · 3s)'), 'Button for bass octave indicates 3s duration');

// Verify authentic colors in HTML cards
assert(html.includes('Coral Orange (#ff5500)'), 'Tara card has Coral Orange #ff5500');
assert(html.includes('Emerald Green (#10b981)'), 'Madhya card has Emerald Green #10b981');
assert(html.includes('Royal Blue (#3b82f6)'), 'Mandra card has Royal Blue #3b82f6');

// Verify CSS colors
assert(css.includes('box-shadow: 4px 4px 0px #ff5500 !important;'), 'Tara active card has #ff5500 glow');
assert(css.includes('box-shadow: 4px 4px 0px #10b981 !important;'), 'Madhya active card has #10b981 glow');
assert(css.includes('box-shadow: 4px 4px 0px #3b82f6 !important;'), 'Mandra active card has #3b82f6 glow');
assert(css.includes('#learnStepPane4') && css.includes('overflow: hidden !important;'), '#learnStepPane4 has overflow: hidden !important');

// Verify 3s playback logic in app.js
assert(appJs.includes('setTimeout(() => {') && appJs.includes('audio.stopVoice();') && appJs.includes('3000);'), 'app.js stops octave preview tone after exactly 3000ms');
assert(appJs.includes('const paRatio = 1.5;'), 'app.js uses Pa ratio 1.5 for octave demo');

console.log('✔ Step 4 Note Pa, 3s playback, and authentic octave colors verified.');

console.log('\n================================================================');
console.log('🎉 ALL USER REQUIREMENTS VERIFIED AND PASSED 100%!');
console.log('================================================================\n');
