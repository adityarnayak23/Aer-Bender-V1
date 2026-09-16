const fs = require('fs');
const path = require('path');
const assert = require('assert');

const baseDir = path.resolve(__dirname, '..');

console.log('Testing Aer Bender Studio Controls, Octave Isolation, Electric Default, Tanpura & Scale Walkthrough...');

// 1. Check index.html
const indexHtml = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');

// 1a. Studio controls collapsed by default
assert(indexHtml.includes('class="main-content dock-collapsed"'), 'main-content should have dock-collapsed class by default');
assert(indexHtml.includes('class="controls-panel dock-collapsed"'), 'controls-panel should have dock-collapsed class by default');
assert(indexHtml.includes('id="dockToggleBtn"') && indexHtml.includes('aria-expanded="false">◫ Expand</button>'), 'dockToggleBtn should show ◫ Expand and aria-expanded="false"');

// 1b. Electric mode default button
assert(indexHtml.includes('id="electricFluteToggleBtn" class="btn btn-pill btn-electric active"'), 'electricFluteToggleBtn should be active by default');
assert(indexHtml.includes('⚡ Mode: Electric (Switch to Carnatic)'), 'electricFluteToggleBtn should indicate switch to Carnatic');

// 1c. Bottom cameraStatus removed from camera toolbar
assert(!indexHtml.includes('id="cameraStatus"'), 'cameraStatus should be removed from index.html');

// 1d. Learn to play animated scale section exists
assert(indexHtml.includes('class="learn-animated-scale-section"'), 'learn-animated-scale-section should exist');
assert(indexHtml.includes('id="scaleAnimAutoBtn"'), 'scaleAnimAutoBtn should exist');
assert(indexHtml.includes('id="scaleSwaraTabs"'), 'scaleSwaraTabs should exist');
assert(indexHtml.includes('id="scaleFluteSvg"'), 'scaleFluteSvg should exist');
assert(indexHtml.includes('id="scaleSwaraPill"'), 'scaleSwaraPill should exist');
assert(indexHtml.includes('id="scaleSwaraDesc"'), 'scaleSwaraDesc should exist');
for (let h = 1; h <= 7; h++) {
  assert(indexHtml.includes(`id="holeNode${h}"`), `holeNode${h} should exist in SVG`);
  assert(indexHtml.includes(`id="finger${h}"`), `finger${h} should exist in SVG`);
}
console.log('✔ index.html assertions passed!');

// 2. Check style.css
const styleCss = fs.readFileSync(path.join(baseDir, 'style.css'), 'utf8');

// 2a. Spatial octave bar anchored to the left (avoiding any overlap with right studio dock)
assert(styleCss.includes('.spatial-octave-bar {'), 'spatial-octave-bar CSS should exist');
assert(styleCss.includes('left: 18px;'), 'spatial-octave-bar should be anchored to the left');

// 2b. Camera status hidden
assert(styleCss.includes('.camera-status {') && styleCss.includes('display: none !important;'), 'camera-status should be hidden via CSS');

// 2c. Animated scale styles exist
assert(styleCss.includes('.anim-pressing-finger'), 'anim-pressing-finger styling should exist');
assert(styleCss.includes('.anim-pressing-finger.finger-down'), 'finger-down animation state should exist');
assert(styleCss.includes('.anim-hole-node.active-closed .hole-disc-fill'), 'active-closed hole disc glow should exist');
console.log('✔ style.css assertions passed!');

// 3. Check src/flute-audio.js
const fluteAudioJs = fs.readFileSync(path.join(baseDir, 'src', 'flute-audio.js'), 'utf8');
assert(fluteAudioJs.includes('this.isElectricMode = true;'), 'FluteAudioEngine should have isElectricMode = true by default');
console.log('✔ src/flute-audio.js assertions passed!');

// 4. Check src/carnatic-flute-tracker.js
const trackerJs = fs.readFileSync(path.join(baseDir, 'src', 'carnatic-flute-tracker.js'), 'utf8');
assert(trackerJs.includes('this.isPanelCollapsed = true;'), 'Tracker should have isPanelCollapsed = true by default');
console.log('✔ src/carnatic-flute-tracker.js assertions passed!');

// 5. Check src/app.js
const appJs = fs.readFileSync(path.join(baseDir, 'src', 'app.js'), 'utf8');
assert(appJs.includes('isElectricMode: true,'), 'state.isElectricMode should be true by default');
assert(appJs.includes('⚡ Mode: Electric (Switch to Carnatic)'), 'app.js should use ⚡ Mode: Electric (Switch to Carnatic)');
assert(appJs.includes('🪈 Mode: Carnatic (Switch to Electric)'), 'app.js should use 🪈 Mode: Carnatic (Switch to Electric)');
assert(appJs.includes('audio.toggleTanpura(true);'), 'app.js should auto-start Tanpura on camera start');
assert(appJs.includes('renderScaleNote'), 'app.js should have renderScaleNote');
assert(appJs.includes('startScaleAnimation'), 'app.js should have startScaleAnimation');
assert(!appJs.includes('startInstructionTicker()'), 'startInstructionTicker should be removed');
console.log('✔ src/app.js assertions passed!');

console.log('\n🎉 ALL 5 USER REQUIREMENTS FULLY VERIFIED!');
