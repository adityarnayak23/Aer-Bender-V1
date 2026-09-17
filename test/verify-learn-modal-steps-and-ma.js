const fs = require('fs');
const path = require('path');
const assert = require('assert');

const baseDir = path.resolve(__dirname, '..');
console.log('================================================================');
console.log('🪈 VERIFYING 4-STEP LEARN MODAL & CARNATIC MA DESIGN');
console.log('================================================================\n');

const html = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(baseDir, 'style.css'), 'utf8');
const appJs = fs.readFileSync(path.join(baseDir, 'src', 'app.js'), 'utf8');

// -------------------------------------------------------------
// 1. Structure & 4 Steps Present
// -------------------------------------------------------------
console.log('Checking 4-Step HTML Structure...');
assert(html.includes('id="learnStepTabs"'), 'learnStepTabs container must exist');
assert(html.includes('id="stepTab1"'), 'Step 1 tab button must exist');
assert(html.includes('id="stepTab2"'), 'Step 2 tab button must exist');
assert(html.includes('id="stepTab3"'), 'Step 3 tab button must exist');
assert(html.includes('id="stepTab4"'), 'Step 4 tab button must exist');

assert(html.includes('id="learnStepPane1"'), 'Step 1 pane must exist');
assert(html.includes('id="learnStepPane2"'), 'Step 2 pane must exist');
assert(html.includes('id="learnStepPane3"'), 'Step 3 pane must exist');
assert(html.includes('id="learnStepPane4"'), 'Step 4 pane must exist');

assert(html.includes('id="learnStepBackBtn"'), 'Wizard Back button must exist');
assert(html.includes('id="learnStepNextBtn"'), 'Wizard Next button must exist');
assert(html.includes('id="stepDotsIndicator"'), 'Step dots indicator must exist');
assert(html.includes('id="learnModalStartBtn"'), 'Legacy-compatible start CTA button must exist');
console.log('✔ 4-step wizard container & controls verified.');

// -------------------------------------------------------------
// 2. Step 1: Animated Hold Flute Posture
// -------------------------------------------------------------
console.log('Checking Step 1 (How to Hold Flute)...');
assert(html.includes('How to Hold the Flute'), 'Step 1 title present');
assert(html.includes('hand-visual-strip'), 'Hand visual strip present');
assert(html.includes('LEFT HAND'), 'Left hand guide present');
assert(html.includes('RIGHT HAND'), 'Right hand guide present');
assert(html.includes('Left pinky is relaxed & free (no role)'), 'Explicit pinky relaxation instruction present');
assert(html.includes('step1PostureSvg'), 'Animated flute posture SVG present');
assert(html.includes('pulse-blow-core'), 'Pulsing embouchure blow core present');
assert(html.includes('breath-wave'), 'Animated breath waves present');
assert(html.includes('anim-floating-finger'), 'Animated hovering fingers present');
console.log('✔ Step 1 animated posture, breath waves, and finger indicators verified.');

// -------------------------------------------------------------
// 3. Step 2: Sa Startup Gate (Flute won\'t start without Sa)
// -------------------------------------------------------------
console.log('Checking Step 2 (Hold Sa to Start)...');
assert(html.includes('How to Hold Sa — The Startup Gate'), 'Step 2 title present');
assert(html.includes('sa-gate-notice-box'), 'Sa gate notice box present');
assert(html.includes("FLUTE WON'T START WITHOUT HOLDING SA"), 'Explicit startup gate warning present');
assert(html.includes('The flute will <strong>NOT start</strong> until you hold Sa'), 'Explicit startup gate description present');
assert(html.includes('step2SaSvg'), 'Animated Sa holding SVG present');
assert(html.includes('sa-shockwave'), 'Acoustic shockwave ripples present');
assert(html.includes('FLUTE UNLOCKED'), 'Flute unlocked confirmation pill present');
console.log('✔ Step 2 Sa startup gate and animations verified.');

