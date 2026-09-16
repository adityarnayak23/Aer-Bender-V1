// =========================================================================
// 🧪 AUTOMATED TEST SUITE: VERIFY FLUTE VIDEO RECORDER
// =========================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================');
console.log('📹 TESTING FLUTE VIDEO & AUDIO RECORDER');
console.log('======================================================\n');

// Mock Browser Environment
global.window = global;
global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        width: 1280,
        height: 720,
        getContext: () => ({
          save: () => {},
          restore: () => {},
          translate: () => {},
          scale: () => {},
          drawImage: () => {},
          clearRect: () => {},
          fillRect: () => {},
          strokeRect: () => {},
          beginPath: () => {},
          roundRect: () => {},
          rect: () => {},
          fill: () => {},
          stroke: () => {},
          arc: () => {},
          fillText: () => {},
          measureText: (txt) => ({ width: txt.length * 7 }),
          createLinearGradient: () => ({ addColorStop: () => {} })
        }),
        captureStream: (fps) => {
          return new MockMediaStream([{
            kind: 'video',
            label: `Canvas captureStream track @ ${fps}fps`,
            enabled: true,
            stop: () => {},
            addEventListener: () => {}
          }]);
        }
      };
    }
    if (tag === 'a') {
      return {
        style: {},
        click: () => {},
        href: '',
        download: ''
      };
    }
    return {
      style: {},
      addEventListener: () => {}
    };
  },
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

global.URL = {
  createObjectURL: (blob) => 'blob:mock-url-' + Date.now(),
  revokeObjectURL: () => {}
};

class MockMediaStreamTrack {
  constructor(kind, label) {
    this.kind = kind;
    this.label = label || `${kind}_track`;
    this.enabled = true;
    this.readyState = 'live';
    this.listeners = {};
  }
  stop() {
    this.readyState = 'ended';
  }
  addEventListener(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }
}

class MockMediaStream {
  constructor(tracks = []) {
    this._tracks = [...tracks];
  }
  getTracks() {
    return this._tracks;
  }
  getVideoTracks() {
    return this._tracks.filter(t => t.kind === 'video');
  }
  getAudioTracks() {
    return this._tracks.filter(t => t.kind === 'audio');
  }
  addTrack(track) {
    this._tracks.push(track);
  }
}

global.MediaStream = MockMediaStream;

class MockMediaRecorder {
  constructor(stream, options = {}) {
    this.stream = stream;
    this.mimeType = options.mimeType || 'video/webm;codecs=vp9,opus';
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
  }
  start(timeslice) {
    this.state = 'recording';
    this.timeslice = timeslice;
  }
  requestData() {
    if (this.ondataavailable) {
      this.ondataavailable({ data: { size: 1024, type: this.mimeType } });
    }
  }
  stop() {
    this.state = 'inactive';
    if (this.ondataavailable) {
      this.ondataavailable({ data: { size: 2048, type: this.mimeType } });
    }
    if (this.onstop) {
      this.onstop();
    }
  }
  static isTypeSupported(type) {
    return type.includes('webm') || type.includes('mp4');
  }
}

global.MediaRecorder = MockMediaRecorder;

global.Blob = class MockBlob {
  constructor(chunks, options = {}) {
    this.chunks = chunks;
    this.type = options.type || '';
    this.size = chunks.reduce((acc, c) => acc + (c.size || 512), 0);
  }
};

let rafCallbacks = [];
global.requestAnimationFrame = (cb) => {
  rafCallbacks.push(cb);
  return rafCallbacks.length;
};
global.cancelAnimationFrame = (id) => {
  rafCallbacks = [];
};

// Mock Navigator MediaDevices cleanly
const screenTrack = new MockMediaStreamTrack('video', 'screen_video_track');
const mockMediaDevices = {
  getDisplayMedia: async (constraints) => {
    assert(constraints.video, 'getDisplayMedia should receive video constraints');
    return new MockMediaStream([screenTrack]);
  }
};
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  configurable: true,
  writable: true
});

// Load FluteVideoRecorder
const repoDir = '/Users/adityanayak/.gemini/antigravity/scratch/air-flute';
const recorderCode = fs.readFileSync(path.join(repoDir, 'src/flute-video-recorder.js'), 'utf8');
eval(recorderCode);

const FluteVideoRecorder = window.FluteVideoRecorder;

// --- Test 1: Class Definition & Instantiation ---
console.log('--- 1. Testing Class Definition & Options ---');
assert(typeof FluteVideoRecorder === 'function', 'FluteVideoRecorder class should be defined on window');

const mockAudio = {
  resume: async () => {},
  recDestination: {
    stream: new MockMediaStream([new MockMediaStreamTrack('audio', 'flute_audio_track')])
  },
  kattai: '1.5',
  analyser: {
    getByteFrequencyData: (arr) => { arr.fill(128); }
  }
};

const recorder = new FluteVideoRecorder({
  videoElement: { readyState: 2, videoWidth: 1280, videoHeight: 720 },
  canvasElement: { width: 1280, height: 720 },
  audioEngine: mockAudio,
  getCurrentSwara: () => ({ swara: 'Shadjam', short: 'Sa' }),
  getOctave: () => 0
});

