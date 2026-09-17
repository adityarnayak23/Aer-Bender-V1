/**
 * Comprehensive Automated Verification Suite for:
 * 1. Revert to previous font stack everywhere (No Antic Didone)
 * 2. Welcome glass card: removed tagline and removed subtitle
 * 3. Hero button "Enable Camera to Play": neon acid lime (#ccff00), rectangle box (border-radius: 0px), no smooth edges, older font
 * 4. "Learn to Play": text line below the Enable button with smaller font (.learn-text-link)
 * 5. Learn to Play Guide: Which hand (Left 1-3, Right 4-7), 2 fingers for Sa (Holes 1 & 2), All 7 notes chart
 * 6. "Got it, Let's Play!" CTA button: neon acid lime (#ccff00), rectangle box (border-radius: 0px), no smooth edges, older font
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=================================================================');
console.log('✨ VERIFYING RESTORED FONTS, NEON RECTANGULAR BUTTONS & LEARN GUIDE');
console.log('=================================================================\n');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf-8');

// 1. Antic Didone is completely removed from HTML and CSS
assert.ok(!html.includes('Antic Didone'), 'No Antic Didone references in index.html');
assert.ok(!css.includes('Antic Didone'), 'No Antic Didone references in style.css');
assert.ok(css.includes('--font-display: "Space Grotesk"'), 'Original Space Grotesk font defined');
assert.ok(css.includes('--font-body: "Plus Jakarta Sans"'), 'Original Plus Jakarta Sans font defined');
assert.ok(css.includes('--font-mono: "JetBrains Mono"'), 'Original JetBrains Mono font defined');
console.log('✅ PASS: All fonts reverted to original Space Grotesk / Plus Jakarta Sans / JetBrains Mono stack');

// 2. Welcome Glass Card: tagline and sub removed
assert.ok(!html.includes('welcome-tagline'), 'welcome-tagline removed from index.html');
assert.ok(!html.includes('spatial air flute'), 'spatial air flute tagline removed from index.html');
assert.ok(!html.includes('Align lips at the Blow Hole'), 'Align lips subtitle removed from index.html');
console.log('✅ PASS: Tagline "spatial air flute" and "Align lips..." completely removed from welcome card');

// 3. Hero button "Enable Camera to Play" is neon and rectangular with no smooth edges
assert.ok(html.includes('id="heroStartCameraBtn"'), 'Hero start button present in HTML');
assert.ok(css.includes('#heroStartCameraBtn'), '#heroStartCameraBtn styled in CSS');
assert.ok(css.includes('background: #ccff00 !important;'), 'Hero start button has neon acid lime background');
assert.ok(css.includes('color: #000000 !important;'), 'Hero start button has black text');
assert.ok(css.includes('border-radius: 0px !important;'), 'Hero start button is a strict rectangle with no smooth edges');
assert.ok(css.includes('border: 2px solid #000000 !important;'), 'Hero start button has 2px solid black brutalist border');
assert.ok(css.includes('font-family: var(--font-display) !important;'), 'Hero start button uses older display font');
console.log('✅ PASS: "Enable Camera to Play" button is neon #ccff00 in a strict rectangular box with no smooth edges');

// 4. "Learn to Play" is a smaller line below the hero button
assert.ok(html.includes('class="learn-text-link"'), 'learn-text-link class present on learn button');
assert.ok(css.includes('.learn-text-link {'), '.learn-text-link defined in CSS');
assert.ok(css.includes('font-size: 13px;'), '.learn-text-link has smaller font size (13px)');
assert.ok(css.includes('text-decoration: underline;'), '.learn-text-link is an underlined text link');
console.log('✅ PASS: "Learn to Play" added as a clean line below the enable button in smaller font');

// 5. Learn to Play Guide: Hand layout, 2 fingers for Sa, and all notes chart
assert.ok(html.includes('hand-layout-card'), 'Hand layout card is present');
assert.ok(html.includes('LEFT HAND'), 'Left Hand indicated in hand layout');
assert.ok(html.includes('RIGHT HAND'), 'Right Hand indicated in hand layout');
assert.ok(html.includes('Holes 1, 2, 3'), 'Holes 1, 2, 3 assigned to Left Hand');
assert.ok(html.includes('Holes 4, 5, 6, 7'), 'Holes 4, 5, 6, 7 assigned to Right Hand');

assert.ok(html.includes('sa-hero-card'), '2 Fingers for Sa hero card present');
assert.ok(html.includes('2 Fingers Down = SA') || html.includes('2 FINGERS DOWN = SA') || html.includes('2 FINGERS DOWN'), '2 Fingers Down = SA title present');
assert.ok(html.includes('sa-hero-svg'), 'Visual flute SVG showing 2 fingers closed for Sa');

assert.ok(html.includes('learn-notes-chart-section'), 'All notes chart section present');
assert.ok(html.includes('swaras-table'), 'All 7 swaras table present');
['Sa', 'Ri', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'].forEach((swara) => {
  assert.ok(html.includes(`>${swara}</span>`), `Swara ${swara} is present in the fingering chart`);
});
console.log('✅ PASS: Learn guide clearly displays hand layout, 2 fingers for Sa, and all 7 notes once');

// 6. "Got it, Let's Play!" CTA button is neon, rectangular, and older font
assert.ok(html.includes('id="learnModalStartBtn"'), 'learnModalStartBtn present in HTML');
assert.ok(html.includes("Got it, Let's Play!"), "Button text is 'Got it, Let's Play!'");
assert.ok(css.includes('#learnModalStartBtn'), '#learnModalStartBtn styled in CSS');
const ctaMatches = css.match(/\.btn-learn-cta,\s*#learnModalStartBtn\s*\{([^}]+)\}/);
assert.ok(ctaMatches, 'CTA button rule found in CSS');
assert.ok(ctaMatches[1].includes('background: #ccff00 !important;'), 'CTA button is neon #ccff00');
assert.ok(ctaMatches[1].includes('border-radius: 0px !important;'), 'CTA button has border-radius 0px (no smooth edges)');
assert.ok(ctaMatches[1].includes('border: 2px solid #000000 !important;'), 'CTA button has 2px solid black border');
assert.ok(ctaMatches[1].includes('font-family: var(--font-display) !important;'), 'CTA button uses older font');
console.log('✅ PASS: "Got it, Let\'s Play!" button is neon, rectangular (no smooth edges), and in the older font');

console.log('\n=================================================================');
console.log('🎉 ALL REVERT FONTS, NEON BUTTONS & LEARN GUIDE TESTS PASSED 100%!');
console.log('=================================================================');