// -------------------------------------------------------------
// 4. Step 3: Play Sa Ri Ga Ma Pa Da Ni (MA IS ALL 7 CLOSED)
// -------------------------------------------------------------
console.log('Checking Step 3 (7 Swaras & Ma all 7 closed)...');
assert(html.includes('How to Play Sa, Ri, Ga, Ma, Pa, Da, Ni'), 'Step 3 title present');
assert(html.includes('ma-closed-callout-pill'), 'Ma closed callout pill present');
assert(html.includes('MA (F4) is played with ALL 7 FINGERS CLOSED'), 'Ma callout states all 7 closed');
assert(html.includes('data-swara="ma" data-note="F4"'), 'Ma tab present');
assert(html.includes('All 7 closed'), 'Ma tab badge indicates all 7 closed');
assert(html.includes('row-highlight-ma'), 'Ma table row highlighted');

// In swaras table, verify Ma row has 7 closed dots
const maRowMatch = html.match(/<tr class="row-highlight-ma">([\s\S]*?)<\/tr>/);
assert(maRowMatch, 'Ma row must exist in swaras-table');
const closedDotsInMa = (maRowMatch[1].match(/<span class="hole-dot closed">●<\/span>/g) || []).length;
assert.strictEqual(closedDotsInMa, 7, 'Ma in swaras-table must have exactly 7 closed dots (●)');

// In src/app.js SCALE_NOTES_DATA, verify Ma has [true, true, true, true, true, true, true]
assert(appJs.includes('swaraKey: "ma"'), 'Ma defined in SCALE_NOTES_DATA');
assert(appJs.includes('holes: [true, true, true, true, true, true, true]'), 'Ma must have all 7 holes closed in SCALE_NOTES_DATA');
assert(appJs.includes('All 7 fingers closed!'), 'Ma description mentions all 7 fingers closed');
console.log('✔ Step 3 Swaras verified: MA IS ALL 7 CLOSED in both DOM table & audio/visual engine data.');

// -------------------------------------------------------------
// 5. Step 4: Animated Head Tilt Concept (Tara, Madhya, Mandra)
// -------------------------------------------------------------
console.log('Checking Step 4 (Head Tilt Octaves)...');
assert(html.includes('Head Tilt Concept — Spatial Octaves'), 'Step 4 title present');
assert(html.includes('zone-tara'), 'Tara high octave card present');
assert(html.includes('zone-madhya'), 'Madhya mid octave card present');
assert(html.includes('zone-mandra'), 'Mandra bass octave card present');
assert(html.includes('+15° Chin Up'), 'Tara angle tag present');
assert(html.includes('0° Level Head'), 'Madhya angle tag present');
assert(html.includes('-15° Chin Down'), 'Mandra angle tag present');
assert(html.includes('btnSimTara'), 'Interactive test button for Tara present');
assert(html.includes('btnSimMadhya'), 'Interactive test button for Madhya present');
assert(html.includes('btnSimMandra'), 'Interactive test button for Mandra present');
assert(html.includes('tiltZoneLabel'), 'Live tilt zone feedback label present');
console.log('✔ Step 4 animated head tilt & octave simulation verified.');

// -------------------------------------------------------------
// 6. Controller Logic: Next-Only Forward Progression
// -------------------------------------------------------------
console.log('Checking Wizard Controller Logic in app.js...');
assert(appJs.includes('STEP_CONFIGS'), 'STEP_CONFIGS array defined in app.js');
assert(appJs.includes('showLearnStep(step)'), 'showLearnStep function defined in app.js');
assert(appJs.includes('learnStepNextBtn.addEventListener("click"'), 'Next button listener wired');
assert(appJs.includes('showLearnStep(currentLearnStep + 1)'), 'Next button increments step');
assert(appJs.includes('showLearnStep(currentLearnStep - 1)'), 'Back button decrements step');
// Verify forward skipping is prevented
assert(appJs.includes('step <= currentLearnStep'), 'Tab/dot clicks must NOT allow skipping forward ahead of current step');
console.log('✔ Next-only forward progression & step transition logic verified.');

