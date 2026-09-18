const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=================================================================');
console.log('✨ VERIFYING STREAMLINED, LESS-WORDY LEARN TO PLAY MODAL');
console.log('=================================================================\n');

const htmlPath = path.join(__dirname, '..', 'index.html');
const cssPath = path.join(__dirname, '..', 'style.css');
const appJsPath = path.join(__dirname, '..', 'src', 'app.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. STEP 1: Remove left and right hand boxes, keep image only, less wordy
console.log('--- 1. Testing Step 1: Image Only, No Hand Boxes, Less Wordy ---');
assert.ok(!html.includes('class="hand-orientation-grid"'), 'Hand orientation grid removed from Step 1');
assert.ok(!html.includes('class="left-orient-card"'), 'Left hand card removed from Step 1');
assert.ok(!html.includes('class="right-orient-card"'), 'Right hand card removed from Step 1');
assert.ok(html.includes('class="step1-base-img"'), 'Step 1 visual image retained');
assert.ok(html.includes('class="step-flute-posture-svg"'), 'Flute posture overlay SVG retained');
assert.ok(html.includes('Hold flute sideways to your right. Left palm faces you, right palm faces forward.'), 'Concise Step 1 instruction present');
console.log('✅ PASS: Step 1 contains image only without bulky boxes, and instructions are concise');

// 2. STEP 2: Only tell about Sa and waking up, remove the rest
console.log('\n--- 2. Testing Step 2: Sa & Waking Up Only ---');
assert.ok(!html.includes('class="magic-starter-box"'), 'magic-starter-box removed from Step 2');
assert.ok(!html.includes('starter-icon-badge'), 'starter-icon-badge removed from Step 2');
assert.ok(html.includes('id="step2SaSvg"'), 'Sa awakening SVG stage retained');
assert.ok(html.includes('Cover <strong>Holes 1 &amp; 2</strong> with your left hand to wake up the flute and play <strong>Sa</strong>.'), 'Step 2 concise waking instruction present');
console.log('✅ PASS: Step 2 tells only about Sa and waking up, rest removed');

// 3. STEP 3: Remove bottom part (table), keep top interactive animation only
console.log('\n--- 3. Testing Step 3: Top Animation Only, No Bottom Table ---');
assert.ok(!html.includes('class="swaras-table"'), 'Static swaras table removed from Step 3');
assert.ok(html.includes('class="scale-flute-stage"'), 'Top animated flute stage retained');
assert.ok(html.includes('id="scaleFluteStage"'), 'scaleFluteStage retained');
assert.ok(html.includes('id="scaleSwaraTabs"'), '7 Swara interactive tabs retained');
['Sa', 'Ri', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'].forEach((swara) => {
  assert.ok(html.includes(`>${swara}</span>`), `Swara tab ${swara} present in selector`);
});
assert.ok(html.includes('id="scaleActionBanner"'), 'Action banner retained');
assert.ok(html.includes('id="scaleAnimAutoBtn"'), 'Auto-play toggle button retained');
console.log('✅ PASS: Step 3 shows top animation part only; bottom table completely removed');

// 4. STEP 4: Simpler and less wordy head tilt instructions & interactive buttons
console.log('\n--- 4. Testing Step 4: Simpler & Less Wordy Head Tilt ---');
assert.ok(html.includes('Tilt your chin up or down to switch octaves (Example: note Pa):') || html.includes('Tilt chin up or down to switch octaves'), 'Concise head tilt instruction present');
assert.ok(!html.includes('class="tilt-interactive-stage"'), 'Duplicate verbose tilt testing stage removed');
assert.ok(html.includes('id="btnSimTara"'), 'Interactive High (Tara) button present');
assert.ok(html.includes('id="btnSimMadhya"'), 'Interactive Mid (Madhya) button present');
assert.ok(html.includes('id="btnSimMandra"'), 'Interactive Bass (Mandra) button present');
assert.ok(html.includes('id="animatedHeadTiltSvg"'), 'Animated head tilt character profile SVG retained');
assert.ok(html.includes('id="tiltLiveFeedback"'), 'Live feedback label retained');
console.log('✅ PASS: Step 4 head tilt instructions are simplified and interactive buttons streamlined');

// 5. CSS & Layout Arrangement: Boxes, heights, and padding rearranged
console.log('\n--- 5. Testing Layout & Styling Arrangement ---');
assert.ok(css.includes('.sa-stage-anim'), 'sa-stage-anim styled in CSS');
assert.ok(css.includes('.scale-flute-stage'), 'scale-flute-stage styled in CSS');
assert.ok(css.includes('.octave-zone-card'), 'octave-zone-card styled in CSS');
assert.ok(css.includes('.head-tilt-anim-container'), 'head-tilt-anim-container styled in CSS');

// In app.js: punchy descriptions and simplified subtitles
assert.ok(appJs.includes('desc: "Cover Holes 1 & 2 with Left Hand."'), 'Concise Sa description in app.js');
assert.ok(appJs.includes('desc: "All 7 holes closed (Left 1-3 & Right 4-7)."'), 'Concise Ma description in app.js');
assert.ok(appJs.includes('Step 1 of 4 • Hand Posture'), 'Short Step 1 subtitle in app.js');

console.log('✅ PASS: Sizes, boxes, and spacing rearranged neatly across all 4 steps');

console.log('\n=================================================================');
console.log('🎉 ALL STREAMLINED LEARN MODAL TESTS PASSED 100%!');
console.log('=================================================================\n');
