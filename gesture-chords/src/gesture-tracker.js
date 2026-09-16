// Real-time Hand & Finger Gesture Tracker for GestureChords
// Uses MediaPipe Hands with orientation-invariant geometric finger analysis

class GestureTracker {
  constructor(options = {}) {
    this.videoElement = options.videoElement;
    this.canvasElement = options.canvasElement;
    this.canvasCtx = this.canvasElement ? this.canvasElement.getContext('2d') : null;

    // Callbacks
    this.onGestureChange = options.onGestureChange || (() => {});
    this.onContinuousControl = options.onContinuousControl || (() => {});
    this.onTrackingStatus = options.onTrackingStatus || (() => {});

    // State
    this.isRunning = false;
    this.handsDetector = null;
    this.stream = null;
    this.animFrameId = null;

    // Smoothing & Hysteresis
    this.currentFingerCount = -1; // 0 to 5, or -1 for none
    this.rawFingerHistory = [];
    this.historySize = 4; // 4 consecutive frames for debouncing
    this.lastTriggerTime = 0;
    this.minGestureHoldMs = 80;

    // Hand kinematics for expression
    this.lastHandPos = null;
    this.lastHandTime = 0;
    this.currentHand = null;

    // Connections between MediaPipe landmarks for drawing skeleton
    this.HAND_CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [0, 13], [13, 14], [14, 15], [15, 16],// Ring
      [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [5, 9], [9, 13], [13, 17], [0, 17]    // Palm base
    ];
  }