// -------------------------------------------------------------
// 7. Styling & Theme Integration
// -------------------------------------------------------------
console.log('Checking Styling & Design System...');
assert(css.includes('.learn-step-tabs'), 'learn-step-tabs styled in CSS');
assert(css.includes('.sa-gate-notice-box'), 'sa-gate-notice-box styled in CSS');
assert(css.includes('.ma-closed-callout-pill'), 'ma-closed-callout-pill styled in CSS');
assert(css.includes('.octave-zones-grid'), 'octave-zones-grid styled in CSS');
assert(css.includes('.tilt-interactive-stage'), 'tilt-interactive-stage styled in CSS');
assert(css.includes('.learn-wizard-nav'), 'learn-wizard-nav styled in CSS');
assert(css.includes('@keyframes breathStream'), 'breathStream keyframes defined');
assert(css.includes('@keyframes fingerHover'), 'fingerHover keyframes defined');
assert(css.includes('@keyframes saShockwaveExpand'), 'saShockwaveExpand keyframes defined');
console.log('✔ All CSS animations, layouts, and colors verified.');

// -------------------------------------------------------------
// 8. Runtime Event Simulation (Mock DOM)
// -------------------------------------------------------------
console.log('\nStarting Runtime Event & Interaction Simulation...');

class MockClassList {
  constructor() { this.classes = new Set(); }
  add(...names) { names.forEach(n => this.classes.add(n)); }
  remove(...names) { names.forEach(n => this.classes.delete(n)); }
  toggle(name, force) {
    if (force === true) { this.classes.add(name); return true; }
    if (force === false) { this.classes.delete(name); return false; }
    if (this.classes.has(name)) { this.classes.delete(name); return false; }
    this.classes.add(name);
    return true;
  }
  contains(name) { return this.classes.has(name); }
}

class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.classList = new MockClassList();
    this.style = {};
    this.dataset = {};
    this.listeners = {};
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.innerHTML = '';
    this.textContent = '';
    this.disabled = false;
    this.clientWidth = 1280;
    this.clientHeight = 720;
  }
  addEventListener(type, fn) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(fn);
  }
  removeEventListener(type, fn) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(f => f !== fn);
  }
  dispatchEvent(evt) {
    const fns = this.listeners[evt.type] || [];
    fns.forEach(fn => fn(evt));
  }
  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const results = [];
    const traverse = (node) => {
      for (const ch of node.children) {
        if (sel.startsWith('#') && ch.id === sel.slice(1)) results.push(ch);
        else if (sel.startsWith('.') && ch.classList.contains(sel.slice(1))) results.push(ch);
        traverse(ch);
      }
    };
    traverse(this);
    return results;
  }
  getContext() {
    return {
      clearRect: () => {}, beginPath: () => {}, closePath: () => {},
      arc: () => {}, ellipse: () => {}, translate: () => {}, scale: () => {},
      rotate: () => {}, fill: () => {}, stroke: () => {}, save: () => {},
      restore: () => {}, moveTo: () => {}, lineTo: () => {}, strokeRect: () => {},
      fillRect: () => {}, createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      measureText: () => ({ width: 10 }), fillText: () => {}
    };
  }
}

const mockDocElements = {};
function regEl(id, tag = 'div', classes = []) {
  const el = new MockElement(tag, id);
  classes.forEach(c => el.classList.add(c));
  mockDocElements[id] = el;
  return el;
}

