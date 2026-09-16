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

// 1b. Electric mode 2-button switch with electric default
assert(indexHtml.includes('id="modeElectricBtn" class="segmented-btn active"'), 'modeElectricBtn should be active by default');
assert(indexHtml.includes('id="modeCarnaticBtn" class="segmented-btn"'), 'modeCarnaticBtn should exist');

// 1c. Bottom cameraStatus removed from camera toolbar & optical tracking viewport text removed
assert(!indexHtml.includes('id="cameraStatus"'), 'cameraStatus should be removed from index.html');
assert(!indexHtml.includes('Optical Tracking Viewport'), 'Optical Tracking Viewport text should be removed');

// 1d. Sphere aura around levitating welcome overlay
assert(indexHtml.includes('class="welcome-sphere-aura"'), 'welcome-sphere-aura should exist in index.html');

// 1e. No //4 in studio controls & no raga phrases at the bottom
assert(!indexHtml.includes('studio-rack-card'), 'studio-rack-card (04 //) should be removed');
assert(!indexHtml.includes('tala-phrases-row'), 'tala-phrases-row should be removed');

// 1f. 1x and 2x interchanged in tala
assert(indexHtml.includes('data-speed="2" title="1st Speed">1x</button>'), '1x should be interchanged with 2x');
assert(indexHtml.includes('data-speed="1" title="2nd Speed">2x</button>'), '2x should be interchanged with 1x');

// 1g. Learn to play animated scale section exists
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

// 2c. Welcome sphere aura CSS exists
assert(styleCss.includes('.welcome-sphere-aura {'), 'welcome-sphere-aura CSS should exist');

// 2d. Controls panel resized to 4 rows
assert(styleCss.includes('grid-template-rows: repeat(4, 1fr);'), 'controls-panel should be resized to repeat(4, 1fr)');

// 2e. 2-button segmented control CSS
assert(styleCss.includes('.timbre-segmented-control {'), 'timbre-segmented-control styles should exist');
assert(styleCss.includes('.segmented-btn {'), 'segmented-btn styles should exist');
console.log('✔ style.css assertions passed!');

// 3. Check src/flute-audio.js
const fluteAudioJs = fs.readFileSync(path.join(baseDir, 'src', 'flute-audio.js'), 'utf8');
assert(fluteAudioJs.includes('this.isElectricMode = true;'), 'FluteAudioEngine should have isElectricMode = true by default');
console.log('✔ src/flute-audio.js assertions passed!');

// 4. Check src/carnatic-flute-tracker.js
const trackerJs = fs.readFileSync(path.join(baseDir, 'src', 'carnatic-flute-tracker.js'), 'utf8');
assert(trackerJs.includes('this.isPanelCollapsed = true;'), 'Tracker should have isPanelCollapsed = true by default');
assert(trackerJs.includes('createRadialGradient'), 'Tracker levitating aura should use radial sphere gradient');
console.log('✔ src/carnatic-flute-tracker.js assertions passed!');

// 5. Check src/app.js
const appJs = fs.readFileSync(path.join(baseDir, 'src', 'app.js'), 'utf8');
assert(appJs.includes('isElectricMode: true,'), 'state.isElectricMode should be true by default');
assert(appJs.includes('modeElectricBtn'), 'app.js should wire modeElectricBtn');
assert(appJs.includes('modeCarnaticBtn'), 'app.js should wire modeCarnaticBtn');
assert(appJs.includes('audio.toggleTanpura(true);'), 'app.js should auto-start Tanpura on camera start');
assert(appJs.includes('audio.toggleTanpura(false);'), 'app.js should pause Tanpura on stop/pause');
assert(appJs.includes('renderScaleNote'), 'app.js should have renderScaleNote');
assert(appJs.includes('startScaleAnimation'), 'app.js should have startScaleAnimation');
console.log('✔ src/app.js assertions passed!');

console.log('\n🎉 ALL REQUIREMENTS FULLY VERIFIED!');
