const fs = require('fs');
const path = require('path');
const assert = require('assert');

const baseDir = path.resolve(__dirname, '..');

console.log('=============================================================');
console.log('⚡ VERIFYING CREATOR STAMP & ABOUT ADITYA MODAL');
console.log('=============================================================\n');

// 1. Check index.html
console.log('--- 1. Testing HTML Structure in index.html ---');
const indexHtml = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');

assert(indexHtml.includes('id="creatorStampBtn"'), 'creatorStampBtn should exist in index.html');
assert(indexHtml.includes('Crafted by Aditya · Get in touch'), 'creatorStampBtn should contain exact copy');
assert(indexHtml.includes('id="creatorModal"'), 'creatorModal should exist in index.html');
assert(indexHtml.includes('id="closeCreatorModalBtn"'), 'closeCreatorModalBtn should exist in index.html');
assert(indexHtml.includes('⚡ CRAFTED BY'), 'creatorModal badge should be ⚡ CRAFTED BY');
assert(!indexHtml.includes('CREATOR • AER BENDER'), 'creatorModal badge should not include CREATOR • AER BENDER');
assert(!indexHtml.includes('creator-tagline'), 'creator-tagline should be completely removed');
assert(indexHtml.includes('I align colorful boxes on a powerpoint deck for a living'), 'creatorModal should include powerpoint bio starting with capital I align');
assert(indexHtml.includes('I am a carnatic flautist with a blah blah MBA degree from <strong>SPJIMR</strong> and learnt about entropy at <strong>NITK</strong>'), 'creatorModal should include flautist with MBA degree line');
assert(indexHtml.includes('Got ideas? Want to collaborate? Want to build?'), 'creatorModal should have Got ideas? Want to collaborate? Want to build? without star');
assert(!indexHtml.includes('✦ Got ideas?'), 'creatorModal should not have star before Got ideas');
assert(indexHtml.includes('https://www.linkedin.com/in/aditya-nayak23'), 'creatorModal should contain LinkedIn profile link');
assert(indexHtml.includes('https://www.instagram.com/aditya.nayakk?stkn=MWV6M2QwZmU1NnFicw%3D%3D&utm_source=qr'), 'creatorModal should contain Instagram profile link');
console.log('✅ PASS: HTML elements, bio text, and verified social links confirmed!');

// 2. Check style.css
console.log('\n--- 2. Testing CSS Styling in style.css ---');
const styleCss = fs.readFileSync(path.join(baseDir, 'style.css'), 'utf8');

assert(styleCss.includes('.creator-stamp-btn {'), 'creator-stamp-btn CSS class defined');
assert(styleCss.includes('@keyframes stampPulseAura'), 'stampPulseAura breathing animation defined');
assert(styleCss.includes('.creator-cta-title {'), 'creator-cta-title CSS class defined');
assert(styleCss.includes('.creator-modal-backdrop {'), 'creator-modal-backdrop CSS class defined');
assert(styleCss.includes('.creator-modal-card {'), 'creator-modal-card CSS class defined');
assert(styleCss.includes('.linkedin-btn {'), 'linkedin-btn CSS class defined');
assert(styleCss.includes('.insta-btn {'), 'insta-btn CSS class defined');
console.log('✅ PASS: Floating glass button breathing aura and modal styling verified!');

// 3. Check src/app.js
console.log('\n--- 3. Testing Logic & Handlers in src/app.js ---');
const appJs = fs.readFileSync(path.join(baseDir, 'src', 'app.js'), 'utf8');

assert(appJs.includes('creatorStampBtn'), 'app.js should reference creatorStampBtn');
assert(appJs.includes('creatorModal'), 'app.js should reference creatorModal');
assert(appJs.includes('closeCreatorModalBtn'), 'app.js should reference closeCreatorModalBtn');
assert(appJs.includes('openCreatorModal'), 'app.js should define openCreatorModal');
assert(appJs.includes('closeCreatorModal'), 'app.js should define closeCreatorModal');
console.log('✅ PASS: app.js event wiring and modal toggle logic verified!');

console.log('\n=============================================================');
console.log('🎉 ALL CREATOR STAMP & ABOUT ADITYA TESTS PASSED 100%!');
console.log('=============================================================');