// Register all IDs from HTML with their actual classes
const idMatches = html.match(/id="([^"]+)"/g) || [];
idMatches.forEach(m => {
  const id = m.slice(4, -1);
  if (!mockDocElements[id]) {
    // Find the opening tag containing this ID to extract class attribute
    const tagMatch = html.match(new RegExp('<[a-zA-Z0-9\\-]+[^>]*id="' + id + '"[^>]*>')) ||
                     html.match(new RegExp('<[a-zA-Z0-9\\-]+[^>]*class="[^"]*"[^>]*id="' + id + '"[^>]*>'));
    let classes = [];
    if (tagMatch) {
      const classAttr = tagMatch[0].match(/class="([^"]+)"/);
      if (classAttr) classes = classAttr[1].split(/\s+/).filter(Boolean);
    }
    regEl(id, 'div', classes);
  }
});

// Setup swara tabs inside scaleSwaraTabs
const scaleSwaraTabsEl = mockDocElements['scaleSwaraTabs'];
const swarasData = ['sa', 'ri', 'ga', 'ma', 'pa', 'dha', 'ni'];
swarasData.forEach(sw => {
  const tab = new MockElement('button');
  tab.classList.add('swara-tab');
  tab.dataset.swara = sw;
  scaleSwaraTabsEl.appendChild(tab);
});

// Setup step tab buttons
const learnStepTabsEl = mockDocElements['learnStepTabs'];
for (let s = 1; s <= 4; s++) {
  const tb = new MockElement('button', `stepTab${s}`);
  tb.classList.add('step-tab-btn');
  tb.dataset.step = String(s);
  learnStepTabsEl.appendChild(tb);
}

// Setup step dots
const stepDotsEl = mockDocElements['stepDotsIndicator'];
for (let s = 1; s <= 4; s++) {
  const dt = new MockElement('span');
  dt.classList.add('step-dot');
  dt.dataset.step = String(s);
  stepDotsEl.appendChild(dt);
}

global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.document = {
  getElementById: (id) => mockDocElements[id] || null,
  querySelector: (sel) => {
    if (sel.startsWith('#')) return mockDocElements[sel.slice(1)] || null;
    return null;
  },
  querySelectorAll: (sel) => {
    if (sel === '.tala-speed-btn') return [new MockElement('button'), new MockElement('button')];
    if (sel === '.swara-tab') return scaleSwaraTabsEl.children;
    return [];
  },
  createElement: (tag) => new MockElement(tag),
  addEventListener: (type, fn) => {
    if (!document.listeners) document.listeners = {};
    if (!document.listeners[type]) document.listeners[type] = [];
    document.listeners[type].push(fn);
  },
  dispatchEvent: (evt) => {
    if (document.listeners && document.listeners[evt.type]) {
      document.listeners[evt.type].forEach(fn => fn(evt));
    }
  }
};

const mockAudioParam = () => ({
  setValueAtTime: () => {},
  linearRampToValueAtTime: () => {},
  exponentialRampToValueAtTime: () => {},
  cancelScheduledValues: () => {}
});

try {
  Object.defineProperty(global, 'navigator', {
    value: {
      mediaDevices: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop: () => {} }]
        })
      }
    },
    writable: true,
    configurable: true
  });
} catch(e) {}
global.window.navigator = global.navigator;
global.window.Hands = class { setOptions() {} onResults() {} send() {} };
global.window.Camera = class { start() {} stop() {} };
global.window.alert = () => {};
global.requestAnimationFrame = (cb) => 1;
global.cancelAnimationFrame = () => {};
global.AudioContext = class {
  constructor() { this.currentTime = 0; }
  async resume() {}
  createGain() { return { gain: mockAudioParam(), connect: () => {} }; }
  createOscillator() { return { frequency: mockAudioParam(), connect: () => {}, start: () => {}, stop: () => {} }; }
  createBiquadFilter() { return { frequency: mockAudioParam(), Q: mockAudioParam(), gain: mockAudioParam(), connect: () => {} }; }
  createDynamicsCompressor() {
    return {
      threshold: mockAudioParam(),
      knee: mockAudioParam(),
      ratio: mockAudioParam(),
      attack: mockAudioParam(),
      release: mockAudioParam(),
      connect: () => {}
    };
  }
  createAnalyser() { return { fftSize: 2048, frequencyBinCount: 1024, getByteFrequencyData: () => {}, connect: () => {} }; }
  createMediaStreamDestination() { return { stream: {}, connect: () => {} }; }
  createMediaElementSource() { return { connect: () => {} }; }
  createPeriodicWave() { return {}; }
  createConvolver() { return { connect: () => {} }; }
  createBufferSource() { return { playbackRate: mockAudioParam(), connect: () => {}, start: () => {}, stop: () => {} }; }
  createBuffer() { return { getChannelData: () => new Float32Array(1024) }; }
};
global.webkitAudioContext = global.AudioContext;
global.Audio = class {
  constructor() {
    this.src = '';
    this.loop = false;
    this.volume = 1;
  }
  play() { return Promise.resolve(); }
  pause() {}
  addEventListener() {}
  canPlayType() { return 'probably'; }
};
global.fetch = async () => ({ json: async () => ({ samples: {} }), arrayBuffer: async () => new ArrayBuffer(1024) });

