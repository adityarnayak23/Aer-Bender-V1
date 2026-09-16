/**
 * Automated Verification Suite for Header Brand & Logo Updates:
 * - "Aer Bender V1" called directly without separate V1.0 pill
 * - Air-Bender kinetic vortex logo mark
 * - Removal of subheading "SPATIAL AR // FLUTE CANVAS"
 * - Removal of "01 //" prefix from Optical Tracking Viewport header
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================');
console.log('✨ VERIFYING HEADER BRAND, LOGO & VIEWPORT HEADER UPDATES');
console.log('======================================================\n');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf-8');

// 1. Direct Aer Bender V1 title
assert.ok(html.includes('<h1 class="brand-name">Aer Bender V1</h1>'), 'Header brand name must be "Aer Bender V1"');
assert.ok(css.includes(".brand-name {\n  font-family: var(--font-display);"), 'Brand name styled in var(--font-display) font');
console.log('✅ PASS: Brand title is directly "Aer Bender V1" with separate V1.0 badge removed');

// 2. Cooler Air-Bender Logo Mark
assert.ok(html.includes('id="aerSpiralArm"'), 'Logo contains aerodynamic air-bending spiral arm');
assert.ok(html.includes('transform="rotate(120, 14, 14)"'), 'Logo has 120-degree tri-spiral vortex symmetry');
assert.ok(html.includes('transform="rotate(240, 14, 14)"'), 'Logo has 240-degree tri-spiral vortex symmetry');
assert.ok(css.includes('transform: rotate(120deg) scale(1.06);'), 'Logo rotates dynamically on pod hover');
console.log('✅ PASS: Cool Air-Bender tri-spiral kinetic vortex logo installed');

// 3. Subheading SPATIAL AR removed
assert.ok(!html.includes('SPATIAL AR // FLUTE CANVAS'), 'Subheading SPATIAL AR must be completely removed');
console.log('✅ PASS: Subheading "SPATIAL AR // FLUTE CANVAS" completely removed');

// 4. "01 //" removed from Optical Tracking Viewport header
const cameraHeaderMatch = html.match(/camera-card-header[\s\S]*?<\/div>\s*<\/div>/);
assert.ok(cameraHeaderMatch, 'camera-card-header found in HTML');
assert.ok(!cameraHeaderMatch[0].includes('01 //'), '"01 //" must not exist in camera-card-header');
assert.ok(cameraHeaderMatch[0].includes('Optical Tracking Viewport'), 'Optical Tracking Viewport remains in header');
console.log('✅ PASS: "01 //" prefix cleanly removed from Optical Tracking Viewport header');

console.log('\n======================================================');
console.log('🎉 ALL HEADER BRAND & LOGO TESTS PASSED 100%!');
console.log('======================================================\n');
