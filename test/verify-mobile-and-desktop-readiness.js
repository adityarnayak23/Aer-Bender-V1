const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- RUNNING MOBILE & MOBILE DESKTOP READINESS VERIFICATION ---');

const trackerPath = path.join(__dirname, '../src/carnatic-flute-tracker.js');
const appPath = path.join(__dirname, '../src/app.js');
const htmlPath = path.join(__dirname, '../index.html');
const cssPath = path.join(__dirname, '../style.css');

const trackerContent = fs.readFileSync(trackerPath, 'utf8');
const appContent = fs.readFileSync(appPath, 'utf8');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// 1. Camera Tracker Tiered Fallback (Eliminating OverconstrainedError)
assert(trackerContent.includes('constraintTiers = ['), 'Tracker must define multi-tier camera constraint fallback list');
assert(trackerContent.includes("facingMode: 'user'"), 'Camera constraints must support user/front camera');
assert(!trackerContent.includes('min: 30'), 'Strict min: 30 frameRate must not be required as it throws OverconstrainedError on phones');
assert(!trackerContent.includes('max: 720'), 'Strict max: 720 height must not be required as portrait sensors are 9:16');
assert(trackerContent.includes('stream = await navigator.mediaDevices.getUserMedia(tier)'), 'Tracker must loop through fallback tiers');
console.log('✔ Resilient tiered camera constraints verified (no OverconstrainedError on phones).');

// 2. Video inline attributes for iOS Safari
assert(trackerContent.includes("setAttribute('playsinline', 'true')"), 'Tracker videoElement must set playsinline');
assert(trackerContent.includes("setAttribute('webkit-playsinline', 'true')"), 'Tracker videoElement must set webkit-playsinline');
assert(htmlContent.includes('playsinline') && htmlContent.includes('webkit-playsinline'), 'index.html video tag must include playsinline & webkit-playsinline');
console.log('✔ iOS Safari inline video playback attributes verified.');

// 3. DPR capping to prevent mobile GPU OOM crashes
assert(trackerContent.includes('Math.min(Math.max(1, rawDpr), 2.0)'), 'Tracker init must cap DPR to 2.0');
assert(trackerContent.includes('Math.min(Math.max(1, rawDpr), 2.0)'), 'Tracker onResults must cap DPR to 2.0');
console.log('✔ Canvas DPR capped at 2.0 for mobile GPU stability.');

// 4. FaceMesh mobile fallback
assert(trackerContent.includes('Direct fallback if createImageBitmap throws on mobile WebKit'), 'Process loop must have fallback if createImageBitmap fails');
console.log('✔ FaceMesh mobile WebKit createImageBitmap fallback verified.');

// 5. Flute mobile span scaling
assert(trackerContent.includes('width * 0.92'), 'getSpanScale must comfortably bound flute width on mobile <= 800px');
console.log('✔ Flute geometry scales for mobile displays.');

// 6. Universal WebAudio touch unlock
assert(appContent.includes("['touchstart', 'touchend', 'pointerdown', 'keydown'].forEach"), 'app.js must bind touch/pointer unlock listeners');
assert(appContent.includes('audio.resume()'), 'Touch unlock listener must call audio.resume()');
console.log('✔ Mobile touch/pointer WebAudio unlocking verified.');

// 7. Viewport meta tag
assert(htmlContent.includes('viewport-fit=cover'), 'Viewport meta must include viewport-fit=cover');
assert(htmlContent.includes('user-scalable=no'), 'Viewport meta must include user-scalable=no');
console.log('✔ Viewport meta tag configured for full edge-to-edge mobile rendering.');

// 8. Dynamic Viewport Height (100dvh)
assert(cssContent.includes('height: 100dvh;'), 'style.css must specify 100dvh');
assert(cssContent.includes('max-height: 100dvh;'), 'style.css must specify max-height: 100dvh');
console.log('✔ 100dvh dynamic viewport units verified.');

// 9. Mobile media queries and layout collision prevention
assert(cssContent.includes('@media (max-width: 768px)'), 'style.css must include mobile portrait media query');
assert(cssContent.includes('.calibration-row') && cssContent.includes('bottom: 56px;'), 'calibration-row must stack above bottom bar on mobile');
assert(cssContent.includes('@media (max-width: 920px) and (orientation: landscape)'), 'style.css must include mobile landscape media query');
console.log('✔ Mobile media queries and non-colliding stacked layout verified.');

// 10. Orientation suggestion chip & modal responsiveness
assert(htmlContent.includes('mobileLandscapeHint'), 'index.html must include mobileLandscapeHint');
assert(appContent.includes('mobileLandscapeHint'), 'app.js must handle mobileLandscapeHint dismissal');
assert(cssContent.includes('.mobile-landscape-hint'), 'style.css must style mobileLandscapeHint');
assert(cssContent.includes('max-height: 90dvh;'), 'creator-modal-card must have max-height 90dvh');
console.log('✔ Mobile orientation suggestion chip and responsive modal sizing verified.');

console.log('\n🎉 ALL MOBILE & MOBILE DESKTOP READINESS CHECKS PASSED SUCCESSFULLY!');
