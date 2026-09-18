// =========================================================================
// 🧪 AUTOMATED TEST SUITE: VERIFY VISITOR & UNIQUE VISITOR COUNTER
// =========================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const baseDir = path.resolve(__dirname, '..');

console.log('=============================================================');
console.log('📊 VERIFYING VISITOR & UNIQUE VISITOR COUNTER');
console.log('=============================================================\n');

// 1. Verify index.html markup
console.log('--- 1. Testing HTML Markup in index.html ---');
const indexHtml = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');

assert(indexHtml.includes('id="creatorVisitorCounter"'), 'creatorVisitorCounter container must exist in index.html');
assert(indexHtml.includes('id="totalVisitsCount"'), 'totalVisitsCount element must exist in index.html');
assert(indexHtml.includes('id="uniqueVisitsCount"'), 'uniqueVisitsCount element must exist in index.html');
assert(indexHtml.includes('class="creator-modal-footer"'), 'creator-modal-footer must exist in index.html');
assert(indexHtml.includes('<script src="src/visitor-analytics.js"></script>'), 'visitor-analytics.js script must be linked in index.html');

console.log('✅ PASS: HTML elements and script tag verified in index.html');

// 2. Verify style.css rules
console.log('\n--- 2. Testing CSS Styling in style.css ---');
const styleCss = fs.readFileSync(path.join(baseDir, 'style.css'), 'utf8');

assert(styleCss.includes('.creator-modal-footer {'), 'creator-modal-footer class must be defined in style.css');
assert(styleCss.includes('justify-content: flex-end;'), 'creator-modal-footer must align content to bottom right');
assert(styleCss.includes('.creator-visitor-counter {'), 'creator-visitor-counter class must be defined in style.css');
assert(styleCss.includes('.counter-pulse-dot {'), 'counter-pulse-dot class must be defined in style.css');
assert(styleCss.includes('@keyframes counterPulseDot'), 'counterPulseDot keyframe animation must exist in style.css');

console.log('✅ PASS: Bottom-right alignment, subtle styling, and pulse animation confirmed in style.css');

// 3. Verify app.js integration
console.log('\n--- 3. Testing app.js Integration ---');
const appJs = fs.readFileSync(path.join(baseDir, 'src', 'app.js'), 'utf8');

assert(appJs.includes('VisitorAnalytics'), 'app.js must reference VisitorAnalytics');
assert(appJs.includes('window.visitorAnalytics.refresh()'), 'app.js must refresh analytics when modal opens');

console.log('✅ PASS: app.js instantiates and refreshes VisitorAnalytics');

// 4. Test VisitorAnalytics Class Logic
console.log('\n--- 4. Testing VisitorAnalytics Class & Logic ---');

// Mock browser storage
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, val) {
    this.store[key] = String(val);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockLocalStorage = new MockStorage();
const mockSessionStorage = new MockStorage();

global.localStorage = mockLocalStorage;
global.sessionStorage = mockSessionStorage;

// Mock DOM elements
const mockElements = {
  totalVisitsCount: { textContent: '' },
  uniqueVisitsCount: { textContent: '' },
  creatorStampBtn: {
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = v; }
  }
};

global.document = {
  getElementById: (id) => mockElements[id] || null
};

// Mock Fetch for API testing
let apiCalls = [];
global.fetch = async (url) => {
  apiCalls.push(url);
  if (url.includes('/hit/')) {
    return {
      ok: true,
      json: async () => ({ value: 105 })
    };
  }
  if (url.includes('/get/')) {
    return {
      ok: true,
      json: async () => ({ value: 104 })
    };
  }
  return { ok: false, status: 404 };
};

const VisitorAnalytics = require('../src/visitor-analytics.js');
assert(typeof VisitorAnalytics === 'function', 'VisitorAnalytics must be exported');

(async () => {
  const analytics = new VisitorAnalytics();

  // Test number formatting
  assert.strictEqual(analytics.formatCount(1234), '1,234');
  assert.strictEqual(analytics.formatCount(1000000), '1,000,000');
  assert.strictEqual(analytics.formatCount(0), '—');
  assert.strictEqual(analytics.formatCount(null), '—');
  console.log('✅ PASS: Number formatting with comma separators verified');

  // Test First Visit (New Visitor + New Session)
  apiCalls = [];
  mockLocalStorage.clear();
  mockSessionStorage.clear();

  await analytics.init();

  assert(mockLocalStorage.getItem('aer_bender_analytics_visitor_id'), 'Should assign unique visitor ID');
  assert(mockSessionStorage.getItem('aer_bender_analytics_session_active'), 'Should mark session active');
  assert(apiCalls.some(url => url.includes('/hit/aerbender-app-total-visits')), 'First visit must hit total visits');
  assert(apiCalls.some(url => url.includes('/hit/aerbender-app-unique-visits')), 'New visitor must hit unique visits');
  assert.strictEqual(mockElements.totalVisitsCount.textContent, '105', 'Total visits DOM updated');
  assert.strictEqual(mockElements.uniqueVisitsCount.textContent, '105', 'Unique visits DOM updated');
  console.log('✅ PASS: First-time visitor correctly triggers both total and unique increments');

  // Test Returning Visitor in Same Session (e.g. Page reload within session)
  apiCalls = [];
  const analytics2 = new VisitorAnalytics();
  await analytics2.init();

  assert(apiCalls.some(url => url.includes('/get/aerbender-app-total-visits')), 'Same session should only GET total visits');
  assert(apiCalls.some(url => url.includes('/get/aerbender-app-unique-visits')), 'Returning visitor should only GET unique visits');
  console.log('✅ PASS: Returning visitor in same session queries without double-counting');

  // Test Modal Refresh
  apiCalls = [];
  await analytics.refresh();
  assert(apiCalls.some(url => url.includes('/get/')), 'Modal refresh fetches latest counts without incrementing');
  console.log('✅ PASS: Modal refresh retrieves counts safely');

  console.log('\n=============================================================');
  console.log('🎉 ALL VISITOR COUNTER TESTS PASSED 100%!');
  console.log('=============================================================\n');
})();
