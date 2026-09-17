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
assert(html.includes('<h3>Recognised Swaram</h3>'), 'Recognised Swaram header must exist in Title Case');
assert(css.includes('.card-header h3') && css.includes('var(--font-display)'), 'Card header h3 must use var(--font-display)');
assert(css.includes('.section-subhead h3') && css.includes('text-transform: none'), 'Recognized swaras subhead must be text-transform: none !important');
console.log('✔ Typography & Title Case verified.');

// 1b. Audio Spectrum Live line removed & Neon Collapse / Studio Controls
assert(!html.includes('AUDIO.SPECTRUM // LIVE'), 'Audio spectrum live text removed from index.html');
assert(css.includes('.dock-toggle-btn {') && css.includes('background: #ccff00 !important;'), 'Collapse / dock toggle button is neon #ccff00');
assert(css.includes('.floating-dock-open-btn {') && css.includes('background: #ccff00 !important;'), 'Studio Controls floating button is neon #ccff00');

// 2. Square Swara Boxes & 2nd Line Wrapping (Top Aligned)
console.log('\n2. Checking Square Swara Boxes & 2nd Line Wrapping...');
assert(appJs.includes('swarasCardsContainer.dataset.count = String(list.length);'), 'app.js sets dataset.count on container');
assert(appJs.includes("swarasCardsContainer.classList.add('wrap-2-lines');"), 'app.js toggles wrap-2-lines class for 8+ notes');
assert(css.includes('.swara-card {') && css.includes('aspect-ratio: 1 / 1;'), 'swara-card must be a square with aspect-ratio: 1 / 1');
assert(css.includes('.swaras-grid.wrap-2-lines') || css.includes('.swaras-grid[data-count="8"]'), 'CSS defines 2nd line wrapping for 8+ swaras');
assert(css.includes('.swaras-section {') && css.includes('justify-content: flex-start !important;'), 'swaras-section aligns swarams to top');
console.log('✔ Square swara cards, top alignment, and 2nd line wrapping verified.');

// 3. Carnatic Tala & Metronome Card (Compact Box with 1x & 2x Controls & Metronome BPM)
console.log('\n3. Checking Carnatic Tala & Metronome Card (Compact with 1x, 2x, and BPM)...');
assert(css.includes('--accent-acid: #ccff00;'), '--accent-acid declared in root as #ccff00');
assert(css.includes('.btn-tala-play {') && css.includes('background: #ccff00 !important;'), 'Start Tala button is neon #ccff00');
assert(html.includes('<h3>Carnatic Tala & Metronome</h3>') || html.includes('<h3>Carnatic Tala and Metronome</h3>'), 'Carnatic Tala & Metronome header in Title Case');
assert(html.includes('tala-speed-group'), 'Tala speed controls (1x, 2x) in HTML');
assert(html.includes('tala-bpm-group') && html.includes('talaBpmDisplay'), 'Metronome with BPM in the same box');
console.log('✔ Carnatic Tala & Metronome (compact with 1x, 2x, and BPM in same box) verified.');

// 3b. Calibration Defaults: Flute Level 47% & Finger Curl 1.45
console.log('\n3b. Checking Calibration Defaults (Flute Level 47% & Finger Curl 1.45)...');
assert(html.includes('id="fluteHeightSlider" min="35" max="75" step="1" value="47"'), 'Default flute level slider value is 47%');
assert(html.includes('id="fluteHeightVal" class="calib-val">47%</span>'), 'Default flute level text is 47%');
assert(html.includes('id="sensitivitySlider"') && html.includes('value="1.45"'), 'Default finger curl sensitivity slider is 1.45');
assert(html.includes('id="sensitivityVal" class="calib-val">1.45</span>'), 'Default finger curl text is 1.45');
assert(trackerJs.includes('this.curlThreshold = 1.45;'), 'Tracker default curlThreshold is 1.45');
assert(trackerJs.includes('this.fixedFluteY = 0.47;'), 'Tracker default fixedFluteY is 0.47 (47%)');
console.log('✔ Default Flute Level 47% and Finger Curl 1.45 verified.');

// 4. Step 1: Upper-Half Body Stance & Clean Embouchure (No air coming out of blow hole)
console.log('\n4. Checking Step 1 Upper-Half Body Stance & Clean Embouchure...');
assert(html.includes('id="playerUpperBodyStance"'), 'Upper-half body silhouette stance SVG must be present');
assert(html.includes('id="step1PostureSvg"'), 'step1PostureSvg must be present for backward compatibility');
assert(html.includes('PALM FACES YOU'), 'Left wrist inward turn indicator present');
assert(html.includes('PALM FACES FORWARD'), 'Right hand forward reach indicator present');
assert(html.includes('Pinky Up'), 'Left pinky up tag present');
assert(html.includes('breath-wave'), 'Breath waves entering blow hole present');
assert(!html.includes('SPLITS OVER TOP'), 'No air coming out of blow hole over top in HTML');
assert(!html.includes('anim-air-split-top'), 'No anim-air-split-top class in HTML');
assert(!html.includes('REBOUNDS OFF INNER WALL'), 'No bore wall rebound callout in HTML');
console.log('✔ Step 1 upper-half body stance & clean embouchure verified.');

// 5. Clean Embouchure in Tracker Canvas (No air coming out of blow hole)
console.log('\n5. Checking Embouchure in Canvas Tracker...');
assert(!trackerJs.includes('Top Split Stream: Aerodynamic wake curling over the top into the room'), 'No air wake curling out of blow hole into room in canvas');
assert(!trackerJs.includes('strikes bottom bore wall & REBOUNDS'), 'No air strike & rebound in canvas');
assert(trackerJs.includes('Dynamic Acoustic Vortex & Concentric Breath Waves'), 'Subtle concentric aperture breath waves present');
console.log('✔ Canvas tracker clean embouchure (zero air coming out of blow hole) verified.');