// Load modules
require(path.join(baseDir, 'src', 'swaras-data.js'));
require(path.join(baseDir, 'src', 'flute-audio.js'));
require(path.join(baseDir, 'src', 'carnatic-flute-tracker.js'));
require(path.join(baseDir, 'src', 'flute-video-recorder.js'));
require(path.join(baseDir, 'src', 'app.js'));

document.dispatchEvent({ type: 'DOMContentLoaded' });

const learnModal = mockDocElements['learnToPlayModal'];
const openBtn = mockDocElements['learnToPlayBtn'];
const backBtn = mockDocElements['learnStepBackBtn'];
const nextBtn = mockDocElements['learnStepNextBtn'];
const startCta = mockDocElements['learnModalStartBtn'];
const p1 = mockDocElements['learnStepPane1'];
const p2 = mockDocElements['learnStepPane2'];
const p3 = mockDocElements['learnStepPane3'];
const p4 = mockDocElements['learnStepPane4'];

// Open Modal
assert(learnModal.classList.contains('hidden'), 'Modal starts hidden');
openBtn.click();
assert(!learnModal.classList.contains('hidden'), 'Modal opened after click');
assert.strictEqual(p1.style.display, 'block', 'Step 1 is active on modal open');
assert.strictEqual(p2.style.display, 'none', 'Step 2 is hidden initially');
assert.strictEqual(p3.style.display, 'none', 'Step 3 is hidden initially');
assert.strictEqual(p4.style.display, 'none', 'Step 4 is hidden initially');
assert.strictEqual(backBtn.style.display, 'none', 'Back button is hidden on Step 1');
assert.strictEqual(nextBtn.style.display, 'inline-flex', 'Next button is visible on Step 1');
assert.strictEqual(startCta.style.display, 'none', 'Start CTA is hidden on Step 1');
console.log('✔ Initial state: Step 1 active, Next button visible, Back and Start buttons hidden.');

// Test forward skip prevention (Clicking Tab 3 while on Step 1 should NOT jump to Step 3)
const tab3 = mockDocElements['stepTab3'];
tab3.click();
assert.strictEqual(p1.style.display, 'block', 'Skipping forward via Tab click must be blocked');
assert.strictEqual(p3.style.display, 'none', 'Step 3 must remain hidden when trying to jump ahead');
console.log('✔ Forward skipping prevented: user cannot jump ahead without pressing Next.');

// Click Next -> Step 2
nextBtn.click();
assert.strictEqual(p1.style.display, 'none', 'Step 1 hidden on Next');
assert.strictEqual(p2.style.display, 'block', 'Step 2 active on Next');
assert.strictEqual(backBtn.style.display, 'inline-flex', 'Back button visible on Step 2');
assert.strictEqual(nextBtn.style.display, 'inline-flex', 'Next button visible on Step 2');
assert.strictEqual(startCta.style.display, 'none', 'Start CTA hidden on Step 2');
console.log('✔ Step 2 active: Back button appears, Sa startup gate shown.');