  // Initialize camera and MediaPipe Hands
  async init() {
    this.onTrackingStatus({ status: 'loading', message: 'Accessing camera and loading AI model...' });

    try {
      // 1. Request Webcam
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      this.videoElement.srcObject = this.stream;
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve();
        };
      });

      // Resize canvas to match video
      if (this.canvasElement) {
        this.canvasElement.width = this.videoElement.videoWidth || 640;
        this.canvasElement.height = this.videoElement.videoHeight || 480;
      }

      // 2. Initialize MediaPipe Hands
      if (window.Hands) {
        this.handsDetector = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.handsDetector.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6
        });

        this.handsDetector.onResults((results) => this.onResults(results));

        this.isRunning = true;
        this.startProcessingLoop();
        this.onTrackingStatus({ status: 'ready', message: 'Camera active. Point your hand at the camera!' });
      } else {
        throw new Error('MediaPipe Hands library not found on page.');
      }
    } catch (err) {
      console.error('GestureTracker init error:', err);
      this.onTrackingStatus({
        status: 'error',
        message: `Camera / AI Error: ${err.message || 'Permission denied or model load failed.'}`
      });
      throw err;
    }
  }

  // Continuous frame loop sending video frames to MediaPipe
  async startProcessingLoop() {
    const processFrame = async () => {
      if (!this.isRunning) return;

      if (this.videoElement && this.videoElement.readyState >= 2 && this.handsDetector) {
        try {
          await this.handsDetector.send({ image: this.videoElement });
        } catch (e) {
          console.warn('Frame detection error:', e);
        }
      }

      this.animFrameId = requestAnimationFrame(processFrame);
    };

    this.animFrameId = requestAnimationFrame(processFrame);
  }

  // Handle MediaPipe detection results
  onResults(results) {
    if (!this.canvasCtx) return;

    const ctx = this.canvasCtx;
    const width = this.canvasElement.width;
    const height = this.canvasElement.height;

    // Clear canvas
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Mirror horizontally for natural webcam reflection
    ctx.translate(width, 0);
    ctx.scale(-1, 1);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      this.currentHand = landmarks;

      // Analyze extended fingers
      const fingerAnalysis = this.analyzeFingers(landmarks);

      // Debounce finger count
      this.updateSmoothedGesture(fingerAnalysis);

      // Hand expression: continuous height (Y) and horizontal position (X)
      this.updateSpatialExpression(landmarks, width, height);

      // Render hand skeleton, glowing joints, and finger labels
      this.drawHandOverlay(ctx, landmarks, fingerAnalysis, width, height);
    } else {
      // No hand in view
      this.currentHand = null;
      this.rawFingerHistory = [];
      if (this.currentFingerCount !== -1) {
        this.currentFingerCount = -1;
        this.onGestureChange({
          fingerCount: -1,
          gestureName: 'No Hand Detected',
          fingersState: null
        });
      }
    }

    ctx.restore();
  }

  // Orientation-invariant geometric analysis of each finger
  analyzeFingers(landmarks) {
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y, (p1.z || 0) - (p2.z || 0));

    const wrist = landmarks[0];

    // Landmark references:
    // Thumb: MCP(2), IP(3), Tip(4)
    // Index: MCP(5), PIP(6), DIP(7), Tip(8)
    // Middle: MCP(9), PIP(10), DIP(11), Tip(12)
    // Ring: MCP(13), PIP(14), DIP(15), Tip(16)
    // Pinky: MCP(17), PIP(18), DIP(19), Tip(20)

    // Standard 4 fingers: A finger is extended if tip is substantially farther from wrist & MCP than PIP is
    const checkFingerExtended = (mcpIdx, pipIdx, tipIdx) => {
      const mcp = landmarks[mcpIdx];
      const pip = landmarks[pipIdx];
      const tip = landmarks[tipIdx];

      const tipDistWrist = dist(tip, wrist);
      const pipDistWrist = dist(pip, wrist);

      const tipDistMcp = dist(tip, mcp);
      const pipDistMcp = dist(pip, mcp);

      // Both distance from wrist and distance from MCP should be greater
      return tipDistWrist > pipDistWrist * 1.08 && tipDistMcp > pipDistMcp * 1.15;
    };

    const indexExtended = checkFingerExtended(5, 6, 8);
    const middleExtended = checkFingerExtended(9, 10, 12);
    const ringExtended = checkFingerExtended(13, 14, 16);
    const pinkyExtended = checkFingerExtended(17, 18, 20);

    // Thumb extension analysis:
    // When thumb is extended away from palm, distance from thumb tip (4) to pinky base (17) is large,
    // and distance from thumb tip (4) to thumb MCP (2) is greater than thumb IP (3) to MCP (2).
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];
    const pinkyMCP = landmarks[17];
    const indexMCP = landmarks[5];

    const thumbTipToPinky = dist(thumbTip, pinkyMCP);
    const thumbIPToPinky = dist(thumbIP, pinkyMCP);
    const thumbTipToIndex = dist(thumbTip, indexMCP);

    const thumbExtended = (thumbTipToPinky > thumbIPToPinky * 1.12) && (thumbTipToIndex > 0.08);

    const fingersState = {
      thumb: thumbExtended,
      index: indexExtended,
      middle: middleExtended,
      ring: ringExtended,
      pinky: pinkyExtended
    };

    const count = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    return {
      count,
      fingersState
    };
  }

  // Temporal smoothing to prevent flicker during transitions
  updateSmoothedGesture(analysis) {
    const rawCount = analysis.count;
    this.rawFingerHistory.push(rawCount);
    if (this.rawFingerHistory.length > this.historySize) {
      this.rawFingerHistory.shift();
    }

    // Check if all recent frames agree on the finger count
    const allMatch = this.rawFingerHistory.length >= this.historySize &&
      this.rawFingerHistory.every(c => c === rawCount);

    const now = Date.now();
    if (allMatch && rawCount !== this.currentFingerCount && (now - this.lastTriggerTime > this.minGestureHoldMs)) {
      this.currentFingerCount = rawCount;
      this.lastTriggerTime = now;

      // Gesture human label
      const names = {
        0: 'Fist (Mute / Rest)',
        1: '1 Finger (Index)',
        2: '2 Fingers (Peace)',
        3: '3 Fingers',
        4: '4 Fingers',
        5: '5 Fingers (Open Palm)'
      };

      this.onGestureChange({
        fingerCount: rawCount,
        gestureName: names[rawCount] || `${rawCount} Fingers`,
        fingersState: analysis.fingersState
      });
    }
  }

  // Continuous hand height (Y) and horizontal position (X)
  updateSpatialExpression(landmarks, width, height) {
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];

    // Center of hand in normalized coords (0.0 to 1.0)
    const handX = (wrist.x + middleMCP.x) / 2;
    const handY = (wrist.y + middleMCP.y) / 2;

    // Calculate vertical velocity for strum detection
    const now = Date.now();
    let isStrumDownward = false;
    if (this.lastHandPos && this.lastHandTime) {
      const dt = (now - this.lastHandTime) / 1000;
      if (dt > 0.02 && dt < 0.2) {
        const vy = (handY - this.lastHandPos.y) / dt; // Positive is downward movement
        if (vy > 1.8) {
          isStrumDownward = true;
        }
      }
    }
    this.lastHandPos = { x: handX, y: handY };
    this.lastHandTime = now;

    this.onContinuousControl({
      normalizedX: handX,
      normalizedY: handY,
      isStrumDownward
    });
  }

  // Draw futuristic cyber visual overlay on canvas
  drawHandOverlay(ctx, landmarks, analysis, width, height) {
    // 1. Draw Skeleton Bones
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)'; // Neon cyan
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;

    this.HAND_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    });

    // Reset shadow
    ctx.shadowBlur = 0;

    // 2. Draw Joints
    landmarks.forEach((p, idx) => {
      const x = p.x * width;
      const y = p.y * height;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
    });

    // 3. Highlight Fingertips with Glow Halos
    const fingertipIndices = [
      { idx: 4, name: 'Thumb', extended: analysis.fingersState.thumb },
      { idx: 8, name: 'Index', extended: analysis.fingersState.index },
      { idx: 12, name: 'Middle', extended: analysis.fingersState.middle },
      { idx: 16, name: 'Ring', extended: analysis.fingersState.ring },
      { idx: 20, name: 'Pinky', extended: analysis.fingersState.pinky }
    ];

    fingertipIndices.forEach(tip => {
      const p = landmarks[tip.idx];
      const x = p.x * width;
      const y = p.y * height;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, tip.extended ? 10 : 6, 0, 2 * Math.PI);

      if (tip.extended) {
        ctx.fillStyle = '#4ade80'; // Neon green
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)'; // Muted slate
      }
      ctx.fill();
      ctx.restore();
    });

    // 4. Draw Floating Gesture Tag above the wrist / palm
    const palmX = landmarks[9].x * width;
    const palmY = Math.max(30, landmarks[9].y * height - 40);

    ctx.save();
    // Since the canvas is mirrored horizontally, we temporarily flip back to draw legible text!
    ctx.translate(palmX, palmY);
    ctx.scale(-1, 1);

    const text = `${analysis.count} ${analysis.count === 1 ? 'Finger' : 'Fingers'}`;
    ctx.font = 'bold 16px Inter, sans-serif';
    const textMetrics = ctx.measureText(text);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-textMetrics.width / 2 - 10, -18, textMetrics.width + 20, 26, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, -5);

    ctx.restore();
  }

  // Stop camera and tracking
  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.canvasCtx && this.canvasElement) {
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
    this.onTrackingStatus({ status: 'stopped', message: 'Camera stopped.' });
  }
}

// Export for browser
window.GestureTracker = GestureTracker;