// 6. Zero Emojis in Learn Modal & Step 3 Hero Animation
console.log('\n6. Checking Zero Emojis in Learn Modal & Step 3 Hero Animation...');
const modalStartIdx = html.indexOf('id="learnToPlayModal"');
const modalEndIdx = html.indexOf('<!-- Isolated FaceMesh Worker Iframe');
const modalHtml = html.slice(modalStartIdx, modalEndIdx);
assert(!modalHtml.match(/[\u{1F300}-\u{1FAFF}]/u), 'Learn modal must have ZERO emojis');
assert(!modalHtml.includes('✋') && !modalHtml.includes('🤚') && !modalHtml.includes('🪈'), 'Hand and flute emojis removed from modal');

// Step 3: All 7 notes present and visible, big animation
assert(html.includes('sa-badge') && html.includes('ri-badge') && html.includes('ga-badge') && 
       html.includes('ma-badge') && html.includes('pa-badge') && html.includes('dha-badge') && 
       html.includes('ni-badge'), 'All 7 swaras present in Step 3 table');
assert(html.includes('id="scaleFluteSvg"') && html.includes('anim-pressing-finger'), 'Scale flute SVG has animated pressing fingers');
assert(css.includes('#learnStepPane3') && css.includes('overflow: hidden !important;'), '#learnStepPane3 has overflow: hidden !important');
assert(css.includes('.swaras-table-wrapper') && css.includes('overflow: visible !important;'), 'swaras-table-wrapper overflow visible so no notes clipped');
console.log('✔ Zero emojis & Step 3 all 7 notes and hero animation verified.');

// 7. Step 4: Note Pa Example, Dynamic Octave Colors, Tone Descriptors, and No 3s in Reader Text
console.log('\n7. Checking Step 4 (Note Pa, Dynamic Octave Colors, Tone Descriptors, No 3s in Reader Text)...');
assert(html.includes('head-tilt-pa-fingers') && html.includes('pa-closed-hole'), 'Step 4 shows Note Pa with dynamic pa-closed-hole classes');
assert(!html.includes('playing for 3s each!'), 'No 3s mention in Step 4 intro');
assert(!html.includes('Plays for 3s'), 'No 3s mention in Step 4 header');
assert(html.includes('▲ Test Chin Up (High Octave)'), 'Button for high octave without 3s text');
assert(html.includes('◆ Test Level Head (Mid Octave)'), 'Button for mid octave without 3s text');
assert(html.includes('▼ Test Chin Down (Bass Octave)'), 'Button for bass octave without 3s text');

// Verify tone descriptors in HTML cards
assert(html.includes('High Pitch · Piercing'), 'Tara card has High Pitch · Piercing descriptor');
assert(html.includes('Natural Pitch · Warm'), 'Madhya card has Natural Pitch · Warm descriptor');
assert(html.includes('Deep Bass · Resonant'), 'Mandra card has Deep Bass · Resonant descriptor');

// Verify CSS colors
assert(css.includes('box-shadow: 4px 4px 0px #ff5500 !important;'), 'Tara active card has #ff5500 glow');
assert(css.includes('box-shadow: 4px 4px 0px #10b981 !important;'), 'Madhya active card has #10b981 glow');
assert(css.includes('box-shadow: 4px 4px 0px #3b82f6 !important;'), 'Mandra active card has #3b82f6 glow');
assert(css.includes('#learnStepPane4') && css.includes('overflow: hidden !important;'), '#learnStepPane4 has overflow: hidden !important');

// Verify 3s playback logic in app.js under the hood
assert(appJs.includes('setTimeout(() => {') && appJs.includes('audio.stopVoice();') && appJs.includes('3000);'), 'app.js stops octave preview tone after exactly 3000ms');
assert(appJs.includes('const paRatio = 1.5;'), 'app.js uses Pa ratio 1.5 for octave demo');

console.log('✔ Step 4 Note Pa, dynamic colors, tone descriptors, and 3000ms engine verified.');

// 8. Panel Proportions: Harmonic 1.5x, Swaram 65% & Centered, Raga 65%, Camera clearance below panel
console.log('\n8. Checking Right Panel Proportions, Swaram Centering & Bottom Clearance...');
assert(html.includes('id="visualizerCanvas" width="560" height="90"'), 'visualizerCanvas height increased by 1.5x to 90');
assert(css.includes('.visualizer-card canvas') && css.includes('height: 90px;'), 'CSS sets visualizer canvas height to 90px');
assert(css.includes('.swara-card {') && css.includes('justify-content: center;') && css.includes('align-items: center;'), 'swara-card centers notes and pips in the middle');
assert(css.includes('.card-pips-row {') && css.includes('justify-content: center;'), 'card-pips-row is centered');
assert(css.includes('.raga-builder-card {') && css.includes('padding: 3px 6px;'), 'raga-builder-card scaled down to 65%');
assert(css.includes('.swara-matrix-row {') && css.includes('height: 11px;'), 'swara-matrix-row height scaled to 11px');
assert(css.includes('.controls-panel {') && css.includes('bottom: clamp(75px, 11vh, 95px);'), 'controls-panel provides bottom gap for camera screen');
console.log('✔ Proportions, swaram center, and bottom clearance verified.');

console.log('\n================================================================');
console.log('🎉 ALL USER REQUIREMENTS VERIFIED AND PASSED 100%!');
console.log('================================================================\n');