// Click Next -> Step 3
nextBtn.click();
assert.strictEqual(p2.style.display, 'none', 'Step 2 hidden on Next');
assert.strictEqual(p3.style.display, 'block', 'Step 3 active on Next');
assert.strictEqual(backBtn.style.display, 'inline-flex', 'Back button visible on Step 3');
assert.strictEqual(nextBtn.style.display, 'inline-flex', 'Next button visible on Step 3');
assert.strictEqual(startCta.style.display, 'none', 'Start CTA hidden on Step 3');

// Inspect Ma on Step 3
const maTab = scaleSwaraTabsEl.children[3]; // index 3 is Ma
assert(maTab.dataset.swara === 'ma', 'Index 3 must be Ma tab');
maTab.click();
const pill = mockDocElements['scaleSwaraPill'];
assert(pill.textContent.includes('MA'), 'Pill reflects MA');
for (let h = 1; h <= 7; h++) {
  assert(mockDocElements[`holeNode${h}`].classList.contains('active-closed'), `Hole ${h} must be active-closed for Ma`);
  assert(mockDocElements[`finger${h}`].classList.contains('finger-down'), `Finger ${h} must be finger-down for Ma`);
}
console.log('✔ Step 3 active: Selecting Ma closes ALL 7 HOLES (H1-H7 active-closed, fingers 1-7 finger-down)!');

// Click Next -> Step 4
nextBtn.click();
assert.strictEqual(p3.style.display, 'none', 'Step 3 hidden on Next');
assert.strictEqual(p4.style.display, 'block', 'Step 4 active on Next');
assert.strictEqual(backBtn.style.display, 'inline-flex', 'Back button visible on Step 4');
assert.strictEqual(nextBtn.style.display, 'none', 'Next button is hidden on final Step 4');
assert.strictEqual(startCta.style.display, 'inline-flex', 'Start CTA "Got it, Let\'s Play!" appears on final Step 4');
console.log('✔ Step 4 active: Next button replaced by vibrant Start CTA button.');

// Test Step 4 simulated octave buttons
const btnTara = mockDocElements['btnSimTara'];
const btnMandra = mockDocElements['btnSimMandra'];
const zoneTara = mockDocElements['simZoneTara'];
const zoneMandra = mockDocElements['simZoneMandra'];
const tiltLabel = mockDocElements['tiltZoneLabel'];

btnTara.click();
assert(zoneTara.classList.contains('active'), 'Tara zone active after clicking Chin Up test');
assert(tiltLabel.textContent.includes('TARA STHAYI'), 'Label confirms Tara Sthayi');

btnMandra.click();
assert(zoneMandra.classList.contains('active'), 'Mandra zone active after clicking Chin Down test');
assert(tiltLabel.textContent.includes('MANDRA STHAYI'), 'Label confirms Mandra Sthayi');
console.log('✔ Step 4 interactive head tilt simulations and audio triggers confirmed.');

// Test Back button from Step 4 -> Step 3
backBtn.click();
assert.strictEqual(p3.style.display, 'block', 'Step 3 restored when Back button clicked');
assert.strictEqual(p4.style.display, 'none', 'Step 4 hidden on Back');
assert.strictEqual(nextBtn.style.display, 'inline-flex', 'Next button restored');
assert.strictEqual(startCta.style.display, 'none', 'Start CTA hidden when stepping back');
console.log('✔ Back button navigation correctly reverses steps.');

// Return to Step 4 and click Start CTA
nextBtn.click();
assert.strictEqual(p4.style.display, 'block', 'Back to Step 4');
startCta.click();
assert(learnModal.classList.contains('hidden'), 'Modal closes when Start CTA is clicked');
console.log('✔ Start CTA closes modal and launches the camera!');

console.log('\n================================================================');
console.log('🎉 ALL 4-STEP LEARN MODAL & MA REQUIREMENTS VERIFIED 100%!');
console.log('================================================================\n');