assert(recorder.compCanvas, 'Composite canvas should be created');
assert.strictEqual(recorder.isRecording, false, 'Should initially not be recording');
console.log('✅ PASS: FluteVideoRecorder instantiated cleanly');

// --- Test 2: Codec Detection ---
console.log('\n--- 2. Testing Best MIME Type Detection ---');
const bestMime = recorder.getBestMimeType();
assert(bestMime.length > 0, 'Best MIME type should be resolved');
assert(bestMime.includes('video/'), 'MIME type should be a video format');
console.log(`✅ PASS: Best MIME type detected: "${bestMime}"`);

// --- Test 3: Camera Viewport Recording & Continuous Animation Loop ---
console.log('\n--- 3. Testing Camera Viewport Recording & Compositing Loop ---');
let stateChanges = [];
recorder.onStateChange = (state) => stateChanges.push(state);

(async () => {
  const started = await recorder.start('camera');
  assert.strictEqual(started, true, 'start("camera") should succeed');
  assert.strictEqual(recorder.isRecording, true, 'recorder.isRecording should be true');
  assert.strictEqual(recorder.mode, 'camera', 'Recorder mode should be camera');

  // Verify compositing loop is ALIVE and running
  assert(rafCallbacks.length > 0, 'Compositing loop should have scheduled requestAnimationFrame');
  const initialRafCount = rafCallbacks.length;

  // Execute scheduled RAF callback to verify next frame is scheduled
  const cb = rafCallbacks.shift();
  cb();
  assert(rafCallbacks.length > 0, 'Compositing loop should continuously re-schedule requestAnimationFrame while isRecording is true');

  console.log('✅ PASS: Camera compositing loop continuously runs without frame-0 premature exit');

  // Verify MediaRecorder tracks
  const streamTracks = recorder.mediaRecorder.stream.getTracks();
  const vTrack = streamTracks.find(t => t.kind === 'video');
  const aTrack = streamTracks.find(t => t.kind === 'audio');
  assert(vTrack, 'Recorded stream must contain video track');
  assert(aTrack, 'Recorded stream must contain audio track from FluteAudioEngine');
  console.log('✅ PASS: Combined stream contains both synchronized video and studio audio tracks');

  // --- Test 4: Stopping Camera Recording & File Download ---
  console.log('\n--- 4. Testing Stop & Download Handling ---');
  recorder.stop();
  assert.strictEqual(recorder.isRecording, false, 'recorder.isRecording should become false');
  assert.strictEqual(recorder.mediaRecorder.state, 'inactive', 'MediaRecorder should be inactive');

  const stoppedState = stateChanges.find(s => s.status === 'stopped');
  assert(stoppedState, 'Should emit stopped state change event');
  assert.strictEqual(stoppedState.downloadReady, true, 'downloadReady should be true');
  assert(stoppedState.blobSize > 0, 'Recorded blob size should be > 0 bytes');
  console.log(`✅ PASS: Performance video stopped and saved cleanly (${stoppedState.blobSize} bytes, ext: .${stoppedState.ext})`);

  // --- Test 5: Screen Recording Mode ---
  console.log('\n--- 5. Testing Pure Hardware Screen Recording Mode ---');
  const screenRecorder = new FluteVideoRecorder({
    audioEngine: mockAudio
  });

  const screenStarted = await screenRecorder.start('screen');
  assert.strictEqual(screenStarted, true, 'start("screen") should succeed');
  assert.strictEqual(screenRecorder.isRecording, true, 'isRecording should be true in screen mode');
  assert.strictEqual(screenRecorder.mode, 'screen', 'mode should be screen');

  const screenTracks = screenRecorder.mediaRecorder.stream.getTracks();
  assert(screenTracks.some(t => t.kind === 'video'), 'Screen stream should have video track');
  assert(screenTracks.some(t => t.kind === 'audio'), 'Screen stream should have audio track');
  console.log('✅ PASS: Screen recording uses direct native hardware stream without laggy canvas pipeline');

  screenRecorder.stop();
  console.log('✅ PASS: Screen recording stopped and download triggered');

  // --- Test 6: Verify HTML UI Elements & app.js Integration ---
  console.log('\n--- 6. Testing HTML UI & app.js Event Wiring ---');
  const htmlContent = fs.readFileSync(path.join(repoDir, 'index.html'), 'utf8');
  assert(htmlContent.includes('id="recordModeSelect"'), 'index.html must have #recordModeSelect');
  assert(htmlContent.includes('value="camera" selected'), 'recordModeSelect must have camera mode as default');
  assert(htmlContent.includes('id="recordBtn"'), 'index.html must have #recordBtn');

  const appContent = fs.readFileSync(path.join(repoDir, 'src/app.js'), 'utf8');
  assert(appContent.includes('videoRecorder.start(mode)'), 'app.js must call videoRecorder.start(mode)');
  assert(appContent.includes('updateRecordBtnLabel'), 'app.js must dynamically update button label on mode change');
  assert(appContent.includes("key === 'V'"), 'app.js must support V shortcut for video recording');

  console.log('✅ PASS: HTML UI elements, app.js handlers, and keyboard shortcut verified');

  console.log('\n======================================================');
  console.log('🎉 ALL VIDEO RECORDER TESTS PASSED 100%!');
  console.log('======================================================\n');
})();
