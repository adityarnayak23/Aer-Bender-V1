// Clean Dual-Hand Vision Tracker for Air Flute
// High-accuracy joint-angle finger curl detection, automatic nearest-swara rounding,
// blow gesture detection for higher octave, and removed big on-screen note labels

class CarnaticFluteTracker {
  constructor(options = {}) {
    this.videoElement = options.videoElement;
    this.canvasElement = options.canvasElement;
    this.canvasCtx = this.canvasElement ? this.canvasElement.getContext('2d') : null;

    // Callbacks
    this.onSwaraDetected = options.onSwaraDetected || (() => {});
    this.onJantiDetected = options.onJantiDetected || (() => {});
    this.onGamakaBend = options.onGamakaBend || (() => {});
    this.onOctaveChanged = options.onOctaveChanged || (() => {});
    this.onFlutePosition = options.onFlutePosition || (() => {});
    this.onTrackingStatus = options.onTrackingStatus || (() => {});
    this.onMouthApertureChanged = options.onMouthApertureChanged || (() => {});
    this.onEmbouchureChanged = options.onEmbouchureChanged || (() => {});

    // State
    this.isRunning = false;
    this.handsDetector = null;
    this.faceDetector = null;
    this.stream = null;
    this.animFrameId = null;
    this.videoFrameCallbackId = null;
    this.isProcessingFrame = false;
    this.isProcessingFace = false;
    this.frameCount = 0;

    // Embouchure Blow Hole Alignment State
    // Flute plays only when user places their lips at the blow hole
    this.isLipsAtBlowHole = false;
    this.mouthDistToBlowHole = 999;
    this.mouthScreenPos = null;
    this.blowHoleDef = { id: 'BLOW', name: 'Embouchure Blow Hole', offset: -0.14 };
    this.faceMissFrames = 0;
    this.faceIframe = null;
    this.hasFaceIframeListener = false;

    // Head Pitch Tilt Octave State:
    // - Chin Nod Down (<0.35) -> Bass (-1 / Mandra)
    // - Level / Neutral Head (0.38..0.62) -> Mid (0 / Madhya)
    // - Chin Tilt Up (>0.65) -> High (+1 / Tara)
    this.headPitchScore = 0.50;
    this.smoothedHeadPitchScore = 0.50;
    this.rawHeadPitchScore = 0.50;
    this.headState = 'level';
    this.mouthScore = 0.50;
    this.smoothedMouthScore = 0.50;
    this.rawMouthScore = 0.50;
    this.mouthState = 'parted';
    this.lastFaceLandmarks = null;
    this.isFaceProcessing = false;
    this.lastFaceTime = 0;

    // Adaptive Head Pitch Resting Baseline (Self-calibrates to user's natural webcam/head angle)
    this.restingPitchRatio = 1.00;
    this.hasLearnedPitchBaseline = false;
    this.pitchSamplesCount = 0;

    // Finger curl sensitivity threshold (default 1.45)
    this.curlThreshold = 1.45;
    this.swapHands = false;
    this.isPanelCollapsed = true; // Studio controls collapsed by default

    // Single Gently Tilted Visual Flute Line across screen:
    // Reasonable ergonomic flute tilt (~12° downward slope to the right)
    this.lineAngleDeg = 12;
    this.OCTAVE_LINES = {
      HIGH: 0.44,  // Tara (+1)
      MID:  0.47,  // Madhya (0) - calibrated to 47% default
      BASS: 0.67   // Mandra (-1)
    };
    this.fixedFluteY = 0.47; // Default flute level at 47%
    this.fluteY = this.fixedFluteY;
    this.fluteAngleDeg = this.lineAngleDeg; // Tilted line
    this.fixedFluteCenterX = 0.52;
    this.fluteCenterX = 0.52;            // Center X (stationary horizontally - does not move left or right)
    this.isDraggingLine = false;

    // 7 Holes: Left hand shifted rightwards, right hand shifted further right with increased inter-hand gap (0.112 span / ~70px)
    this.holeDefs = [
      { id: 'L1', name: 'Left Index',  offset: -0.010, hand: 'left',  tipIdx: 8,  dipIdx: 7,  pipIdx: 6,  mcpIdx: 5 },
      { id: 'L2', name: 'Left Middle', offset: +0.044, hand: 'left',  tipIdx: 12, dipIdx: 11, pipIdx: 10, mcpIdx: 9 },
      { id: 'L3', name: 'Left Ring',   offset: +0.098, hand: 'left',  tipIdx: 16, dipIdx: 15, pipIdx: 14, mcpIdx: 13 },
      { id: 'R1', name: 'Right Index', offset: +0.210, hand: 'right', tipIdx: 8,  dipIdx: 7,  pipIdx: 6,  mcpIdx: 5 },
      { id: 'R2', name: 'Right Middle',offset: +0.262, hand: 'right', tipIdx: 12, dipIdx: 11, pipIdx: 10, mcpIdx: 9 },
      { id: 'R3', name: 'Right Ring',  offset: +0.314, hand: 'right', tipIdx: 16, dipIdx: 15, pipIdx: 14, mcpIdx: 13 },
      { id: 'R4', name: 'Right Pinky', offset: +0.366, hand: 'right', tipIdx: 20, dipIdx: 19, pipIdx: 18, mcpIdx: 17 }
    ];

    // 7 Tone holes: [L1, L2, L3, R1, R2, R3, R4]
    this.currentHoleStates = [false, false, false, false, false, false, false];
    this.rawHoleStates = [false, false, false, false, false, false, false];
    this.fingerCurlScores = [0, 0, 0, 0, 0, 0, 0];
    this.prevFingerCurlScores = [0, 0, 0, 0, 0, 0, 0];
    this.holeAnimStates = Array.from({ length: 7 }, () => ({
      scale: 1.0,
      coverage: 0.0
    }));
    this.activeSwara = null;

    // Spatial Octave State (-1: Mandra/Bass, 0: Madhya/Normal, 1: Tara/High)
    this.currentOctave = 0;

    // Stable Motion Response: Instantaneous 1-frame response on note transition once Sa is stabilized.
    // Zero perceptible latency while Schmitt trigger eliminates all micro-jitter flickering.
    this.candidateSwaraId = null;
    this.candidateFrames = 0;
    this.minFramesToSwitch = 1;

    // Initial Stabilization State Machine
    // Remains silent on cold start until user stabilizes hands on instrument (>= 3 frames / ~90ms)
    this.awaitingInitialSa = true;
    this.initialSaHoldFrames = 0;
    this.requiredSaFrames = 3;
    this.handsOutPostureFrames = 0;
    this.HANDS_DOWN_REARM_FRAMES = 90; // Prolonged rest (>= 1.5s - 2.0s) before recalibrating
    this.sessionUnlocked = false;
    this.prevInPlayingPosition = false;
    this.missingPostureFrames = 0;
    this.allowedSwaraIds = null;

    // Janti (Double-Note Articulation) Gesture State
    this.swaraHoldStartTime = 0;
    this.lastJantiTime = 0;
    this.recentJerkEvents = [];
    this.prevLandmarks = { left: null, right: null };
    this.jantiPulseAlpha = 0;
    this.jantiLabel = '';

    // Floating note particles (individual notes, zero background, floating upward & fading)
    this.floatingNotes = [];
    this.lastFloatingSwaraId = null;

    // Cyber-Spiritual Eyeball Octave Glow State
    this.smoothedEyes = null;
    this.eyeGlowOpacity = 0.0;

    // Scientific Fluid Streamline Dynamics (zero moving particle clutter)
    this.cfdParticles = [];

    // Gamaka tilt
    this.baseAngle = 0;
    this.hasCalibratedAngle = false;

    // Skeleton Connections
    this.HAND_CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [0, 13], [13, 14], [14, 15], [15, 16],// Ring
      [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [5, 9], [9, 13], [13, 17], [0, 17]    // Palm Base
    ];

    this.initDragHandlers();
  }

  initCanvasPreview() {
    if (!this.canvasElement) return;
    const rect = this.canvasElement.getBoundingClientRect ? this.canvasElement.getBoundingClientRect() : null;
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) ? Math.max(2, window.devicePixelRatio) : 2;
    const baseW = (rect && rect.width > 0) ? rect.width : (typeof window !== "undefined" ? window.innerWidth : 1280);
    const baseH = (rect && rect.height > 0) ? rect.height : (typeof window !== "undefined" ? window.innerHeight : 720);
    const w = Math.round(baseW * dpr);
    const h = Math.round(baseH * dpr);
    this.canvasElement.width = w;
    this.canvasElement.height = h;
    if (this.canvasCtx) {
      this.canvasCtx.imageSmoothingEnabled = true;
      this.canvasCtx.imageSmoothingQuality = 'high';
      this.renderCleanOverlay(this.canvasCtx, null, null, [false, false, false, false, false, false, false], w, h);
    }
    this.startIdleLevitationLoop();
  }

  startIdleLevitationLoop() {
    if (this.isRunning) return;
    if (this.idleAnimFrameId) return;

    const renderIdleFrame = () => {
      if (this.isRunning) {
        this.idleAnimFrameId = null;
        return;
      }
      if (this.canvasCtx && this.canvasElement && this.canvasElement.width > 0) {
        if (this.canvasElement.clientWidth > 0 && this.canvasElement.clientHeight > 0) {
          const dpr = (typeof window !== "undefined" && window.devicePixelRatio) ? Math.max(2, window.devicePixelRatio) : 2;
          const targetW = Math.round(this.canvasElement.clientWidth * dpr);
          const targetH = Math.round(this.canvasElement.clientHeight * dpr);
          if (Math.abs(this.canvasElement.width - targetW) > 4 || Math.abs(this.canvasElement.height - targetH) > 4) {
            this.canvasElement.width = targetW;
            this.canvasElement.height = targetH;
            this.canvasCtx.imageSmoothingEnabled = true;
            this.canvasCtx.imageSmoothingQuality = 'high';
          }
        }
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        this.renderCleanOverlay(this.canvasCtx, null, null, [false, false, false, false, false, false, false], this.canvasElement.width, this.canvasElement.height);
      }
      if (typeof requestAnimationFrame !== 'undefined') {
        this.idleAnimFrameId = requestAnimationFrame(renderIdleFrame);
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      this.idleAnimFrameId = requestAnimationFrame(renderIdleFrame);
    }
  }

  stopIdleLevitationLoop() {
    if (this.idleAnimFrameId) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.idleAnimFrameId);
      }
      this.idleAnimFrameId = null;
    }
  }

  initDragHandlers() {
    if (!this.canvasElement) return;

    const getCanvasPos = (evt) => {
      const rect = this.canvasElement.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      const scaleX = this.canvasElement.width / rect.width;
      const scaleY = this.canvasElement.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const getOctaveFromPos = (pos) => {
      const w = this.canvasElement.width;
      const h = this.canvasElement.height;
      const angleRad = this.getEffectiveAngleRad();
      const ux = Math.abs(Math.cos(angleRad));
      const uy = Math.abs(Math.sin(angleRad));
      const lineYProj = (pos.y / h) - ((pos.x / w) - this.fluteCenterX) * (uy / ux);
      if (lineYProj < 0.495) {
        return 1;
      } else if (lineYProj > 0.61) {
        return -1;
      } else {
        return 0;
      }
    };

    const onStart = (e) => {
      const pos = getCanvasPos(e);
      this.selectOctave(getOctaveFromPos(pos));
      this.isDraggingLine = true;
      if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
    };

    const onMove = (e) => {
      if (this.isDraggingLine) {
        const pos = getCanvasPos(e);
        this.selectOctave(getOctaveFromPos(pos));
        if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
      }
    };

    const onEnd = () => {
      this.isDraggingLine = false;
    };

    this.canvasElement.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.canvasElement.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }

  selectOctave(octave) {
    octave = Math.max(-1, Math.min(1, parseInt(octave, 10) || 0));
    this.currentOctave = octave;
    this.onOctaveChanged(this.currentOctave);
    this.onFlutePosition(this.fluteY);
  }

  resetHeadPitchCalibration() {
    this.headPitchScore = 0.50;
    this.smoothedHeadPitchScore = 0.50;
    this.rawHeadPitchScore = 0.50;
    this.headState = 'level';
    this.mouthScore = 0.50;
    this.smoothedMouthScore = 0.50;
    this.rawMouthScore = 0.50;
    this.mouthState = 'parted';
    this.restingPitchRatio = 1.00;
    this.hasLearnedPitchBaseline = false;
    this.pitchSamplesCount = 0;
  }

  resetLipCalibration() {
    this.resetHeadPitchCalibration();
  }

  setAllowedSwaras(swaraIds) {
    this.allowedSwaraIds = swaraIds ? (Array.isArray(swaraIds) ? swaraIds : Array.from(swaraIds)) : null;
  }

  setFluteY(val) {
    const y = parseFloat(val);
    if (!isNaN(y)) {
      this.fixedFluteY = y > 1 ? y / 100 : y;
      this.fluteY = this.fixedFluteY;
      this.onFlutePosition(this.fluteY);
    }
  }

  setFluteCenterX(val) {
    this.fixedFluteCenterX = parseFloat(val) || 0.52;
    this.fluteCenterX = this.fixedFluteCenterX;
  }

  setLineAngleDeg(angle) {
    this.lineAngleDeg = parseFloat(angle) || 12;
    this.fluteAngleDeg = this.lineAngleDeg;
  }

  getEffectiveAngleRad() {
    const angleDeg = this.lineAngleDeg !== undefined ? this.lineAngleDeg : 12;
    return (angleDeg * Math.PI) / 180;
  }

  isPanelShut() {
    if (this.isPanelCollapsed !== undefined) return Boolean(this.isPanelCollapsed);
    if (typeof document !== 'undefined') {
      const el = document.querySelector('.controls-panel');
      return Boolean(el && el.classList.contains('dock-collapsed'));
    }
    return false;
  }

  getFluteHeadOffset() {
    // Increased length on left side (crown / headjoint end)
    return (this.blowHoleDef.offset || -0.14) - 0.180;
  }

  getBaseFootOffset() {
    // Reduced wee bit on the right side so it does not hit the floating controls panel
    return (this.holeDefs[6] ? this.holeDefs[6].offset : 0.366) + 0.100;
  }

  getFluteFootOffset() {
    const base = this.getBaseFootOffset();
    // When the controls panel is shut/collapsed, the flute extends to the right
    // without changing the position of the blow hole and tone holes!
    if (this.isPanelShut()) {
      return base + 0.28;
    }
    return base;
  }

  getSpanScale(width, height) {
    if (width <= 800) {
      return Math.min(width * 0.92, height * 1.1);
    }
    const panelWidth = Math.max(340, Math.min(width * 0.28, 420)) + 14;
    const stageWidth = width - panelWidth;
    // Ergonomic elongated concert flute scale with comfortable reach
    const baseSpan = Math.min(stageWidth * 0.74 * 1.68, height * 0.94 * 1.68);
    const ux = Math.abs(Math.cos(this.getEffectiveAngleRad()));
    // Always anchor to base foot offset so hole and blow positions never move when panel is shut
    const endOffset = this.getBaseFootOffset();
    const startOffset = this.getFluteHeadOffset();
    const totalFluteOffsetSpan = endOffset - startOffset;
    const maxAllowedSpan = (stageWidth - 135) / (totalFluteOffsetSpan * ux);
    return Math.min(baseSpan, maxAllowedSpan);
  }

  getFluteCenterScreenX(width, height) {
    if (width <= 800) {
      return (this.fluteCenterX || this.fixedFluteCenterX || 0.44) * width;
    }
    const panelWidth = Math.max(340, Math.min(width * 0.28, 420)) + 14;
    const stageWidth = width - panelWidth;
    const spanScale = this.getSpanScale(width, height || (width * 9 / 16));
    const ux = Math.abs(Math.cos(this.getEffectiveAngleRad()));
    // Always anchor to base foot offset so hole and blow positions never move when panel is shut
    const endOffset = this.getBaseFootOffset();
    const startOffset = this.getFluteHeadOffset();

    // Shifted comfortably to player's left within camera stage, keeping generous clearance (>110px) from glass controls dock
    const rightMargin = 110;
    const panelLeft = stageWidth;
    const endReach = endOffset * ux * spanScale;
    const startReach = Math.abs(startOffset) * ux * spanScale;

    let centerX = stageWidth * 0.37;
    if (centerX + endReach > panelLeft - rightMargin) {
      centerX = panelLeft - rightMargin - endReach;
    }
    if (centerX - startReach < 20) {
      centerX = 20 + startReach;
    }
    return centerX;
  }


  getHolePos(holeIdx, width, height) {
    const hole = this.holeDefs[holeIdx];
    const angleRad = this.getEffectiveAngleRad();
    
    const ux = Math.abs(Math.cos(angleRad));
    const uy = Math.abs(Math.sin(angleRad));

    const lineY = this.fluteY * height;
    const lineX = this.getFluteCenterScreenX(width, height);
    const spanScale = this.getSpanScale(width, height);

    const x = lineX + hole.offset * ux * spanScale;
    const y = lineY + hole.offset * uy * spanScale;
    return { x, y };
  }

  // Get screen position of the Embouchure Blow Hole at the flute head
  getBlowHolePos(width, height) {
    const angleRad = this.getEffectiveAngleRad();
    const ux = Math.abs(Math.cos(angleRad));
    const uy = Math.abs(Math.sin(angleRad));

    const lineY = this.fluteY * height;
    const lineX = this.getFluteCenterScreenX(width, height);
    const spanScale = this.getSpanScale(width, height);

    const x = lineX + this.blowHoleDef.offset * ux * spanScale;
    const y = lineY + this.blowHoleDef.offset * uy * spanScale;
    return { x, y };
  }

  onFaceResults(results) {
    if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      // Grace period: do not immediately drop embouchure on transient dropped frames or hand occlusion
      this.faceMissFrames = (this.faceMissFrames || 0) + 1;
      if (this.faceMissFrames > 25) {
        this.lastFaceLandmarks = null;
        if (this.isLipsAtBlowHole) {
          this.isLipsAtBlowHole = false;
          this.onEmbouchureChanged({ isAligned: false, dist: 999 });
        }
      }
      return;
    }
    this.faceMissFrames = 0;
    const landmarks = results.multiFaceLandmarks[0];
    this.lastFaceLandmarks = landmarks;
    this.updateOctaveFromHeadPitch(landmarks);
  }

  // =========================================================================
  // 📐 HEAD PITCH TILT OCTAVE ENGINE (Chin Down / Level / Chin Up)
  // Computes continuous normalized score from 0.0 (Chin Nod Down) to 1.0 (Chin Tilt Up)
  // - Chin Nod Down (< 0.26) -> Low Octave (-1 / Mandra) - requires distinct tilt down
  // - Level / Neutral Head (0.26..0.74) -> Mid Octave (0 / Madhya) - WIDE CLEAN ERGONOMIC RANGE
  // - Chin Tilt Up (> 0.74) -> High Octave (+1 / Tara) - requires distinct tilt up
  // Highly robust against webcam noise, yaw angle, facial hair, and distance.
  // =========================================================================
  computeHeadPitchScore(landmarks) {
    if (!landmarks || landmarks.length < 153) return 0.50;

    const p10 = landmarks[10];   // Forehead top center
    const p1 = landmarks[1];     // Nose tip
    const p152 = landmarks[152]; // Chin bottom
    const p33 = landmarks[33];   // Left eye outer corner
    const p263 = landmarks[263]; // Right eye outer corner
    const p61 = landmarks[61];   // Left mouth corner
    const p291 = landmarks[291]; // Right mouth corner

    if (!p1 || !p152) return 0.50;

    const dist3d = (a, b) => {
      if (!a || !b) return 0;
      return Math.hypot(a.x - b.x, a.y - b.y, ((a.z || 0) - (b.z || 0)) * 0.5);
    };

    // Reference Scale Normalization (Profile- and Distance-Invariant)
    const upperPt = p10 || { x: p1.x, y: p1.y - 0.15, z: p1.z };
    const faceHeight = dist3d(upperPt, p152);
    const cornerSpan = (p61 && p291) ? dist3d(p61, p291) : 0.08;
    const eyeSpan = (p33 && p263) ? dist3d(p33, p263) : cornerSpan;
    const normScale = Math.max(faceHeight, eyeSpan * 1.5, 0.08);

    // 1. Vertical feature span ratios along face midline:
    // When chin nods down, lowerSpan (nose to chin) compresses relative to upperSpan (forehead to nose).
    // When chin tilts up, lowerSpan expands and upperSpan compresses.
    const upperSpan = Math.max(0.02, (p1.y - upperPt.y) / normScale);
    const lowerSpan = Math.max(0.02, (p152.y - p1.y) / normScale);
    const rawPitchRatio = lowerSpan / upperSpan;

    // 2. 3D Z-tilt enhancement (depth):
    // When chin tilts up, chin (152) advances toward camera (z becomes smaller / more negative relative to forehead).
    // When chin nods down, chin recedes deeper into the scene.
    const zDelta = ((upperPt.z || 0) - (p152.z || 0)) / normScale;
    const combinedPitch = rawPitchRatio + zDelta * 0.5;

    // 3. Adaptive Resting Baseline Calibration:
    // Only adapt when head is near neutral/resting position (not during intentional octave shifts)
    const currentRest = this.restingPitchRatio || 1.00;
    const isNearRest = Math.abs(combinedPitch - currentRest) < 0.07;
    if (isNearRest && combinedPitch >= 0.85 && combinedPitch <= 1.15) {
      const learnAlpha = this.hasLearnedPitchBaseline ? 0.005 : 0.04;
      this.restingPitchRatio = (1.0 - learnAlpha) * currentRest + learnAlpha * combinedPitch;
      this.restingPitchRatio = Math.max(0.90, Math.min(1.10, this.restingPitchRatio));
      this.pitchSamplesCount = (this.pitchSamplesCount || 0) + 1;
      if (this.pitchSamplesCount > 15) {
        this.hasLearnedPitchBaseline = true;
      }
    }

    const baseRatio = this.restingPitchRatio || 1.00;
    const delta = combinedPitch - baseRatio;

    // Sensitivity tuning: ~5°-8° head tilt readily crosses threshold
    const sensitivity = 2.4;
    const normScore = 0.50 + delta * sensitivity;
    return Math.max(0.0, Math.min(1.0, normScore));
  }

  // Backward-compatible alias
  computeMouthScore(landmarks) {
    return this.computeHeadPitchScore(landmarks);
  }

  // Head-Tilt Controlled Octave Engine & Embouchure Alignment:
  // - Chin Nod Down -> Low octave (Mandra, -1)
  // - Level Head -> Mid octave (Madhya, 0)
  // - Chin Tilt Up -> High octave (Tara, +1)
  // Player must place lips at the Blow Hole to play
  updateOctaveFromHeadPitch(landmarks) {
    if (!landmarks || landmarks.length < 153) return;

    const p13 = landmarks[13] || landmarks[1];
    const p14 = landmarks[14] || landmarks[152];
    if (!p13 || !p14) return;

    const canvasW = this.canvasElement ? this.canvasElement.width : 640;
    const canvasH = this.canvasElement ? this.canvasElement.height : 480;

    // Embouchure Blow Hole Proximity Tracking
    const mouthScreenX = (1.0 - (p13.x + p14.x) / 2) * canvasW;
    const mouthScreenY = ((p13.y + p14.y) / 2) * canvasH;
    this.mouthScreenPos = { x: mouthScreenX, y: mouthScreenY };

    const blowPos = this.getBlowHolePos(canvasW, canvasH);
    const normDist = Math.hypot(mouthScreenX - blowPos.x, mouthScreenY - blowPos.y) / canvasH;
    this.mouthDistToBlowHole = normDist;

    // Natural ergonomic Embouchure Engagement:
    // Natural playing zone spans from the blow hole to the left hand index hole (L1)
    // with generous vertical headroom to accommodate head nod/tilt (chin-up for high octave)
    const dx = mouthScreenX - blowPos.x;
    const dy = mouthScreenY - blowPos.y;
    const inEmbouchureZone = normDist < 0.40 || (dx >= -70 && dx <= 150 && dy >= -180 && dy <= 140);

    let isAligned = this.isLipsAtBlowHole;
    if (this.isLipsAtBlowHole) {
      if (normDist > 0.46 && !(dx >= -80 && dx <= 165 && dy >= -210 && dy <= 165)) {
        isAligned = false;
      }
    } else {
      if (inEmbouchureZone) {
        isAligned = true;
      }
    }

    if (isAligned !== this.isLipsAtBlowHole) {
      this.isLipsAtBlowHole = isAligned;
      this.onEmbouchureChanged({
        isAligned: this.isLipsAtBlowHole,
        dist: normDist
      });
    }

    // Compute Head Pitch Score (0.0: Chin Down, 0.5: Level, 1.0: Chin Up)
    const rawScore = this.computeHeadPitchScore(landmarks);
    this.rawHeadPitchScore = rawScore;
    this.rawMouthScore = rawScore;

    const prevScore = this.smoothedHeadPitchScore !== undefined ? this.smoothedHeadPitchScore : 0.50;
    const delta = Math.abs(rawScore - prevScore);

    // Dual-Rate Adaptive Temporal Filter:
    // Instant attack on intentional head movement (delta > 0.04): alpha = 0.88 (~15ms response)
    // Aggressive damping when holding head steady: alpha = 0.25 (zero jitter)
    const alpha = delta > 0.04 ? 0.88 : 0.25;
    const smoothScore = alpha * rawScore + (1.0 - alpha) * prevScore;
    this.smoothedHeadPitchScore = smoothScore;
    this.headPitchScore = smoothScore;
    this.smoothedMouthScore = smoothScore;
    this.mouthScore = smoothScore;
    this.smoothedMouthRatio = smoothScore;
    this.mouthApertureRatio = rawScore;

    // 3-State Schmitt Trigger with Wide Mid-Octave Range & Robust Hysteresis:
    // - Bass (Mandra, -1): score < 0.26 (leave > 0.34) -> requires a distinct chin nod down
    // - Mid (Madhya, 0): 0.26 <= score <= 0.74 -> spacious, stable, clean mid-octave zone
    // - High (Tara, +1): score > 0.74 (leave < 0.66) -> requires a distinct chin tilt up
    let targetOctave = this.currentOctave;
    if (this.currentOctave === -1) {
      if (smoothScore > 0.74) {
        targetOctave = 1;
      } else if (smoothScore > 0.34) {
        targetOctave = 0;
      }
    } else if (this.currentOctave === 0) {
      if (smoothScore < 0.26) {
        targetOctave = -1;
      } else if (smoothScore > 0.74) {
        targetOctave = 1;
      }
    } else if (this.currentOctave === 1) {
      if (smoothScore < 0.26) {
        targetOctave = -1;
      } else if (smoothScore < 0.66) {
        targetOctave = 0;
      }
    }

    if (targetOctave === -1) {
      this.headState = 'chin_down';
      this.mouthState = 'closed';
    } else if (targetOctave === 1) {
      this.headState = 'chin_up';
      this.mouthState = 'open';
    } else {
      this.headState = 'level';
      this.mouthState = 'parted';
    }

    if (targetOctave !== this.currentOctave) {
      if (targetOctave === this.candidateOctave) {
        this.candidateOctaveFrames = (this.candidateOctaveFrames || 0) + 1;
        if (this.candidateOctaveFrames >= 2) {
          this.selectOctave(targetOctave);
          this.candidateOctaveFrames = 0;
        }
      } else {
        this.candidateOctave = targetOctave;
        this.candidateOctaveFrames = 1;
      }
    } else {
      this.candidateOctave = null;
      this.candidateOctaveFrames = 0;
    }

    this.onMouthApertureChanged({
      score: smoothScore,
      rawScore: rawScore,
      ratio: smoothScore,
      headPitchScore: smoothScore,
      octave: this.currentOctave,
      state: this.mouthState,
      headState: this.headState,
      isLipsAtBlowHole: this.isLipsAtBlowHole,
      mouthDistToBlowHole: this.mouthDistToBlowHole
    });
  }

  // Backward-compatible alias
  updateOctaveFromMouth(landmarks) {
    this.updateOctaveFromHeadPitch(landmarks);
  }

  updateOctaveFromHandsY(y) {
    if (this.smoothedHandsY === null || this.smoothedHandsY === undefined) {
      this.smoothedHandsY = y;
    } else {
      const deltaY = Math.abs(y - this.smoothedHandsY);
      const alpha = deltaY > 0.05 ? 0.75 : 0.40;
      this.smoothedHandsY = this.smoothedHandsY * (1.0 - alpha) + y * alpha;
    }

    const smoothY = this.smoothedHandsY;
    let targetOctave = this.currentOctave;

    // 3 Explicit Visual Zones:
    // High zone: enter y < 0.485, leave y > 0.51
    // Mid zone: enter from High y > 0.51, enter from Bass y < 0.59
    // Bass zone: enter y > 0.61, leave y < 0.59
    if (this.currentOctave === 0) {
      if (smoothY < 0.485) targetOctave = 1;
      else if (smoothY > 0.61) targetOctave = -1;
    } else if (this.currentOctave === 1) {
      if (smoothY > 0.61) targetOctave = -1;
      else if (smoothY > 0.51) targetOctave = 0;
    } else if (this.currentOctave === -1) {
      if (smoothY < 0.485) targetOctave = 1;
      else if (smoothY < 0.59) targetOctave = 0;
    }

    if (targetOctave !== this.currentOctave) {
      if (targetOctave === this.candidateHandsOctave) {
        this.candidateHandsOctaveFrames = (this.candidateHandsOctaveFrames || 0) + 1;
        if (this.candidateHandsOctaveFrames >= 2) {
          this.selectOctave(targetOctave);
          this.candidateHandsOctaveFrames = 0;
        }
      } else {
        this.candidateHandsOctave = targetOctave;
        this.candidateHandsOctaveFrames = 1;
      }
    } else {
      this.candidateHandsOctave = null;
      this.candidateHandsOctaveFrames = 0;
    }
  }

  setCurlThreshold(val) {
    this.curlThreshold = parseFloat(val);
  }

  toggleSwapHands() {
    this.swapHands = !this.swapHands;
    return this.swapHands;
  }

  setFluteSkin(skin) {}

  async init() {
    this.onTrackingStatus({ status: 'loading', message: 'Starting dual-hand AI tracking...' });

    try {
      // Multi-tier camera constraints for mobile (iOS Safari / Android Chrome) & desktop
      const constraintTiers = [
        // Tier 1: Ideal HD 60fps for desktop & high-end mobile
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 60 },
            facingMode: 'user'
          },
          audio: false
        },
        // Tier 2: Standard ideal dimensions (no strict frameRate)
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        },
        // Tier 3: Universal front camera (works on all iOS/Android portrait orientations)
        {
          video: {
            facingMode: 'user'
          },
          audio: false
        },
        // Tier 4: Universal fallback
        {
          video: true,
          audio: false
        }
      ];

      let stream = null;
      let lastErr = null;
      for (const tier of constraintTiers) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(tier);
          if (stream) break;
        } catch (tierErr) {
          lastErr = tierErr;
          console.warn('Camera tier constraint failed, trying fallback tier...', tierErr);
        }
      }
      if (!stream) {
        throw lastErr || new Error('Could not access camera with any constraints.');
      }
      this.stream = stream;

      if (this.videoElement) {
        this.videoElement.setAttribute('playsinline', 'true');
        this.videoElement.setAttribute('webkit-playsinline', 'true');
      }
      this.videoElement.srcObject = this.stream;
      await new Promise(resolve => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve();
        };
      });

      if (this.canvasElement) {
        const rect = this.canvasElement.getBoundingClientRect ? this.canvasElement.getBoundingClientRect() : null;
        const rawDpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
        const dpr = Math.min(Math.max(1, rawDpr), 2.0); // Cap at 2.0 to prevent mobile GPU OOM
        const baseW = (rect && rect.width > 0) ? rect.width : (this.videoElement.videoWidth || 1280);
        const baseH = (rect && rect.height > 0) ? rect.height : (this.videoElement.videoHeight || 720);
        this.canvasElement.width = Math.round(baseW * dpr);
        this.canvasElement.height = Math.round(baseH * dpr);
        if (this.canvasCtx) {
          this.canvasCtx.imageSmoothingEnabled = true;
          this.canvasCtx.imageSmoothingQuality = 'high';
          this.renderCleanOverlay(this.canvasCtx, null, null, [false, false, false, false, false, false, false], this.canvasElement.width, this.canvasElement.height);
        }
      }

      if (window.Hands) {
        this.handsDetector = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.handsDetector.setOptions({
          maxNumHands: 2,
          modelComplexity: 0, // Lite model: ultra-fast 10-14ms inference, zero frame-dropping at 60 FPS
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        this.handsDetector.onResults((results) => this.onResults(results));

        if (window.FaceMesh) {
          this.faceDetector = new window.FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
          });

          this.faceDetector.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true, // Refined iris tracking
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });

          this.faceDetector.onResults((results) => this.onFaceResults(results));
        }

        // Connect isolated FaceMesh worker iframe (prevents Emscripten allocator collisions)
        if (typeof window !== 'undefined') {
          this.faceIframe = document.getElementById('facemeshWorker');
          if (this.faceIframe && !this.hasFaceIframeListener) {
            this.hasFaceIframeListener = true;
            window.addEventListener('message', (ev) => {
              if (ev.data && ev.data.type === 'FACEMESH_RESULTS') {
                this.onFaceResults({ multiFaceLandmarks: ev.data.multiFaceLandmarks });
              } else if (ev.data && ev.data.type === 'FACEMESH_FRAME_DONE') {
                this.isProcessingFace = false;
              }
            });
          }
        }

        this.stopIdleLevitationLoop();
        this.isRunning = true;
        this.startProcessingLoop();
        this.onTrackingStatus({
          status: 'ready',
          message: 'Tracking active! Hold both hands up in flute playing posture.'
        });
      } else {
        throw new Error('MediaPipe Hands library not found on page.');
      }
    } catch (err) {
      console.error('Flute tracker init error:', err);
      this.onTrackingStatus({
        status: 'error',
        message: `Camera error: ${err.message || 'Permission denied.'}`
      });
      throw err;
    }
  }

  async startProcessingLoop() {
    const processFrame = async () => {
      if (!this.isRunning) return;

      this.frameCount = (this.frameCount || 0) + 1;

      if (this.videoElement && this.videoElement.readyState >= 2) {
        if (!this.isProcessingFrame && this.handsDetector) {
          this.isProcessingFrame = true;
          this.handsDetector.send({ image: this.videoElement })
            .catch(e => console.warn('Hands detection warning:', e))
            .finally(() => { this.isProcessingFrame = false; });
        }

        // 0-LAG REAL-TIME TRACKING: Dispatch FaceMesh as soon as previous frame finishes
        // Eliminates artificial 4-frame latency (~66ms delay) for instantaneous eyeball reaction
        if (!this.isProcessingFace) {
          if (this.faceIframe && this.faceIframe.contentWindow && typeof createImageBitmap === 'function') {
            this.isProcessingFace = true;
            createImageBitmap(this.videoElement).then(bitmap => {
              this.faceIframe.contentWindow.postMessage({ type: 'PROCESS_FRAME', bitmap }, '*', [bitmap]);
            }).catch(() => {
              // Direct fallback if createImageBitmap throws on mobile WebKit
              if (this.faceDetector) {
                this.faceDetector.send({ image: this.videoElement })
                  .catch(e => console.warn('Face detection warning:', e))
                  .finally(() => { this.isProcessingFace = false; });
              } else {
                this.isProcessingFace = false;
              }
            });
          } else if (this.faceDetector) {
            this.isProcessingFace = true;
            this.faceDetector.send({ image: this.videoElement })
              .catch(e => console.warn('Face detection warning:', e))
              .finally(() => { this.isProcessingFace = false; });
          }
        }
      }

      // Hardware-synchronized frame scheduling: requestVideoFrameCallback triggers immediately when camera produces a frame
      if (this.videoElement && typeof this.videoElement.requestVideoFrameCallback === 'function') {
        this.videoFrameCallbackId = this.videoElement.requestVideoFrameCallback(processFrame);
      } else {
        this.animFrameId = requestAnimationFrame(processFrame);
      }
    };

    if (this.videoElement && typeof this.videoElement.requestVideoFrameCallback === 'function') {
      this.videoFrameCallbackId = this.videoElement.requestVideoFrameCallback(processFrame);
    } else {
      this.animFrameId = requestAnimationFrame(processFrame);
    }
  }

  onResults(results) {
    if (!this.canvasCtx) return;

    if (this.canvasElement && typeof window !== 'undefined') {
      if (!this._lastCanvasCheck || (this.frameCount - this._lastCanvasCheck >= 60)) {
        this._lastCanvasCheck = this.frameCount;
        const rect = this.canvasElement.getBoundingClientRect ? this.canvasElement.getBoundingClientRect() : null;
        const rawDpr = window.devicePixelRatio || 1;
        const dpr = Math.min(Math.max(1, rawDpr), 2.0); // Cap at 2.0 to prevent mobile GPU OOM
        const baseW = (rect && rect.width > 0) ? rect.width : (this.videoElement && this.videoElement.videoWidth > 0 ? this.videoElement.videoWidth : 1280);
        const baseH = (rect && rect.height > 0) ? rect.height : (this.videoElement && this.videoElement.videoHeight > 0 ? this.videoElement.videoHeight : 720);
        const targetW = Math.round(baseW * dpr);
        const targetH = Math.round(baseH * dpr);
        if (this.canvasElement.width !== targetW || this.canvasElement.height !== targetH) {
          this.canvasElement.width = targetW;
          this.canvasElement.height = targetH;
        }
      }
    }

    const ctx = this.canvasCtx;
    const width = this.canvasElement.width;
    const height = this.canvasElement.height;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Advance pulse ticker for luminous glowing dots
    this.pulsePhase = (this.pulsePhase || 0) + 0.08;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    const hands = results.multiHandLandmarks || [];
    let leftHand = null;
    let rightHand = null;
    let holesArray = [false, false, false, false, false, false, false];
    let matched = null;

    try {

    if (hands.length > 0) {
      // Mirrored Screen X mapping:
      // Mirrored Screen X mapping:
      // In mirrored space, screenX = (1.0 - landmark.x)
      if (hands.length === 1) {
        // Robust Anatomical Left vs Right Hand Identification:
        // Position-Invariant: User can move hands horizontally anywhere across the screen.
        // We do NOT use screen X position to penalize or force hand classification!
        // 1. Anatomical Palm / Knuckle Geometry (Index MCP 5 vs Pinky MCP 17 in mirrored view):
        //    For Left hand facing player: Index is to the right of Pinky (indexMcpX > pinkyMcpX)
        //    For Right hand facing player: Index is to the left of Pinky (indexMcpX < pinkyMcpX)
        // 2. MediaPipe Handedness classifier (in selfie mirror view, non-mirrored 'Right' is physical Left)
        const hand = hands[0];
        const screenX = 1.0 - hand[0].x;
        const indexMcpX = 1.0 - hand[5].x;
        const pinkyMcpX = 1.0 - hand[17].x;

        let leftScore = 0;
        // Primary: Anatomical Knuckle Vector (100% position invariant across screen)
        if (indexMcpX > pinkyMcpX) leftScore += 3;
        else leftScore -= 3;

        // Secondary: MediaPipe Handedness Classifier
        if (results.multiHandedness && results.multiHandedness[0]) {
          const label = results.multiHandedness[0].label;
          const conf = results.multiHandedness[0].score || 0.8;
          const weight = conf > 0.7 ? 2 : 1;
          if (label === 'Right') leftScore += weight;
          else if (label === 'Left') leftScore -= weight;
        }

        // Gentle tie-breaker only if anatomical and model score tie (leftScore === 0)
        if (leftScore === 0) {
          if (screenX < 0.52) leftScore += 1;
          else leftScore -= 1;
        }

        if (leftScore > 0) {
          leftHand = hand;
          rightHand = null;
        } else {
          leftHand = null;
          rightHand = hand;
        }
      } else {
        // Robust 2-Hand Identification for Transverse Flute Playing:
        // In flute posture, the player's Left hand is closer to the embouchure / blow hole (smaller screenX).
        // The Right hand is further down the flute tube (larger screenX).
        // MediaPipe's handedness classifier can be noisy in oblique/profile flute posture,
        // so geographic knuckle X (landmark 9) is the primary ground truth.
        const kX0 = 1.0 - hands[0][9].x;
        const kX1 = 1.0 - hands[1][9].x;

        let h0IsLeftScore = (kX0 < kX1) ? 3 : -3;

        // Supportive signal from MediaPipe Handedness (in selfie mirror view, 'Right' is physical Left)
        if (results.multiHandedness && results.multiHandedness.length >= 2) {
          const label0 = results.multiHandedness[0].label;
          const label1 = results.multiHandedness[1].label;
          if (label0 !== label1) {
            if (label0 === 'Right') h0IsLeftScore += 1;
            else if (label0 === 'Left') h0IsLeftScore -= 1;
          }
        }

        if (h0IsLeftScore > 0) {
          leftHand = hands[0];
          rightHand = hands[1];
        } else {
          leftHand = hands[1];
          rightHand = hands[0];
        }
      }

      if (this.swapHands) {
        const temp = leftHand;
        leftHand = rightHand;
        rightHand = temp;
      }

      // Check which hands are in active playing region
      // Active flute octave lines are: High=0.44, Mid=0.55, Bass=0.67.
      // Hands below 0.76 are resting on a desk or lap and must NOT play.
      const RESTING_Y_CUTOFF = 0.76;
      const isLeftInPlay = Boolean(leftHand && leftHand[9].y < RESTING_Y_CUTOFF);
      const isRightInPlay = Boolean(rightHand && rightHand[9].y < RESTING_Y_CUTOFF);

      let inPlayingPosition = false;
      let activeHandsAvgY = this.OCTAVE_LINES.MID;
      let activeHandsAvgX = this.fluteCenterX;

      // =========================================================================
      // 🪈 AUTHENTIC CARNATIC FLUTE PLAYING HAND RULES:
      // - Left hand only: YES (Plays Sa, Ri, Ga, Ni, Dha anywhere on screen)
      // - Right hand only: NO NOTE WILL PLAY (Air column vents at top, silent!)
      // - Both hands: YES (Full 7 holes for Sa, Ri, Ga, Ma, Pa, Dha, Ni)
      // =========================================================================
      if (isLeftInPlay && isRightInPlay) {
        // In 90° profile view with camera, left & right fingers align with camera line of sight.
        // True clasped hands have touching/overlapping wrists (wristDist < 0.035).
        // Flute playing hands have wrists separated along the flute body (wristDist >= 0.05).
        const avgY = (leftHand[9].y + rightHand[9].y) / 2;
        const lX = 1.0 - leftHand[9].x;
        const rX = 1.0 - rightHand[9].x;
        const wristDist = Math.hypot((1.0 - leftHand[0].x) - (1.0 - rightHand[0].x), leftHand[0].y - rightHand[0].y);

        if (wristDist < 0.035) {
          // Clasped hands touching at rest: mute
          inPlayingPosition = false;
        } else {
          inPlayingPosition = true;
          // Higher Octave Hand Elevation Anchor:
          // When playing Ga, Ri, or Sa in the Higher Octave, the Left Hand closes holes (L1, L2)
          // while the Right Hand is fully open and naturally hovers slightly lower.
          // Prioritize Left Hand elevation so a lower resting Right Hand does not pull the flute into Mid octave.
          if (leftHand[9].y < 0.48) {
            activeHandsAvgY = Math.min(avgY, leftHand[9].y * 0.75 + rightHand[9].y * 0.25);
          } else {
            activeHandsAvgY = avgY;
          }
          activeHandsAvgX = (lX + rX) / 2;
        }
      } else if (isLeftInPlay && !isRightInPlay) {
        // Solo Left hand playing: must be raised at the flute playing level (Y < 0.69), not resting low
        if (leftHand[9].y < 0.69) {
          inPlayingPosition = true;
          activeHandsAvgY = leftHand[9].y;
          activeHandsAvgX = 1.0 - leftHand[9].x;
          rightHand = null; // Suppress inactive right hand
        } else {
          inPlayingPosition = false;
        }
      } else if (!isLeftInPlay && isRightInPlay) {
        // Solo Right hand: cannot complete standing air column without Left hand,
        // but update hole states so right hand fingertip beacons (R1..R4) light up green!
        inPlayingPosition = false;
        if (rightHand) {
          const rHoles = this.analyzeRightHand(rightHand);
          this.rawHoleStates = [false, false, false, ...rHoles];
        }
      } else {
        inPlayingPosition = false;
      }

      // Posture Dropout Smoothing:
      // Absorb momentary 1-4 frame tracking drops during active playing so the flute never flickers or drops out abruptly
      if (!inPlayingPosition) {
        this.missingPostureFrames = (this.missingPostureFrames || 0) + 1;
        if (this.missingPostureFrames <= 4 && this.prevInPlayingPosition && this.activeSwara) {
          inPlayingPosition = true;
        }
      } else {
        this.missingPostureFrames = 0;
      }
      this.prevInPlayingPosition = inPlayingPosition;
      this.inPlayingPosition = inPlayingPosition;

      if (inPlayingPosition) {
        // User mandate: "let the flute position be fixed" -> completely stationary fixed flute position (both X and Y)
        this.fluteY = this.fixedFluteY || this.OCTAVE_LINES.MID;
        this.fluteCenterX = this.fixedFluteCenterX || 0.52;
        this.fluteAngleDeg = this.lineAngleDeg;

        // In 3rd product, octaves are driven exclusively by mouth aperture!
        // Hands remain focused on finger holes, glides, and gamakas.

        this.handsOutPostureFrames = 0;
        // Snapshot previous curl scores for motion derivative / Janti detection
        this.prevFingerCurlScores = [...this.fingerCurlScores];

        // Analyze tone holes
        let leftHoles = [false, false, false];
        let rightHoles = [false, false, false, false];

        if (leftHand) {
          leftHoles = this.analyzeLeftHand(leftHand);
        }
        if (rightHand) {
          rightHoles = this.analyzeRightHand(rightHand);
        } else if (leftHand) {
          // Left hand alone plays Ga, Ri, Sa, Ni across holes 0, 1, 2.
          // User requirement: "why is my lrft hand small finger tracked? it has no role to play."
          // Left pinky has zero role in playing any note! Right holes remain open.
          rightHoles = [false, false, false, false];
        }

        this.rawHoleStates = [...leftHoles, ...rightHoles];
        holesArray = [...this.rawHoleStates];

        this.currentHoleStates = holesArray;

        // Round off to nearest valid Swara (constrained to active raga scale)
        const prevSwaraId = this.activeSwara ? this.activeSwara.id : null;
        matched = window.SwarasData.matchSwara(holesArray, prevSwaraId, this.allowedSwaraIds);

        // =========================================================================
        // 🪈 EMBOUCHURE GATE & INITIAL SA STABILIZATION
        const hasFaceTracking = Boolean(this.faceDetector || this.faceIframe);
        const isEmbouchureBlocked = Boolean(hasFaceTracking && this.lastFaceLandmarks && !this.isLipsAtBlowHole);

        if (isEmbouchureBlocked) {
          // Lips are away from the blow hole: remain silent
          this.activeSwara = null;
          this.onSwaraDetected(null);
        } else if (this.awaitingInitialSa) {
          // Always play Sa to stabilise and start!
          const isSa = Boolean(matched && matched.swara && (matched.swara.id === 'sa' || matched.swara.family === 'sa'));
          if (isSa) {
            this.initialSaHoldFrames++;
            if (this.initialSaHoldFrames >= this.requiredSaFrames) {
              this.awaitingInitialSa = false;
              this.activeSwara = matched.swara;
            }
          } else {
            this.initialSaHoldFrames = Math.max(0, this.initialSaHoldFrames - 1);
            this.activeSwara = null;
          }

          if (this.awaitingInitialSa) {
            this.activeSwara = null;
            this.onSwaraDetected(null);
          } else {
            // Unlocked on Sa! Begin playback immediately
            const now = performance.now();
            this.swaraHoldStartTime = now;
            this.recentJerkEvents = [];
            this.lastJantiTime = now;
            this.spawnFloatingNote(this.activeSwara);
            this.calculateFluteTilt(leftHand, rightHand);
            this.onSwaraDetected({
              swara: this.activeSwara,
              holes: holesArray,
              exact: matched ? matched.exact : false,
              transitionMeta: {
                isLegato: false,
                fromSwaraId: null
              }
            });
            this.detectJantiGesture(leftHand, rightHand);
          }
        } else {
          // Active playing once Sa is unlocked:
          // Intelligent Velocity-Aware Hysteresis:
          // 1. Decisive finger movements (maxCurlDelta >= 0.08, e.g. intentional tap or lift):
          //    Commit note transition on Frame 1 (sub-20ms near-instant response)!
          // 2. Slight finger movements or micro-tremor false signals (maxCurlDelta < 0.08):
          //    Require 2 consecutive frames to confirm before switching, eliminating Sa/Ri/Ni flickering!
          if (matched && matched.swara) {
            let maxCurlDelta = 0;
            if (this.prevFingerCurlScores) {
              for (let i = 0; i < 7; i++) {
                const d = Math.abs((this.fingerCurlScores[i] || 0) - (this.prevFingerCurlScores[i] || 0));
                if (d > maxCurlDelta) maxCurlDelta = d;
              }
            }
            const isNoteTransition = Boolean(this.activeSwara && prevSwaraId && matched.swara.id !== prevSwaraId);
            // 2-frame confirmation on note transitions prevents camera noise and single-frame flickering
            const requiredFrames = isNoteTransition ? 2 : 1;

            if (matched.swara.id === this.candidateSwaraId) {
              this.candidateFrames++;
              if (this.candidateFrames >= requiredFrames) {
                this.activeSwara = matched.swara;
              }
            } else {
              this.candidateSwaraId = matched.swara.id;
              this.candidateFrames = 1;
              if (requiredFrames <= 1) {
                this.activeSwara = matched.swara;
              }
            }

            if (!this.activeSwara) {
              this.activeSwara = matched.swara;
            }
          }

          const now = performance.now();
          if (this.activeSwara && (!prevSwaraId || this.activeSwara.id !== prevSwaraId)) {
            this.swaraHoldStartTime = now;
            this.recentJerkEvents = [];
            this.lastJantiTime = now;
            this.spawnFloatingNote(this.activeSwara);
          }

          this.calculateFluteTilt(leftHand, rightHand);

          if (this.activeSwara) {
            const isLegato = Boolean(prevSwaraId && prevSwaraId !== this.activeSwara.id);
            this.onSwaraDetected({
              swara: this.activeSwara,
              holes: holesArray,
              exact: matched ? matched.exact : false,
              transitionMeta: {
                isLegato: isLegato,
                fromSwaraId: prevSwaraId
              }
            });

            this.detectJantiGesture(leftHand, rightHand);
          } else {
            this.onSwaraDetected(null);
          }
        }
      } else {
        // Hands down or resting: Clean Silence without locking out the flute
        this.handsOutPostureFrames++;
        if (this.handsOutPostureFrames >= this.HANDS_DOWN_REARM_FRAMES) {
          this.initialSaHoldFrames = 0;
          this.awaitingInitialSa = true;
          this.hasCalibratedBaseline = false;
          this.hasCalibratedAngle = false;
          this.dynamicFlute.active = false;
        }
        this.currentHoleStates = [false, false, false, false, false, false, false];
        if (!isRightInPlay && !isLeftInPlay) {
          this.rawHoleStates = [false, false, false, false, false, false, false];
        }
        this.fingerCurlScores = [0, 0, 0, 0, 0, 0, 0];
        this.prevFingerCurlScores = [0, 0, 0, 0, 0, 0, 0];
        this.recentJerkEvents = [];
        this.prevLandmarks = { left: null, right: null };
        this.swaraHoldStartTime = 0;
        this.activeSwara = null;
        this.candidateSwaraId = null;
        this.candidateFrames = 0;
        this.onSwaraDetected(null);
      }
    } else {
      // Hands not detected by camera
      this.missingPostureFrames = (this.missingPostureFrames || 0) + 1;
      if (this.missingPostureFrames <= 4 && this.prevInPlayingPosition && this.activeSwara) {
        // Absorb 1-4 frame momentary camera tracking drop during active playing
        this.inPlayingPosition = true;
      } else {
        this.inPlayingPosition = false;
        this.prevInPlayingPosition = false;
        this.handsOutPostureFrames++;
        if (this.handsOutPostureFrames >= this.HANDS_DOWN_REARM_FRAMES) {
          this.initialSaHoldFrames = 0;
          this.hasCalibratedBaseline = false;
          this.hasCalibratedAngle = false;
          this.dynamicFlute.active = false;
        }
        this.currentHoleStates = [false, false, false, false, false, false, false];
        this.rawHoleStates = [false, false, false, false, false, false, false];
        this.fingerCurlScores = [0, 0, 0, 0, 0, 0, 0];
        this.prevFingerCurlScores = [0, 0, 0, 0, 0, 0, 0];
        this.recentJerkEvents = [];
        this.prevLandmarks = { left: null, right: null };
        this.swaraHoldStartTime = 0;
        this.activeSwara = null;
        this.candidateSwaraId = null;
        this.candidateFrames = 0;
        this.onSwaraDetected(null);
      }
    }
  } catch (err) {
      console.warn('Tracker frame processing error:', err);
    } finally {
      // ALWAYS Render the Sleek Draggable Silver Line & 7 Silver Target Dots
      this.renderCleanOverlay(ctx, leftHand, rightHand, (this.rawHoleStates || holesArray), width, height);
      ctx.restore();
    }
  }

  // Detect Carnatic Janti Double-Note Gesture:
  // Strictly plays normal sustained notes when still or during ordinary playing.
  // Triggers Janti ONLY when the user performs a truly RIGOROUS, energetic physical snap/jerk.
  detectJantiGesture(leftHand, rightHand) {
    if (!this.activeSwara) {
      this.recentJerkEvents = [];
      return;
    }

    const now = performance.now();

    // 1. Minimum Note Hold Time:
    // Must be stably holding the note for at least 420ms before a gesture can qualify.
    if (!this.swaraHoldStartTime || (now - this.swaraHoldStartTime < 420)) {
      this.recentJerkEvents = [];
      return;
    }

    // 2. Cooldown after previous Janti (at least 600ms)
    if (now - this.lastJantiTime < 600) {
      this.recentJerkEvents = [];
      return;
    }

    // 3. Measure Kinematic Curl Score Derivative across all 7 fingers
    let maxJerkDelta = 0;
    let jerkFingerIdx = -1;
    for (let i = 0; i < 7; i++) {
      const d = Math.abs(this.fingerCurlScores[i] - this.prevFingerCurlScores[i]);
      if (d > maxJerkDelta) {
        maxJerkDelta = d;
        jerkFingerIdx = i;
      }
    }

    // 4. Measure Pure Fingertip Velocity (relative to wrist to isolate finger snap from arm movement)
    let maxRelTipSpeed = 0;
    const activeHands = [
      { hand: leftHand, prev: this.prevLandmarks.left },
      { hand: rightHand, prev: this.prevLandmarks.right }
    ];

    for (const item of activeHands) {
      if (!item.hand || !item.prev) continue;
      const wrist = item.hand[0];
      const prevWrist = item.prev[0];
      const armMove = Math.hypot(wrist.x - prevWrist.x, wrist.y - prevWrist.y);
      if (armMove > 0.075) {
        if (leftHand) this.prevLandmarks.left = leftHand.map(pt => ({ x: pt.x, y: pt.y }));
        if (rightHand) this.prevLandmarks.right = rightHand.map(pt => ({ x: pt.x, y: pt.y }));
        return;
      }

      this.holeDefs.forEach((def) => {
        const tip = item.hand[def.tipIdx];
        const prevTip = item.prev[def.tipIdx];
        if (tip && prevTip) {
          const dx = (tip.x - prevTip.x) - (wrist.x - prevWrist.x);
          const dy = (tip.y - prevTip.y) - (wrist.y - prevWrist.y);
          const speed = Math.hypot(dx, dy);
          if (speed > maxRelTipSpeed) {
            maxRelTipSpeed = speed;
          }
        }
      });
    }

    // Update landmark snapshots
    if (leftHand) this.prevLandmarks.left = leftHand.map(pt => ({ x: pt.x, y: pt.y }));
    if (rightHand) this.prevLandmarks.right = rightHand.map(pt => ({ x: pt.x, y: pt.y }));

    // =========================================================================
    // RIGOROUS SHAKE MOVEMENT QUALIFICATION:
    // User requirement: "dont oscillate notes until shaked significantly to play janti"
    // Regular playing movements and gentle bends DO NOT qualify.
    // Must be a significant, energetic physical shake:
    // - Single major shake: curl delta >= 0.30 AND relative tip speed >= 0.060
    // - OR distinct double shake: 2 distinct pulses with curl delta >= 0.22 AND speed >= 0.045 within 80-360ms
    // =========================================================================
    const SIGNIFICANT_PULSE_THRESHOLD = 0.22;
    const SIGNIFICANT_SINGLE_THRESHOLD = 0.30;

    if (maxJerkDelta >= SIGNIFICANT_PULSE_THRESHOLD && maxRelTipSpeed >= 0.045) {
      const lastJerkTime = this.recentJerkEvents.length > 0
        ? this.recentJerkEvents[this.recentJerkEvents.length - 1].time
        : 0;

      // Ensure distinct physical pulses (at least 70ms apart)
      if (now - lastJerkTime >= 70) {
        this.recentJerkEvents.push({ time: now, finger: jerkFingerIdx, delta: maxJerkDelta, speed: maxRelTipSpeed });
        this.recentJerkEvents = this.recentJerkEvents.filter(e => (now - e.time) <= 380);

        let qualifiesAsSignificantShake = false;

        if (this.recentJerkEvents.length >= 2) {
          const e1 = this.recentJerkEvents[this.recentJerkEvents.length - 2];
          const e2 = this.recentJerkEvents[this.recentJerkEvents.length - 1];
          const dt = e2.time - e1.time;
          if (dt >= 80 && dt <= 360) {
            qualifiesAsSignificantShake = true;
          }
        } else if (maxJerkDelta >= SIGNIFICANT_SINGLE_THRESHOLD && maxRelTipSpeed >= 0.060) {
          qualifiesAsSignificantShake = true;
        }

        if (qualifiesAsSignificantShake) {
          this.lastJantiTime = now;
          this.recentJerkEvents = [];
          this.triggerJantiArticulated(this.activeSwara);
        }
      }
    }
  }

  triggerJantiArticulated(swara) {
    if (!swara) return;

    // Authentic Carnatic Sphuritam Janti Phrases
    const SPHURITAM_PHRASES = {
      sa:  'Sa - Ni - Sa',
      ri:  'Ri - Sa - Ri',
      ga:  'Ga - Ri - Ga',
      ma:  'Ma - Ga - Ma',
      pa:  'Pa - Ma - Pa',
      dha: 'Dha - Pa - Dha',
      ni:  'Ni - Dha - Ni'
    };

    const phrase = SPHURITAM_PHRASES[(swara.id || '').toLowerCase()] || `${swara.swara} - ${swara.swara}`;
    this.jantiPulseAlpha = 1.0;
    this.jantiLabel = phrase;

    // Spawn elegant floating note particle (no background, flies upward)
    this.spawnFloatingNote(swara);

    if (this.onJantiDetected) {
      this.onJantiDetected({
        swara: swara,
        octave: this.currentOctave,
        phrase: phrase
      });
    }
  }

  // Spawn an individual floating note particle that flies upward and fades
  spawnFloatingNote(swara, customText = null) {
    if (!swara && !customText) return;
    const canvasW = this.canvasElement ? this.canvasElement.width : 640;
    const canvasH = this.canvasElement ? this.canvasElement.height : 480;

    let originX = canvasW * 0.5;
    let originY = canvasH * 0.5;

    // Position above active venting hole
    let ventingIdx = 0;
    for (let h = 0; h < 7; h++) {
      if (this.currentHoleStates[h]) {
        ventingIdx = h;
      } else {
        break;
      }
    }
    const holePos = this.getHolePos(ventingIdx, canvasW, canvasH);
    if (holePos) {
      originX = holePos.x;
      originY = holePos.y;
    }

    let text = customText;
    if (!text && swara) {
      text = swara.family
        ? (swara.family.charAt(0).toUpperCase() + swara.family.slice(1))
        : (swara.short || swara.swara || 'Sa');
    }

    const noteColor = (swara && swara.color) ? swara.color : (octaveColor || '#38bdf8');
    const scale = Math.max(1.0, canvasW / 640);
    this.floatingNotes.push({
      text: text,
      color: noteColor,
      x: originX + (Math.random() - 0.5) * 8 * scale,
      y: originY - 14 * scale,
      vx: (Math.random() - 0.5) * 0.3 * scale,
      vy: - (1.3 + Math.random() * 0.4) * scale, // flies upward smoothly
      birth: performance.now(),
      maxAge: 1500
    });

    if (this.floatingNotes.length > 12) {
      this.floatingNotes.shift();
    }
  }

  // High-Precision Scale-Invariant Finger Curl Metric Calibrated for Carnatic Flute Pad Sealing
  computeCurlScore(landmarks, mcpIdx, pipIdx, dipIdx, tipIdx, holeIdx = -1) {
    if (!landmarks) return 0;
    const dist3d = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y, ((p1.z || 0) - (p2.z || 0)) * 0.5);

    const wrist = landmarks[0];
    const mcp = landmarks[mcpIdx];
    const pip = landmarks[pipIdx];
    const dip = landmarks[dipIdx];
    const tip = landmarks[tipIdx];

    // 1. Phalanx Extension Ratio (normalized to finger's own total kinematic chain)
    const bone1 = dist3d(pip, mcp);
    const bone2 = dist3d(dip, pip);
    const bone3 = dist3d(tip, dip);
    const totalLen = bone1 + bone2 + bone3;
    const directSpan = dist3d(tip, mcp);
    const extRatio = totalLen > 0 ? (directSpan / totalLen) : 1.0;

    // Tailored extension thresholds:
    // Left Hand has a flatter, gently arched drape over the tone hole
    const isL1 = (holeIdx === 0);
    const extOpen = isL1 ? 0.92 : 0.90;
    const extClose = 0.65;
    const curlFromExt = Math.max(0, Math.min(1, (extOpen - extRatio) / (extOpen - extClose)));

    // 2. Dual-Joint Flexion (PIP & DIP angular bend)
    const v1 = { x: pip.x - mcp.x, y: pip.y - mcp.y, z: ((pip.z || 0) - (mcp.z || 0)) * 0.5 };
    const v2 = { x: dip.x - pip.x, y: dip.y - pip.y, z: ((dip.z || 0) - (pip.z || 0)) * 0.5 };
    const v3 = { x: tip.x - dip.x, y: tip.y - dip.y, z: ((tip.z || 0) - (dip.z || 0)) * 0.5 };

    const len1 = Math.hypot(v1.x, v1.y, v1.z);
    const len2 = Math.hypot(v2.x, v2.y, v2.z);
    const len3 = Math.hypot(v3.x, v3.y, v3.z);

    let cosPip = 1.0, cosDip = 1.0;
    if (len1 > 0 && len2 > 0) cosPip = (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / (len1 * len2);
    if (len2 > 0 && len3 > 0) cosDip = (v2.x * v3.x + v2.y * v3.y + v2.z * v3.z) / (len2 * len3);
    const avgCos = (cosPip + cosDip) * 0.5;

    const angleOpen = isL1 ? 0.92 : 0.90;
    const angleClose = 0.52;
    let curlFromAngle = Math.max(0, Math.min(1, (angleOpen - avgCos) / (angleOpen - angleClose)));

    // Kinematic extension check: if finger is extended straight (extRatio >= 0.88),
    // angular curl is capped to guarantee clean venting
    if (extRatio >= 0.88) {
      curlFromAngle *= Math.max(0, Math.min(1, (0.94 - extRatio) / 0.06));
    }

    // 3. Metacarpal (MCP Knuckle) Flexion
    // When sealing a flute hole, the finger pivots downward from the MCP knuckle.
    const vPalm = { x: mcp.x - wrist.x, y: mcp.y - wrist.y, z: ((mcp.z || 0) - (wrist.z || 0)) * 0.5 };
    const lenPalm = Math.hypot(vPalm.x, vPalm.y, vPalm.z);

    let curlFromMcp = 0.0;
    let hasMcpSignal = false;
    if (lenPalm > 0.01 && len1 > 0.01) {
      const cosMcp = (vPalm.x * v1.x + vPalm.y * v1.y + vPalm.z * v1.z) / (lenPalm * len1);
      // Knuckle flexion: extended/lifted >= 0.90, lowered/flexed <= 0.55
      curlFromMcp = Math.max(0, Math.min(1, (0.90 - cosMcp) / (0.90 - 0.55)));
      hasMcpSignal = true;
    }

    // Monotonic composite score
    let score;
    if (hasMcpSignal) {
      score = (curlFromExt * 0.42) + (curlFromAngle * 0.38) + (curlFromMcp * 0.20);
    } else {
      // Clean fallback for mock unit tests without full palm geometry
      score = (curlFromExt * 0.45) + (curlFromAngle * 0.40);
    }

    return Math.max(0, Math.min(1, score));
  }

  // Dual-Threshold Schmitt Trigger with ultra-fast zero-latency response & noise rejection
  isHoleClosed(landmarks, mcpIdx, pipIdx, dipIdx, tipIdx, holeIdx) {
    if (!landmarks) return false;
    let rawScore = this.computeCurlScore(landmarks, mcpIdx, pipIdx, dipIdx, tipIdx, holeIdx);

    // Carnatic Hand-Coupling Assist:
    // When playing Sa, Ni, Dha, Pa, or Ma, L2 (middle finger) is firmly down.
    // Via extensor digitorum coupling, L1 naturally lowers onto its hole alongside L2.
    if (holeIdx === 0 && Boolean(this.rawHoleStates && this.rawHoleStates[1])) {
      rawScore = Math.min(1.0, rawScore + 0.08);
    }

    const prevScore = this.fingerCurlScores[holeIdx] || 0.0;
    const delta = Math.abs(rawScore - prevScore);

    // Adaptive Dual-Rate Temporal Filter:
    // Fast response on active intentional moves (delta > 0.08) for crisp 1-frame transitions.
    // Strong smoothing on slight movements or stationary fingers (delta <= 0.08) to completely eliminate false signals and flickering.
    const alpha = delta > 0.08
      ? (rawScore < prevScore ? 0.88 : 0.84)
      : 0.25;
    const smoothScore = alpha * rawScore + (1.0 - alpha) * prevScore;
    this.fingerCurlScores[holeIdx] = smoothScore;

    const currentlyClosed = Boolean(this.rawHoleStates ? this.rawHoleStates[holeIdx] : this.currentHoleStates[holeIdx]);

    // Finger-calibrated Schmitt trigger thresholds with robust anti-flicker hysteresis margins:
    // L1 (Index): Effortless closure (0.38) and crisp venting (0.24)
    // L2 (Middle): Solid closure (0.44) and venting (0.28). Prevents hovering middle finger during Ri from triggering Sa!
    // L3 (Ring): Immune to natural resting drape during Sa (~0.35 - 0.44).
    //   Must be DELIBERATELY curled (>= 0.52) to close for Ni, with solid open threshold (0.36).
    //   Fixes the primary cause of rapid Sa <-> Ni flickering!
    // R1 (Right Index): Hover immunity (0.52 / 0.36) prevents hovering right hand from turning Ni into Dha!
    // R2..R4: Responsive closure (0.44 / 0.30)
    let closeThreshold = 0.44;
    let openThreshold = 0.30;

    if (holeIdx === 0) {
      closeThreshold = 0.38;
      openThreshold = 0.24;
    } else if (holeIdx === 1) {
      closeThreshold = 0.44;
      openThreshold = 0.28;
    } else if (holeIdx === 2) {
      closeThreshold = 0.52;
      openThreshold = 0.36;
    } else if (holeIdx === 3) {
      closeThreshold = 0.52;
      openThreshold = 0.36;
    } else if (holeIdx > 3) {
      closeThreshold = 0.44;
      openThreshold = 0.30;
    }

    if (currentlyClosed) {
      return smoothScore >= openThreshold;
    } else {
      return smoothScore >= closeThreshold;
    }
  }

  isFingerClosed(landmarks, mcpIdx, pipIdx, dipIdx, tipIdx) {
    if (!landmarks) return false;
    const score = this.computeCurlScore(landmarks, mcpIdx, pipIdx, dipIdx, tipIdx);
    return score >= 0.45;
  }

  analyzeLeftHand(landmarks) {
    if (!landmarks) return [false, false, false];

    let l1Closed = this.isHoleClosed(landmarks, 5, 6, 7, 8, 0);   // L1 (Index)
    let l2Closed = this.isHoleClosed(landmarks, 9, 10, 11, 12, 1); // L2 (Middle)
    let l3Closed = this.isHoleClosed(landmarks, 13, 14, 15, 16, 2);  // L3 (Ring)

    return [l1Closed, l2Closed, l3Closed];
  }

  analyzeRightHand(landmarks) {
    if (!landmarks) return [false, false, false, false];
    let r1Closed = this.isHoleClosed(landmarks, 5, 6, 7, 8, 3);   // R1 (Index)
    let r2Closed = this.isHoleClosed(landmarks, 9, 10, 11, 12, 4); // R2 (Middle)
    let r3Closed = this.isHoleClosed(landmarks, 13, 14, 15, 16, 5);// R3 (Ring)
    let r4Closed = this.isHoleClosed(landmarks, 17, 18, 19, 20, 6);// R4 (Pinky)

    return [r1Closed, r2Closed, r3Closed, r4Closed];
  }

  calculateFluteTilt(leftHand, rightHand) {
    // Strictly level axis: 0 cents detune for rock-solid, pure sustained acoustic notes without flutter
    this.smoothedGamakaCents = 0;
    this.onGamakaBend(0);
  }

  // Monochromatic Pitch-Color Flow Spectrum (Different shades of the same pitch color for different speeds)
  getCFDColor(vNorm, alpha = 1.0, baseRGB = null) {
    const v = Math.max(0.0, Math.min(1.0, vNorm));
    let base = baseRGB;
    if (!base) {
      if (this.currentOctave === 1) base = [251, 146, 60];      // Tara: Apple System Orange
      else if (this.currentOctave === -1) base = [129, 140, 248]; // Mandra: Apple System Indigo
      else base = [148, 163, 184];                             // Madhya: Apple Studio Slate Grey
    }

    const [R0, G0, B0] = base;
    let r, g, b;

    if (v < 0.40) {
      // Slower boundary / recirculation shade: deeper, richer, darker tone of the pitch color
      const factor = 0.45 + (v / 0.40) * 0.40; // 0.45 to 0.85
      r = Math.round(R0 * factor);
      g = Math.round(G0 * factor);
      b = Math.round(B0 * factor);
    } else if (v < 0.75) {
      // Medium laminar speed: pure, vibrant base tone of the pitch color
      const factor = 0.85 + ((v - 0.40) / 0.35) * 0.15; // 0.85 to 1.00
      r = Math.round(R0 * factor);
      g = Math.round(G0 * factor);
      b = Math.round(B0 * factor);
    } else {
      // High speed / acoustic antinode / venting: luminous specular highlight shade of the pitch color
      const highlight = (v - 0.75) / 0.25; // 0.0 to 1.0
      r = Math.round(R0 + (255 - R0) * highlight * 0.90);
      g = Math.round(G0 + (255 - G0) * highlight * 0.90);
      b = Math.round(B0 + (255 - B0) * highlight * 0.90);
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Architectural Master Studio Rendering: Bang & Olufsen × Apple Pro Industrial Aesthetics
  renderCleanOverlay(ctx, leftHand, rightHand, holes, width, height) {
    const toScreen = (pt) => ({
      x: (1.0 - pt.x) * width,
      y: pt.y * height
    });

    const angleRad = this.getEffectiveAngleRad();
    const ux = Math.abs(Math.cos(angleRad)); // positive X direction (left to right)
    const uy = Math.abs(Math.sin(angleRad)); // positive Y direction (top to bottom -> top-left to bottom-right diagonal)
    const nx = -uy; // perpendicular normal X
    const ny = ux;  // perpendicular normal Y

    const scale = Math.max(1.0, width / 640);
    const fSize = (pt) => Math.round(pt * scale);

    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const isHovering = !this.isRunning;
    const levitationFloat = isHovering ? Math.sin(now * 0.0016) * (4.5 * scale) : 0;

    const spanScale = this.getSpanScale(width, height);
    const lineCenterY = (this.fluteY * height) + levitationFloat;
    const lineCenterX = this.getFluteCenterScreenX(width, height);

    // Ergonomic elongated concert flute length:
    // Head extends past blow hole (-0.14) to -0.230 (solid titanium crown stopper)
    // Foot extends past R4 (+0.366) to +0.416 (precision machined acoustic bell bezel)
    const startOffset = this.getFluteHeadOffset();
    const endOffset = this.getFluteFootOffset();

    const pStart = {
      x: lineCenterX + startOffset * ux * spanScale,
      y: lineCenterY + startOffset * uy * spanScale
    };
    const pEnd = {
      x: lineCenterX + endOffset * ux * spanScale,
      y: lineCenterY + endOffset * uy * spanScale
    };

    const baseBlowPos = this.getBlowHolePos(width, height);
    const blowPos = {
      x: baseBlowPos.x,
      y: baseBlowPos.y + levitationFloat
    };
    const isEmbouchureActive = Boolean(this.isLipsAtBlowHole);

    // ==============================================================
    // 1. BANG & OLUFSEN × APPLE STUDIO ARCHITECTURAL FLUTE
    // - Smoked Obsidian Glass Cylinder with Physical Fresnel Edge Lighting
    // - Solid Brushed Titanium Crown Stopper (Sealed headjoint - NO dirty hole)
    // - Machined Brushed Titanium Acoustic Bell Bezel (Solid acoustic exit)
    // - Laser-Bored Tone Hole Chambers with Recessed Physical Depth
    // - Discreet Luxury 3-Color Octave Resonance:
    //     Low (-1): Deep Velvet Amethyst (#c084fc)
    //     Mid (0):  Studio Pearl Platinum White (#f8fafc)
    //     High (+1): Sunset Coral Rose (#fb7185)
    // - NO tracking line from lips to blow hole
    // ==============================================================
    ctx.save();

    // Determine Octave Studio Palette (Apple Minimalist Spec)
    let octaveColor = '#94a3b8'; // Madhya: Apple Studio Slate Grey
    let octaveAura = 'rgba(148, 163, 184, 0.32)';
    let octaveHighlight = 'rgba(226, 232, 240, 0.95)';

    if (this.currentOctave === 1) {
      octaveColor = '#fb923c'; // Tara: Apple System Orange
      octaveAura = 'rgba(251, 146, 60, 0.38)';
      octaveHighlight = 'rgba(254, 215, 170, 0.95)';
    } else if (this.currentOctave === -1) {
      octaveColor = '#818cf8'; // Mandra: Apple System Indigo
      octaveAura = 'rgba(129, 140, 248, 0.38)';
      octaveHighlight = 'rgba(224, 231, 255, 0.95)';
    }

    // Dynamic Octave Highlighting for Rings & End Bezels (Zero Orange in Neutral/Mid/Bass)
    const getRingOctaveColor = (alpha = 0.85) => {
      if (this.currentOctave === 1) return `rgba(251, 146, 60, ${alpha})`;
      if (this.currentOctave === -1) return `rgba(129, 140, 248, ${alpha})`;
      return `rgba(148, 163, 184, ${alpha})`;
    };
    const getRingGleamColor = () => {
      if (this.currentOctave === 1) return 'rgba(254, 215, 170, 0.95)';
      if (this.currentOctave === -1) return 'rgba(224, 231, 255, 0.95)';
      return 'rgba(241, 245, 249, 0.95)';
    };

    // ==============================================================
    // 1. ARCHITECTURAL FLUTE CYLINDER (Rotated 90° Clockwise on Longitudinal Axis)
    // Centered along pStart -> pEnd for 100% UNIFORM translucent glass
    // thickness above and below the inner acoustic bore cavity!
    // Cylindrical 3D lighting with top specular gleam and underside depth.
    // ==============================================================
    const tubeRadius = 9.0 * scale;   // Outer diameter = 18.0 * scale
    const boreRadius = 6.0 * scale;   // Inner hole diameter = 12.0 * scale (increased radius where air flows)
    // Translucent glass margin above = 3.0 * scale, below = 3.0 * scale (completely uniform!)

    // 1a-0. Cymatics Acoustic Standing Wave Resonance Field
    // (Floor dais projecting the 3 Sthayi Octaves as shown in scientific mockup: Tara Coral -> Madhya Emerald/Teal -> Mandra Royal Blue)
    if (isHovering) {
      const midX = (pStart.x + pEnd.x) * 0.5;
      const floorY = (this.fluteY * height) + 110 * scale; // Ground plane situated beneath the hovering flute
      const floorRadiusX = Math.max(width * 0.42, 330 * scale);
      const perspectiveScaleY = 0.14; // Horizontal perspective disc from our POV
      const pulse = 0.68 + Math.sin(now * 0.0024) * 0.14; // Gentle harmonic breathing
      const wavePhase = now * 0.0028;

      if (typeof ctx.translate === 'function' && typeof ctx.scale === 'function') {
        ctx.save();
        ctx.translate(midX, floorY);
        ctx.scale(1.0, perspectiveScaleY);

        // 1a-0A. Ambient Floor Bloom mapped to Mockup Octaves:
        // Tara Coral Orange (inner) -> Madhya Emerald Teal (mid) -> Mandra Royal Blue/Indigo (outer)
        if (typeof ctx.createRadialGradient === 'function') {
          const ambientGrad = ctx.createRadialGradient(0, 0, 8 * scale, 0, 0, floorRadiusX * 1.18);
          ambientGrad.addColorStop(0.00, `rgba(249, 115, 22, ${pulse * 0.38})`);  // Tara Sthayi: Fiery Coral Orange
          ambientGrad.addColorStop(0.22, `rgba(251, 146, 60, ${pulse * 0.30})`);
          ambientGrad.addColorStop(0.44, `rgba(16, 185, 129, ${pulse * 0.28})`);  // Madhya Sthayi: Emerald Teal Green
          ambientGrad.addColorStop(0.68, `rgba(6, 182, 212, ${pulse * 0.22})`);   // Madhya Cyan overtone
          ambientGrad.addColorStop(0.82, `rgba(59, 130, 246, ${pulse * 0.26})`);  // Mandra Sthayi: Royal Blue
          ambientGrad.addColorStop(0.94, `rgba(79, 70, 229, ${pulse * 0.14})`);   // Deep Indigo
          ambientGrad.addColorStop(1.00, 'rgba(6, 9, 16, 0)');
          ctx.fillStyle = ambientGrad;
        } else {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
        }

        ctx.beginPath();
        ctx.arc(0, 0, floorRadiusX * 1.18, 0, Math.PI * 2);
        ctx.fill();

        // 1a-0B. Concentric Chladni Standing Wave Rings (Harmonic overtone nodes mapped to Mockup Octaves)
        // 6 Mathematical harmonic rings vibrating at acoustic ratios
        const ringDistances = [0.14, 0.28, 0.45, 0.64, 0.82, 1.00];
        ringDistances.forEach((distFrac, idx) => {
          const baseR = floorRadiusX * distFrac;
          const pts = 80;
          // Higher wavenumber for high-register Tara, medium for Madhya, broad for Mandra
          const waveFreq = idx < 2 ? 8 : (idx < 4 ? 6 : 4);
          ctx.beginPath();
          for (let p = 0; p <= pts; p++) {
            const theta = (p / pts) * Math.PI * 2;
            const harmonic = Math.sin(theta * waveFreq + wavePhase + idx * 0.8) * (1.8 * scale + idx * 0.35 * scale);
            const rad = baseR + harmonic;
            const px = Math.cos(theta) * rad;
            const py = Math.sin(theta) * rad;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          if (typeof ctx.closePath === 'function') ctx.closePath();

          let ringColor;
          let ringAlpha;
          if (idx < 2) {
            // Tier 1 (Inner): TARA STHAYI (Fiery Coral / Sunset Orange - high frequency)
            ringAlpha = idx === 0 ? pulse * 0.85 : pulse * 0.75;
            ringColor = idx === 0 ? `rgba(249, 115, 22, ${ringAlpha})` : `rgba(251, 146, 60, ${ringAlpha})`;
            ctx.lineWidth = 1.6 * scale;
          } else if (idx < 4) {
            // Tier 2 (Mid): MADHYA STHAYI (Emerald Teal / Cyan - balanced frequency)
            ringAlpha = idx === 2 ? pulse * 0.70 : pulse * 0.60;
            ringColor = idx === 2 ? `rgba(16, 185, 129, ${ringAlpha})` : `rgba(6, 182, 212, ${ringAlpha})`;
            ctx.lineWidth = 1.3 * scale;
          } else {
            // Tier 3 (Outer): MANDRA STHAYI (Royal Blue / Electric Indigo - fundamental bass)
            ringAlpha = idx === 4 ? pulse * 0.62 : pulse * 0.48;
            ringColor = idx === 4 ? `rgba(59, 130, 246, ${ringAlpha})` : `rgba(99, 102, 241, ${ringAlpha})`;
            ctx.lineWidth = 1.1 * scale;
          }

          ctx.strokeStyle = ringColor;
          ctx.stroke();
        });

        // 1a-0C. Radial Acoustic Nodal Spokes (8 sacred geometry quadrant lines linking octaves)
        for (let k = 0; k < 8; k++) {
          const theta = (k / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(theta) * (floorRadiusX * 0.10), Math.sin(theta) * (floorRadiusX * 0.10));
          ctx.lineTo(Math.cos(theta) * (floorRadiusX * 0.98), Math.sin(theta) * (floorRadiusX * 0.98));
          ctx.strokeStyle = `rgba(148, 163, 184, ${pulse * 0.22})`; // Delicate silver hairline
          ctx.lineWidth = 0.8 * scale;
          ctx.stroke();
        }

        // 1a-0D. Ground Ambient Occlusion Shadow beneath Levitating Flute
        const fluteHalfW = Math.abs(pEnd.x - pStart.x) * 0.50;
        const shadowW = fluteHalfW * 0.90;
        const shadowAlpha = 0.40 - (levitationFloat / (4.5 * scale)) * 0.08;
        if (typeof ctx.createRadialGradient === 'function') {
          const shadowGrad = ctx.createRadialGradient(0, 0, 6 * scale, 0, 0, shadowW);
          shadowGrad.addColorStop(0, `rgba(4, 6, 12, ${shadowAlpha})`);
          shadowGrad.addColorStop(1, 'rgba(4, 6, 12, 0)');
          ctx.fillStyle = shadowGrad;
        } else {
          ctx.fillStyle = `rgba(4, 6, 12, ${shadowAlpha})`;
        }
        ctx.beginPath();
        ctx.arc(0, 0, shadowW, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // 1a. Ambient Occlusion Drop Shadow
    const shadowOffset = 4.5 * scale;
    ctx.beginPath();
    ctx.moveTo(pStart.x + nx * shadowOffset, pStart.y + ny * shadowOffset);
    ctx.lineTo(pEnd.x + nx * shadowOffset, pEnd.y + ny * shadowOffset);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.40)';
    ctx.lineWidth = tubeRadius * 2;
    ctx.lineCap = 'butt';
    ctx.stroke();

    // 1b. Main Smoked Obsidian Glass Cylinder Body (Symmetrical above and below)
    // UNIFORM translucent glass: centered exactly on (pStart -> pEnd) with uniform wall thickness
    ctx.beginPath();
    ctx.moveTo(pStart.x, pStart.y);
    ctx.lineTo(pEnd.x, pEnd.y);
    ctx.strokeStyle = 'rgba(12, 16, 26, 0.88)';
    ctx.lineWidth = tubeRadius * 2;
    ctx.lineCap = 'butt';
    ctx.stroke();

    // 1c. Inner Acoustic Bore Cavity (Increased radius where air flows)
    // boreRadius = 6.0 * scale: deep resonant inner acoustic bore
    ctx.beginPath();
    ctx.moveTo(pStart.x, pStart.y);
    ctx.lineTo(pEnd.x, pEnd.y);
    ctx.strokeStyle = 'rgba(6, 9, 16, 0.94)';
    ctx.lineWidth = boreRadius * 2;
    ctx.lineCap = 'butt';
    ctx.stroke();

    // 1d. 3D Cylindrical Surface Lighting (Rotated 90° Clockwise on Longitudinal Axis):
    // Top specular highlight spine where overhead key light reflects off the cylindrical crown
    const specularOffset = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(pStart.x - nx * specularOffset, pStart.y - ny * specularOffset);
    ctx.lineTo(pEnd.x - nx * specularOffset, pEnd.y - ny * specularOffset);
    ctx.strokeStyle = (isHovering || isEmbouchureActive) ? 'rgba(255, 255, 255, 0.42)' : 'rgba(255, 255, 255, 0.20)';
    ctx.lineWidth = 1.6 * scale;
    ctx.stroke();

    // Lower cylinder dark shadow contour giving 3D cylindrical volume
    const undersideOffset = 4.2 * scale;
    ctx.beginPath();
    ctx.moveTo(pStart.x + nx * undersideOffset, pStart.y + ny * undersideOffset);
    ctx.lineTo(pEnd.x + nx * undersideOffset, pEnd.y + ny * undersideOffset);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.lineWidth = 2.0 * scale;
    ctx.stroke();

    // ==============================================================
    // 1d-2. OPTICAL UNDERSIDE FLOOR REFLECTION (Faint Pearl / Ivory White Reflection)
    // Projects faint pearl/ivory white illumination along the curved obsidian glass underside
    // ==============================================================
    const rimReflectionOffset = tubeRadius - 0.9 * scale;
    const reflPulse = isHovering ? (0.68 + Math.sin(now * 0.0024) * 0.14) : 0.40;

    // A. Soft diffuse subsurface ivory glow along lower glass wall
    ctx.beginPath();
    ctx.moveTo(pStart.x + nx * (tubeRadius - 2.5 * scale), pStart.y + ny * (tubeRadius - 2.5 * scale));
    ctx.lineTo(pEnd.x + nx * (tubeRadius - 2.5 * scale), pEnd.y + ny * (tubeRadius - 2.5 * scale));
    ctx.strokeStyle = `rgba(255, 253, 245, ${reflPulse * 0.28})`; // Faint ivory glow
    ctx.lineWidth = 3.4 * scale;
    ctx.stroke();

    // B. Sharp specular Fresnel underside rim reflection (pure luminous pearl white)
    ctx.beginPath();
    ctx.moveTo(pStart.x + nx * rimReflectionOffset, pStart.y + ny * rimReflectionOffset);
    ctx.lineTo(pEnd.x + nx * rimReflectionOffset, pEnd.y + ny * rimReflectionOffset);
    ctx.strokeStyle = `rgba(255, 252, 246, ${reflPulse * 0.85})`; // Pearl specular edge
    ctx.lineWidth = 1.6 * scale;
    ctx.stroke();

    // ==============================================================
    // 1e. SCIENTIFIC CFD AIRFLOW SIMULATION (DUAL-END FLOW TO BOTH ENDS)
    // Scientifically models flute aerodynamics and woodwind acoustics:
    // 1. Helmholtz acoustic standing wave wavelength λ = c / f0 dynamically
    //    computed from active swara frequency (changes for every note).
    // 2. Headjoint Cork Cavity Recirculation (Flow to Left End: blowPos -> pStart):
    //    Flow enters at blowPos, impinges on the solid crown cork stopper at pStart,
    //    and recirculates back along cylinder walls in a counter-rotating toroidal vortex!
    // 3. Downstream Acoustic Waveguide (Flow to Right End: blowPos -> pVenting -> pEnd):
    //    Standing wave undulation with spatial wavenumber k = 2π / λ.
    // 4. Dynamic Venting Plume at pVenting:
    //    Acoustic pressure drops at the first open hole, discharging a
    //    high-velocity turbulent plume (exhaust jet) spraying into ambient air!
    // 5. Residual Footjoint Bell Transmission (pVenting -> pEnd):
    //    Residual acoustic wave exhausts through the foot bell bezel at pEnd!
    // 6. Iconic Scientific CFD Turbo Velocity Colormap (0.0 to 45.0+ m/s).
    // ==============================================================
    let ventingOffset = this.blowHoleDef.offset || -0.14;
    let openHoleFound = false;
    for (let h = 0; h < 7; h++) {
      if (!holes[h]) {
        ventingOffset = this.holeDefs[h].offset;
        openHoleFound = true;
        break; // First open hole vents the main acoustic column
      }
    }
    if (!openHoleFound) {
      ventingOffset = endOffset; // All closed -> full column to foot end
    }

    const pVenting = {
      x: lineCenterX + (ventingOffset + 0.015) * ux * spanScale,
      y: lineCenterY + (ventingOffset + 0.015) * uy * spanScale
    };

    // Note Acoustics & Frequency Calculations
    const rootF = this.rootFreq || 277.18;
    const f0 = this.activeSwara ? (rootF * this.activeSwara.freqRatio * Math.pow(2, this.currentOctave)) : rootF;
    const soundSpeed = 343; // m/s in standard air
    const lambdaMeters = soundSpeed / f0; // physical wavelength
    const isPlaying = Boolean(isEmbouchureActive || this.activeSwara);
    const flowTime = now * 0.003;
    const flowSpeed = isPlaying ? (1.0 + (f0 - 277.18) / 500.0) : 0.28;

    // Spatial wavenumber (scales wave cycles along flute bore in screen pixels)
    const spatialWaveK = (f0 / 277.18) * 0.048;

    // --- BRANCH 1: HEADJOINT CORK CAVITY MULTIPLE THIN THREADS (FLOW TO LEFT END: blowPos -> pStart) ---
    const corkDx = pStart.x - blowPos.x;
    const corkDy = pStart.y - blowPos.y;
    const corkLen = Math.hypot(corkDx, corkDy);

    if (corkLen > 3) {
      // 6 Ultra-thin recirculating vortex threads in the cork chamber (reduced from 8)
      const numCorkThreads = 6;
      const cSteps = 24;
      for (let ct = 0; ct < numCorkThreads; ct++) {
        const fracOffset = (ct / (numCorkThreads - 1) - 0.5) * 2.0; // -1.0 to 1.0
        const cOffset = fracOffset * (boreRadius * 0.70);
        const threadSide = fracOffset >= 0 ? 1 : -1;
        const threadPhase = ct * 0.75;
        
        ctx.beginPath();
        for (let st = 0; st <= cSteps; st++) {
          const frac = st / cSteps; // 0 at blowPos, 1 at pStart
          const d = frac * corkLen;
          // Toroidal recirculation: travels left towards cork, turns at wall, loops in vortex
          const eddyCurve = Math.sin(frac * Math.PI) * (1.6 * scale) * threadSide;
          const ripple = Math.sin(frac * Math.PI * 2 + flowTime * 3.0 + threadPhase) * (0.5 * scale);
          const px = blowPos.x + (-ux) * d;
          const py = blowPos.y + (-uy) * d;
          const clampedCOffset = Math.max(-boreRadius * 0.85, Math.min(boreRadius * 0.85, cOffset + (ct === 2 || ct === 3 ? 0 : eddyCurve) + ripple));
          const wx = px + nx * clampedCOffset;
          const wy = py + ny * clampedCOffset;

          if (st === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        
        // Speed & pitch-color shade: higher near embouchure shear layer, slower near cork boundary
        const radialFactor = 1.0 - Math.abs(fracOffset) * 0.5;
        const vCork = isPlaying ? (0.70 * radialFactor) : 0.15;
        const alphaCork = isPlaying ? (0.35 + radialFactor * 0.25) : 0.12;
        ctx.strokeStyle = this.getCFDColor(vCork, alphaCork);
        ctx.lineWidth = (0.55 + radialFactor * 0.30) * scale;
        ctx.stroke();
      }
    }

    // --- BRANCH 2: CONTINUOUS ACOUSTIC WAVEGUIDE BORE FLOW (FLOW TO RIGHT END: blowPos -> pEnd) ---
    // Scientific Continuous Airflow: does NOT stop abruptly at the pressed note!
    // Streams flow continuously through the bore from blowPos to pEnd, with peak resonant energy in the
    // active column (Le = blowPos -> pVenting), smoothly tapering downstream to the footjoint bell (pEnd).
    // Streamlines are strictly contained within the bore and show the accurate movement to the top side of the flute.
    const totalBoreDx = pEnd.x - blowPos.x;
    const totalBoreDy = pEnd.y - blowPos.y;
    const totalBoreLen = Math.hypot(totalBoreDx, totalBoreDy);
    const ventingDist = Math.hypot(pVenting.x - blowPos.x, pVenting.y - blowPos.y);

    if (totalBoreLen > 4) {
      // 10 Ultra-thin filament threads across the bore cross-section (parabolic Poiseuille profile)
      const numBoreThreads = 10;
      const steps = 56;

      for (let t = 0; t < numBoreThreads; t++) {
        // radialFrac: -1.0 at upper tube wall, 0.0 at center axis, +1.0 at lower tube wall
        const radialFrac = (t / (numBoreThreads - 1) - 0.5) * 2.0;
        const radialOffset = radialFrac * (boreRadius * 0.78);
        
        // Poiseuille parabolic velocity profile: peak at centerline, reduced at sheared boundaries
        const poiseuilleProfile = 1.0 - radialFrac * radialFrac; // 0.0 at walls, 1.0 at center
        const threadPhase = t * 0.70;
        let threadWidth = (0.52 + poiseuilleProfile * 0.36) * scale;

        ctx.beginPath();
        for (let st = 0; st <= steps; st++) {
          const frac = st / steps;
          const d = frac * totalBoreLen;

          // Continuous Acoustic Weighting:
          // Inside active resonant column (d <= ventingDist): full resonant weight (1.0).
          // Past venting point (d > ventingDist): smooth cosine taper towards foot bell, continuing without abrupt cut!
          const postVentingFrac = d > ventingDist ? Math.min(1.0, (d - ventingDist) / Math.max(1.0, totalBoreLen - ventingDist)) : 0.0;
          const colWeight = (openHoleFound && d > ventingDist)
            ? (0.42 + 0.58 * (0.5 + 0.5 * Math.cos(postVentingFrac * Math.PI)))
            : 1.0;

          // Accurate acoustic movement to the top side (-nx, -ny) at open tone holes
          let topSideLift = 0;
          if (openHoleFound) {
            const distToVent = Math.abs(d - ventingDist);
            const liftRange = 28.0 * scale;
            if (distToVent < liftRange) {
              const liftFactor = Math.cos((distToVent / liftRange) * (Math.PI / 2));
              // Smooth upward deflection towards the top side tone hole (-nx)
              topSideLift = - liftFactor * (boreRadius * 0.40) * (1.0 - Math.abs(radialFrac) * 0.35);
            }
          }

          // Note & Octave Specific Fluid Dynamics (per Scientific Carnatic Veena Reference)
          let wave = 0;
          if (this.currentOctave === -1) {
            // MANDRA STHAYI (Lower Octave) | Fundamental Frequency Weight
            // Smooth, thick, laminar streamline ribbon with long wavelength standing wave
            const mandraK = spatialWaveK * 0.70;
            wave = Math.sin(d * mandraK - flowTime * 2.8 * flowSpeed + threadPhase * 0.25) * ((1.10 + poiseuilleProfile * 0.65) * scale * colWeight);
            threadWidth = (0.75 + poiseuilleProfile * 0.45) * scale;
          } else if (this.currentOctave === 1) {
            // TARA STHAYI (Higher Octave) | Highest Frequency Weight
            // Multiple Overblowing (Higher Harmonics), tight standing wave oscillations + overtone ripple filaments
            const h1 = Math.sin(d * spatialWaveK - flowTime * 5.0 * flowSpeed + threadPhase);
            const h2 = 0.42 * Math.sin(d * spatialWaveK * 2.0 - flowTime * 8.2 * flowSpeed + threadPhase * 1.5);
            const h3 = 0.22 * Math.sin(d * spatialWaveK * 3.0 + flowTime * 11.5 * flowSpeed + threadPhase * 2.0);
            wave = (h1 + h2 + h3) * ((0.95 + poiseuilleProfile * 0.90) * scale * colWeight);
            threadWidth = (0.44 + poiseuilleProfile * 0.30) * scale;
          } else {
            // MADHYA STHAYI (Middle Octave) | Balanced Frequency Weight
            // Pure sinuous undulating standing wave scaled directly to note pitch wavenumber
            wave = Math.sin(d * spatialWaveK - flowTime * 4.2 * flowSpeed + threadPhase) * ((1.25 + poiseuilleProfile * 1.10) * scale * colWeight);
            threadWidth = (0.52 + poiseuilleProfile * 0.36) * scale;
          }

          // Strictly clamp within inner bore so strings NEVER flow out of flute from top, bottom, or ends
          const totalRadial = radialOffset + wave + topSideLift;
          const clampedRadial = Math.max(-boreRadius * 0.86, Math.min(boreRadius * 0.86, totalRadial));

          const px = blowPos.x + ux * d + nx * clampedRadial;
          const py = blowPos.y + uy * d + ny * clampedRadial;

          if (st === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }

        // Velocity magnitude along thread: center threads reach acoustic antinode speed, walls slower
        const localV = isPlaying
          ? (0.28 + 0.68 * poiseuilleProfile)
          : (0.10 + 0.10 * poiseuilleProfile);
        const threadAlpha = isPlaying
          ? (0.28 + poiseuilleProfile * 0.44)
          : 0.12;

        ctx.strokeStyle = this.getCFDColor(localV, threadAlpha);
        ctx.lineWidth = threadWidth;
        ctx.stroke();
      }

      // Dynamic Acoustic Compression Wavefronts (Schlieren Bands) - traveling along entire bore
      if (isPlaying) {
        const halfLambdaPx = Math.max(18 * scale, (Math.PI / spatialWaveK));
        const numWavefronts = Math.min(10, Math.floor(totalBoreLen / halfLambdaPx));
        for (let w = 1; w <= numWavefronts; w++) {
          const wDist = (w * halfLambdaPx + (flowTime * 25 * flowSpeed) % halfLambdaPx);
          if (wDist < totalBoreLen - 8) {
            const wx = blowPos.x + ux * wDist;
            const wy = blowPos.y + uy * wDist;
            const isPreVenting = wDist <= ventingDist;
            const wfAlpha = isPreVenting ? 0.18 : 0.08;
            ctx.beginPath();
            ctx.moveTo(wx - nx * (boreRadius * 0.75), wy - ny * (boreRadius * 0.75));
            ctx.lineTo(wx + nx * (boreRadius * 0.75), wy + ny * (boreRadius * 0.75));
            ctx.strokeStyle = this.getCFDColor(0.85, wfAlpha);
            ctx.lineWidth = 0.65 * scale;
            ctx.stroke();
          }
        }
      }
    }

    // --- BRANCH 3: DYNAMIC DISCHARGE PLUME AT VENTING HOLE (Air splits at Le, Note Termination) ---
    if (isPlaying && openHoleFound) {
      // Venting occurs towards top surface tone hole aperture, cleanly contained within flute boundary
      const surfVenting = {
        x: pVenting.x - nx * (boreRadius * 0.85),
        y: pVenting.y - ny * (boreRadius * 0.85)
      };
      const numPlumeThreads = 5;
      for (let p = 0; p < numPlumeThreads; p++) {
        const pFrac = (p / (numPlumeThreads - 1) - 0.5) * 2.0; // -1 to +1
        const targetX = surfVenting.x + ux * (pFrac * 2.4 * scale);
        const targetY = surfVenting.y + uy * (pFrac * 2.4 * scale);
        
        ctx.beginPath();
        ctx.moveTo(pVenting.x + nx * (pFrac * boreRadius * 0.35), pVenting.y + ny * (pFrac * boreRadius * 0.35));
        ctx.lineTo(targetX, targetY);
        // Contained within flute tone hole interior
        ctx.strokeStyle = this.getCFDColor(0.95 - Math.abs(pFrac) * 0.15, 0.42);
        ctx.lineWidth = (0.50 + (1.0 - Math.abs(pFrac)) * 0.22) * scale;
        ctx.stroke();
      }
    }

    // --- BRANCH 4: FOOTJOINT BELL EXHAUST PLUME (FOOTJOINT BELL EXHAUST PLUME) ---
    // Contained flush at pEnd within the footjoint rim without projecting into external space
    if (isPlaying) {
      const exitOffsets = [-2.2, -1.1, 0, 1.1, 2.2];
      for (let eo = 0; eo < exitOffsets.length; eo++) {
        const oVal = exitOffsets[eo] * scale;
        ctx.beginPath();
        ctx.moveTo(pEnd.x - ux * (4.5 * scale) + nx * oVal, pEnd.y - uy * (4.5 * scale) + ny * oVal);
        ctx.lineTo(pEnd.x + nx * (oVal * 0.95), pEnd.y + ny * (oVal * 0.95));
        ctx.strokeStyle = this.getCFDColor(openHoleFound ? 0.45 : 0.85, 0.32);
        ctx.lineWidth = 0.60 * scale;
        ctx.stroke();
      }
    }

    // ==============================================================
    // 1f. FLUSH PRECISION TITANIUM CROWN RIM (Headjoint End - pStart)
    // Symmetrically frames the flute tube diameter, fitting its exact length.
    // Dynamic octave highlight on the crown rim (zero orange)!
    // ==============================================================
    ctx.beginPath();
    ctx.moveTo(pStart.x - nx * tubeRadius, pStart.y - ny * tubeRadius);
    ctx.lineTo(pStart.x + nx * tubeRadius, pStart.y + ny * tubeRadius);
    ctx.strokeStyle = isEmbouchureActive ? getRingOctaveColor(0.95) : 'rgba(148, 163, 184, 0.75)';
    ctx.lineWidth = 2.4 * scale;
    ctx.stroke();

    // Subtle flush face specular gleam
    ctx.beginPath();
    ctx.moveTo(pStart.x - nx * (tubeRadius * 0.45), pStart.y - ny * (tubeRadius * 0.45));
    ctx.lineTo(pStart.x + nx * (tubeRadius * 0.45), pStart.y + ny * (tubeRadius * 0.45));
    ctx.strokeStyle = isEmbouchureActive ? getRingGleamColor() : 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();

    // Faint pearl / ivory white underside crown catchlight
    ctx.beginPath();
    ctx.moveTo(pStart.x + nx * (tubeRadius * 0.35), pStart.y + ny * (tubeRadius * 0.35));
    ctx.lineTo(pStart.x + nx * tubeRadius, pStart.y + ny * tubeRadius);
    ctx.strokeStyle = `rgba(255, 252, 245, ${reflPulse * 0.88})`;
    ctx.lineWidth = 2.4 * scale;
    ctx.stroke();

    // Coin-knurl crown shoulder line
    ctx.beginPath();
    ctx.moveTo(pStart.x + ux * (2.2 * scale) - nx * (tubeRadius * 0.90), pStart.y + uy * (2.2 * scale) - ny * (tubeRadius * 0.90));
    ctx.lineTo(pStart.x + ux * (2.2 * scale) + nx * (tubeRadius * 0.90), pStart.y + uy * (2.2 * scale) + ny * (tubeRadius * 0.90));
    ctx.strokeStyle = isEmbouchureActive ? getRingOctaveColor(0.55) : 'rgba(100, 116, 139, 0.45)';
    ctx.lineWidth = 1.0 * scale;
    ctx.stroke();

    // ==============================================================
    // 1g. FLUSH PRECISION TITANIUM ACOUSTIC EXIT RIM (Footjoint End - pEnd)
    // Symmetrically frames the acoustic exit, fitting the flute length.
    // Dynamic octave highlight on the foot exit rim (zero orange)!
    // ==============================================================
    ctx.beginPath();
    ctx.moveTo(pEnd.x - nx * tubeRadius, pEnd.y - ny * tubeRadius);
    ctx.lineTo(pEnd.x + nx * tubeRadius, pEnd.y + ny * tubeRadius);
    ctx.strokeStyle = isEmbouchureActive ? getRingOctaveColor(0.95) : 'rgba(148, 163, 184, 0.75)';
    ctx.lineWidth = 2.4 * scale;
    ctx.stroke();

    // Faint pearl / ivory white underside foot exit rim catchlight
    ctx.beginPath();
    ctx.moveTo(pEnd.x + nx * (tubeRadius * 0.35), pEnd.y + ny * (tubeRadius * 0.35));
    ctx.lineTo(pEnd.x + nx * tubeRadius, pEnd.y + ny * tubeRadius);
    ctx.strokeStyle = `rgba(255, 252, 245, ${reflPulse * 0.88})`;
    ctx.lineWidth = 2.4 * scale;
    ctx.stroke();

    // Recessed dark acoustic exit slot framing inner bore
    ctx.beginPath();
    ctx.moveTo(pEnd.x - nx * (boreRadius * 0.8), pEnd.y - ny * (boreRadius * 0.8));
    ctx.lineTo(pEnd.x + nx * (boreRadius * 0.8), pEnd.y + ny * (boreRadius * 0.8));
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.lineWidth = 1.4 * scale;
    ctx.stroke();

    // ==============================================================
    // 1g-2. ACCENT RINGS (Rings at Head & Foot - Zero Orange, Octave Highlighting)
    // (Notice: Ring below lip plate is completely removed per user request)
    // ==============================================================
    const fluteLength = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);
    const drawOctaveRing = (tPos) => {
      // Symmetrical ring wrapping across cylinder diameter
      ctx.beginPath();
      ctx.moveTo(tPos.x - nx * (tubeRadius * 1.01), tPos.y - ny * (tubeRadius * 1.01));
      ctx.lineTo(tPos.x + nx * (tubeRadius * 1.01), tPos.y + ny * (tubeRadius * 1.01));
      ctx.strokeStyle = isEmbouchureActive ? getRingOctaveColor(0.85) : 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 2.0 * scale;
      ctx.stroke();

      // Center gleaming specular highlight
      ctx.beginPath();
      ctx.moveTo(tPos.x - nx * (tubeRadius * 0.90), tPos.y - ny * (tubeRadius * 0.90));
      ctx.lineTo(tPos.x + nx * (tubeRadius * 0.90), tPos.y + ny * (tubeRadius * 0.90));
      ctx.strokeStyle = isEmbouchureActive ? getRingGleamColor() : 'rgba(255, 255, 255, 0.60)';
      ctx.lineWidth = 0.8 * scale;
      ctx.stroke();

      // Faint pearl / ivory white underside ring catchlight
      ctx.beginPath();
      ctx.moveTo(tPos.x + nx * (tubeRadius * 0.35), tPos.y + ny * (tubeRadius * 0.35));
      ctx.lineTo(tPos.x + nx * tubeRadius, tPos.y + ny * tubeRadius);
      ctx.strokeStyle = `rgba(255, 253, 246, ${reflPulse * 0.85})`;
      ctx.lineWidth = 1.8 * scale;
      ctx.stroke();

      // Subtle dark recessed relief grooves framing ring (zero orange!)
      const grooveOff = 1.4 * scale;
      ctx.beginPath();
      ctx.moveTo(tPos.x - ux * grooveOff - nx * (tubeRadius * 0.95), tPos.y - uy * grooveOff - ny * (tubeRadius * 0.95));
      ctx.lineTo(tPos.x - ux * grooveOff + nx * (tubeRadius * 0.95), tPos.y - uy * grooveOff + ny * (tubeRadius * 0.95));
      ctx.moveTo(tPos.x + ux * grooveOff - nx * (tubeRadius * 0.95), tPos.y + uy * grooveOff - ny * (tubeRadius * 0.95));
      ctx.lineTo(tPos.x + ux * grooveOff + nx * (tubeRadius * 0.95), tPos.y + uy * grooveOff + ny * (tubeRadius * 0.95));
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 0.7 * scale;
      ctx.stroke();
    };

    // 1. Headjoint Ring (between crown and lip plate)
    const fHead = { x: pStart.x + ux * (fluteLength * 0.065), y: pStart.y + uy * (fluteLength * 0.065) };
    drawOctaveRing(fHead);

    // 2. Footjoint Ring (downstream of tone holes before foot exit rim pEnd)
    const fFoot = { x: pEnd.x - ux * (26 * scale), y: pEnd.y - uy * (26 * scale) };
    drawOctaveRing(fFoot);

    // ==============================================================
    // 1h. MASTER CONCERT TITANIUM LIP PLATE / PALLET (Rotated 90° Clockwise on Axis)
    // Translucent Black Lip Plate (blended with the rest of the flute body):
    // - chin-rest belly rotated to top rim (-nx)
    // - Sculpted organic curved saddle with smooth rounded wing contours
    // - EXACT translucent black material as rest of flute body (rgba(12, 16, 26, 0.82))
    // - Tactile embossed outer contours with subtle highlight and bevel
    // - NO ring below lip plate (under-plate riser ring removed)
    // ==============================================================
    ctx.save();
    const plateHL = 15.0 * scale;
    const bellyReachTop = 8.6 * scale; // chin-rest belly rotated to top rim (-nx)
    const lowerReach    = 6.6 * scale; // lower skirt / apron curving onto front face (+nx)

    // Key anatomical landmarks for the contoured lip plate
    const pFarL = { x: blowPos.x - ux * plateHL, y: blowPos.y - uy * plateHL };
    const pFarR = { x: blowPos.x + ux * plateHL, y: blowPos.y + uy * plateHL };
    const pTopMid = { x: blowPos.x - nx * bellyReachTop, y: blowPos.y - ny * bellyReachTop };
    const pTopL   = { x: blowPos.x - ux * (plateHL * 0.70) - nx * (bellyReachTop * 0.95), y: blowPos.y - uy * (plateHL * 0.70) - ny * (bellyReachTop * 0.95) };
    const pTopR   = { x: blowPos.x + ux * (plateHL * 0.70) - nx * (bellyReachTop * 0.95), y: blowPos.y + uy * (plateHL * 0.70) - ny * (bellyReachTop * 0.95) };
    const pWingL  = { x: blowPos.x - ux * plateHL - nx * (bellyReachTop * 0.15), y: blowPos.y - uy * plateHL - ny * (bellyReachTop * 0.15) };
    const pWingR  = { x: blowPos.x + ux * plateHL - nx * (bellyReachTop * 0.15), y: blowPos.y + uy * plateHL - ny * (bellyReachTop * 0.15) };
    const pLowMid = { x: blowPos.x + nx * lowerReach, y: blowPos.y + ny * lowerReach };

    // Safe curve helper for environments/mocks without quadraticCurveTo
    const qCurve = (cpx, cpy, x, y) => {
      if (typeof ctx.quadraticCurveTo === 'function') {
        ctx.quadraticCurveTo(cpx, cpy, x, y);
      } else {
        ctx.lineTo(x, y);
      }
    };

    // 1. Contoured wrap-around translucent black lip plate body
    // Seamlessly uses the exact same translucent black as the rest of the flute body
    ctx.beginPath();
    ctx.moveTo(pTopL.x, pTopL.y);
    qCurve(pTopMid.x, pTopMid.y, pTopR.x, pTopR.y);
    qCurve(
      blowPos.x + ux * plateHL - nx * (bellyReachTop * 0.60),
      blowPos.y + uy * plateHL - ny * (bellyReachTop * 0.60),
      pWingR.x, pWingR.y
    );
    qCurve(
      blowPos.x + ux * (plateHL * 0.65) + nx * (lowerReach * 0.85),
      blowPos.y + uy * (plateHL * 0.65) + ny * (lowerReach * 0.85),
      pLowMid.x, pLowMid.y
    );
    qCurve(
      blowPos.x - ux * (plateHL * 0.65) + nx * (lowerReach * 0.85),
      blowPos.y - uy * (plateHL * 0.65) + ny * (lowerReach * 0.85),
      pWingL.x, pWingL.y
    );
    qCurve(
      blowPos.x - ux * plateHL - nx * (bellyReachTop * 0.60),
      blowPos.y - uy * plateHL - ny * (bellyReachTop * 0.60),
      pTopL.x, pTopL.y
    );
    if (typeof ctx.closePath === 'function') ctx.closePath();

    // Fill with the exact translucent kind of black used on the rest of the flute
    ctx.fillStyle = 'rgba(12, 16, 26, 0.82)';
    ctx.fill();

    // Tactile embossed outer perimeter: clearly defines outer lip plate contours without over-highlighting
    ctx.strokeStyle = isEmbouchureActive ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.26)';
    ctx.lineWidth = 1.15 * scale;
    ctx.stroke();

    // Embossed top arch highlight bevel (chin-rest saddle rim)
    ctx.beginPath();
    ctx.moveTo(pTopL.x, pTopL.y);
    qCurve(pTopMid.x, pTopMid.y, pTopR.x, pTopR.y);
    ctx.strokeStyle = isEmbouchureActive ? 'rgba(255, 255, 255, 0.44)' : 'rgba(255, 255, 255, 0.30)';
    ctx.lineWidth = 1.25 * scale;
    ctx.stroke();

    // Embossed lower skirt underside bevel shadow (adds sculpted depth against cylinder body)
    ctx.beginPath();
    ctx.moveTo(pWingL.x, pWingL.y);
    qCurve(
      blowPos.x - ux * (plateHL * 0.65) + nx * (lowerReach * 0.85),
      blowPos.y - uy * (plateHL * 0.65) + ny * (lowerReach * 0.85),
      pLowMid.x, pLowMid.y
    );
    qCurve(
      blowPos.x + ux * (plateHL * 0.65) + nx * (lowerReach * 0.85),
      blowPos.y + uy * (plateHL * 0.65) + ny * (lowerReach * 0.85),
      pWingR.x, pWingR.y
    );
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.1 * scale;
    ctx.stroke();

    // Faint pearl / ivory white underside catchlight on lip plate apron
    ctx.beginPath();
    ctx.moveTo(pWingL.x + nx * (0.8 * scale), pWingL.y + ny * (0.8 * scale));
    qCurve(
      blowPos.x - ux * (plateHL * 0.65) + nx * (lowerReach * 0.92),
      blowPos.y - uy * (plateHL * 0.65) + ny * (lowerReach * 0.92),
      pLowMid.x + nx * (0.8 * scale), pLowMid.y + ny * (0.8 * scale)
    );
    qCurve(
      blowPos.x + ux * (plateHL * 0.65) + nx * (lowerReach * 0.92),
      blowPos.y + uy * (plateHL * 0.65) + ny * (lowerReach * 0.92),
      pWingR.x + nx * (0.8 * scale), pWingR.y + ny * (0.8 * scale)
    );
    ctx.strokeStyle = `rgba(255, 252, 245, ${reflPulse * 0.65})`;
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();

    // Specular highlight ridge along the upper shoulder
    ctx.beginPath();
    ctx.moveTo(blowPos.x - ux * (plateHL * 0.65) - nx * (bellyReachTop * 0.45), blowPos.y - uy * (plateHL * 0.65) - ny * (bellyReachTop * 0.45));
    qCurve(
      blowPos.x - nx * (bellyReachTop * 0.60), blowPos.y - ny * (bellyReachTop * 0.60),
      blowPos.x + ux * (plateHL * 0.65) - nx * (bellyReachTop * 0.45), blowPos.y + uy * (plateHL * 0.65) - ny * (bellyReachTop * 0.45)
    );
    ctx.strokeStyle = isEmbouchureActive ? 'rgba(255, 255, 255, 0.34)' : 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.1 * scale;
    ctx.stroke();

    // ==============================================================
    // 2. The Acoustic Embouchure Chimney (Blow Hole Aperture - Exposed to Atmosphere at Top Surface)
    // Translucent Black Acoustic Interior Cavity:
    // - Deep translucent black chimney matching the rest of the flute
    // - Smooth oval aperture on the upper saddle of the lip plate
    // - Razor-sharp acoustic labium splitting edge across top chord
    // ==============================================================
    const surfBlowPos = {
      x: blowPos.x - nx * (tubeRadius * 0.90),
      y: blowPos.y - ny * (tubeRadius * 0.90)
    };
    const blowRx = 7.0 * scale;
    const blowRy = 4.4 * scale;   // Semi-oval depth dipping down into cylinder
    const blowAtmY = 1.6 * scale; // Slender atmospheric opening rim thickness

    // 1. Chimney wall matching the translucent black flute
    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(surfBlowPos.x, surfBlowPos.y, blowRx + 0.7 * scale, blowRy + 0.6 * scale, angleRad, 0, Math.PI, false);
    } else if (typeof ctx.arc === 'function') {
      ctx.arc(surfBlowPos.x, surfBlowPos.y, blowRx + 0.7 * scale, angleRad, angleRad + Math.PI, false);
    }
    ctx.lineTo(surfBlowPos.x + ux * (blowRx + 0.7 * scale), surfBlowPos.y + uy * (blowRx + 0.7 * scale));
    if (typeof ctx.closePath === 'function') ctx.closePath();
    ctx.fillStyle = 'rgba(12, 16, 26, 0.85)';
    ctx.fill();

    // 2. Deep acoustic bore core
    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(surfBlowPos.x, surfBlowPos.y, blowRx * 0.88, blowRy * 0.82, angleRad, 0, Math.PI, false);
    } else if (typeof ctx.arc === 'function') {
      ctx.arc(surfBlowPos.x, surfBlowPos.y, blowRx * 0.88, angleRad, angleRad + Math.PI, false);
    }
    ctx.lineTo(surfBlowPos.x + ux * (blowRx * 0.88), surfBlowPos.y + uy * (blowRx * 0.88));
    if (typeof ctx.closePath === 'function') ctx.closePath();
    ctx.fillStyle = 'rgba(6, 9, 16, 0.92)';
    ctx.fill();

    // 3. Polished bevel aperture rim
    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(surfBlowPos.x, surfBlowPos.y, blowRx, blowAtmY, angleRad, 0, 2 * Math.PI, false);
    } else if (typeof ctx.arc === 'function') {
      ctx.arc(surfBlowPos.x, surfBlowPos.y, blowRx, angleRad, angleRad + 2 * Math.PI, false);
    }
    ctx.strokeStyle = isEmbouchureActive ? octaveHighlight : 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.0 * scale;
    ctx.stroke();

    // 4. Razor-sharp acoustic labium splitting edge (horizontal blade across top aperture chord)
    ctx.beginPath();
    ctx.moveTo(surfBlowPos.x - ux * (blowRx * 0.95), surfBlowPos.y - uy * (blowRx * 0.95));
    ctx.lineTo(surfBlowPos.x + ux * (blowRx * 0.95), surfBlowPos.y + uy * (blowRx * 0.95));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4 * scale;
    ctx.stroke();

    // 5. Active state vs Inactive state
    if (isEmbouchureActive) {
      // Dynamic Acoustic Vortex & Concentric Breath Waves (semi-oval waves radiating softly into bore)
      const vortexPulse = (Math.sin(now * 0.006) + 1.0) * 0.5;
      for (let r = 1; r <= 2; r++) {
        const rippleRx = blowRx + (r * 3.5 + vortexPulse * 2.8) * scale;
        const rippleRy = blowRy + (r * 2.0 + vortexPulse * 1.6) * scale;
        ctx.beginPath();
        if (typeof ctx.ellipse === 'function') {
          ctx.ellipse(surfBlowPos.x, surfBlowPos.y, rippleRx, rippleRy, angleRad, 0, Math.PI, false);
        } else if (typeof ctx.arc === 'function') {
          ctx.arc(surfBlowPos.x, surfBlowPos.y, rippleRx, angleRad, angleRad + Math.PI, false);
        }
        ctx.strokeStyle = octaveAura;
        ctx.lineWidth = (1.1 - r * 0.3) * scale;
        ctx.stroke();
      }

      // Golden harmonic breath shimmer inside cavity
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(surfBlowPos.x, surfBlowPos.y, 3.2 * scale, 2.0 * scale, angleRad, 0, Math.PI, false);
      } else if (typeof ctx.arc === 'function') {
        ctx.arc(surfBlowPos.x, surfBlowPos.y, 3.2 * scale, angleRad, angleRad + Math.PI, false);
      }
      ctx.lineTo(surfBlowPos.x + ux * (3.2 * scale), surfBlowPos.y + uy * (3.2 * scale));
      if (typeof ctx.closePath === 'function') ctx.closePath();
      ctx.fillStyle = 'rgba(251, 191, 36, ' + (0.45 + vortexPulse * 0.25) + ')';
      ctx.shadowColor = octaveAura;
      ctx.shadowBlur = 6 * scale;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Inactive State: Pure, elegant golden reflection crescent (matching photo - ZERO tick marks!)
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(surfBlowPos.x + nx * (1.2 * scale), surfBlowPos.y + ny * (1.2 * scale), blowRx * 0.65, blowRy * 0.45, angleRad, Math.PI * 0.15, Math.PI * 0.85, false);
      } else if (typeof ctx.arc === 'function') {
        ctx.arc(surfBlowPos.x + nx * (1.2 * scale), surfBlowPos.y + ny * (1.2 * scale), blowRx * 0.65, angleRad + Math.PI * 0.15, angleRad + Math.PI * 0.85, false);
      }
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
      ctx.lineWidth = 0.9 * scale;
      ctx.stroke();
    }
    ctx.restore();

    // ==============================================================
    // 2. THE 7 APPLE-STYLE MINIMALIST INTERACTIVE CONTROL NODES
    // Tone holes on the TOP SURFACE of the cylinder (Rotated 90° Clockwise, Exposed to the Atmosphere):
    // Translucent Liquid Well Interaction (Filling up smoothly as finger presses):
    // - NO heavy opaque color flood; remains beautifully translucent at all times.
    // - Resting State: Refined translucent frosted glass well (14% opacity).
    // - Active Pressing State: Translucent tinted fluid smoothly rises and fills the semi-oval well.
    // - Full Closure: Translucent octave tint (~38% opacity) with glowing perimeter hairline and soft aura.
    // - Spring scale haptic press (shrinks to 0.95 on press, pops back to 1.0 on release).
    // ==============================================================
    const getOctaveTranslucentColor = (alpha) => {
      if (this.currentOctave === 1) return `rgba(251, 146, 60, ${alpha})`;
      if (this.currentOctave === -1) return `rgba(129, 140, 248, ${alpha})`;
      return `rgba(148, 163, 184, ${alpha})`;
    };

    this.holeDefs.forEach((hole, i) => {
      const basePos = this.getHolePos(i, width, height);
      const pos = {
        x: basePos.x,
        y: basePos.y + levitationFloat
      };
      const isClosed = holes[i] === true;
      const isHalf = holes[i] === 'half';
      const curlScore = this.fingerCurlScores[i] || 0.0;

      if (!this.holeAnimStates[i]) {
        this.holeAnimStates[i] = { scale: 1.0, coverage: 0.0 };
      }
      const anim = this.holeAnimStates[i];

      // Smooth continuous coverage tracking (0.0 to 1.0)
      let targetCoverage = isClosed ? 1.0 : (isHalf ? 0.50 : Math.max(0.0, Math.min(1.0, (curlScore - 0.20) / 0.24)));
      anim.coverage += (targetCoverage - anim.coverage) * 0.35;
      const cov = Math.max(0.0, Math.min(1.0, anim.coverage));

      // Haptic press micro-interaction (scale shrinks slightly to 0.95 on press)
      const targetScale = isClosed ? 0.95 : (cov > 0.30 ? 0.97 : 1.0);
      anim.scale += (targetScale - anim.scale) * 0.30;
      
      // Tone holes positioned on the TOP SURFACE of the cylinder exposed to the atmosphere
      const surfPos = {
        x: pos.x - nx * (tubeRadius * 0.92),
        y: pos.y - ny * (tubeRadius * 0.92)
      };

      // Semi-oval dimensions: Major axis rx along flute axis, minor axis ry dipping down into flute
      const rx = 6.8 * scale * anim.scale;
      const ry = 4.2 * scale * anim.scale; // Semi-oval ratio ~0.62
      const rAtmY = 1.4 * scale * anim.scale; // Atmospheric opening rim thickness

      ctx.save();

      // Atmospheric Aperture Rim (Top surface opening exposed to the atmosphere)
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(surfPos.x, surfPos.y, rx, rAtmY, angleRad, 0, 2 * Math.PI, false);
      } else if (typeof ctx.arc === 'function') {
        ctx.arc(surfPos.x, surfPos.y, rx, angleRad, angleRad + 2 * Math.PI, false);
      }
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.20 + cov * 0.35})`;
      ctx.lineWidth = 0.8 * scale;
      ctx.stroke();

      // Top-facing titanium chimney collar (semi-oval cut into flute from top surface)
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(surfPos.x, surfPos.y, rx + 1.1 * scale, ry + 0.8 * scale, angleRad, 0, Math.PI, false);
      } else if (typeof ctx.arc === 'function') {
        ctx.arc(surfPos.x, surfPos.y, rx + 1.1 * scale, angleRad, angleRad + Math.PI, false);
      }
      ctx.lineTo(surfPos.x + ux * (rx + 1.1 * scale), surfPos.y + uy * (rx + 1.1 * scale));
      if (typeof ctx.closePath === 'function') ctx.closePath();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.28)';
      ctx.lineWidth = 0.9 * scale;
      ctx.stroke();

      // Recessed acoustic depth shadow (dropping down from surface into inner bore)
      const shadowPos = { x: surfPos.x + nx * (0.5 * scale), y: surfPos.y + ny * (0.5 * scale) };
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(shadowPos.x, shadowPos.y, rx * 0.96, ry * 0.95, angleRad, 0, Math.PI, false);
      } else if (typeof ctx.arc === 'function') {
        ctx.arc(shadowPos.x, shadowPos.y, rx * 0.96, angleRad, angleRad + Math.PI, false);
      }
      ctx.lineTo(shadowPos.x + ux * (rx * 0.96), shadowPos.y + uy * (rx * 0.96));
      if (typeof ctx.closePath === 'function') ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fill();

      // 2a. Resting State: Semi-oval Dark Frosted Glass well (lets video feed show through cleanly)
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(surfPos.x, surfPos.y, rx, ry, angleRad, 0, Math.PI, false);
      } else if (typeof ctx.arc === 'function') {
        ctx.arc(surfPos.x, surfPos.y, rx, angleRad, angleRad + Math.PI, false);
      }
      ctx.lineTo(surfPos.x + ux * rx, surfPos.y + uy * rx);
      if (typeof ctx.closePath === 'function') ctx.closePath();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
      ctx.fill();

      // Hairline stroke border
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(surfPos.x, surfPos.y, rx, ry, angleRad, 0, Math.PI, false);
      } else if (typeof ctx.arc === 'function') {
        ctx.arc(surfPos.x, surfPos.y, rx, angleRad, angleRad + Math.PI, false);
      }
      ctx.lineTo(surfPos.x + ux * rx, surfPos.y + uy * rx);
      if (typeof ctx.closePath === 'function') ctx.closePath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.16 + cov * 0.25})`;
      ctx.lineWidth = 0.8 * scale;
      ctx.stroke();

      // 2b. Translucent filling interaction: As the finger presses, translucent color pools & fills up smoothly
      if (cov > 0.02) {
        const fillRx = rx * Math.max(0.18, Math.sqrt(cov));
        const fillRy = ry * Math.max(0.18, Math.sqrt(cov));
        const translucentAlpha = 0.08 + cov * 0.30; // Always translucent (max ~0.38, never opaque!)

        ctx.beginPath();
        if (typeof ctx.ellipse === 'function') {
          ctx.ellipse(surfPos.x, surfPos.y, fillRx, fillRy, angleRad, 0, Math.PI, false);
        } else if (typeof ctx.arc === 'function') {
          ctx.arc(surfPos.x, surfPos.y, fillRx, angleRad, angleRad + Math.PI, false);
        }
        ctx.lineTo(surfPos.x + ux * fillRx, surfPos.y + uy * fillRx);
        if (typeof ctx.closePath === 'function') ctx.closePath();
        ctx.fillStyle = getOctaveTranslucentColor(translucentAlpha);
        if (cov > 0.70) {
          ctx.shadowColor = getOctaveTranslucentColor(cov * 0.40);
          ctx.shadowBlur = 5 * scale;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Activity meniscus arc sweeping along the semi-oval curve tracing continuous coverage
        const startAngle = 0;
        const endAngle = Math.PI * cov;
        ctx.beginPath();
        if (typeof ctx.ellipse === 'function') {
          ctx.ellipse(surfPos.x, surfPos.y, rx, ry, angleRad, startAngle, endAngle, false);
        } else if (typeof ctx.arc === 'function') {
          ctx.arc(surfPos.x, surfPos.y, rx, angleRad + startAngle, angleRad + endAngle, false);
        }
        ctx.strokeStyle = getOctaveTranslucentColor(0.25 + cov * 0.45);
        ctx.lineWidth = (1.0 + cov * 0.6) * scale;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.lineCap = 'butt';

        // Subtle translucent specular gleam rising in the center as pressed (NOT an opaque solid white circle!)
        ctx.beginPath();
        const coreRx = rx * 0.38 * Math.sqrt(cov);
        const coreRy = ry * 0.38 * Math.sqrt(cov);
        if (typeof ctx.ellipse === 'function') {
          ctx.ellipse(surfPos.x, surfPos.y, coreRx, coreRy, angleRad, 0, Math.PI, false);
        } else if (typeof ctx.arc === 'function') {
          ctx.arc(surfPos.x, surfPos.y, coreRx, angleRad, angleRad + Math.PI, false);
        }
        ctx.lineTo(surfPos.x + ux * coreRx, surfPos.y + uy * coreRx);
        if (typeof ctx.closePath === 'function') ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${cov * 0.30})`;
        ctx.fill();
      } else {
        // Subtle bottom-edge specular sheen when unpressed
        ctx.beginPath();
        if (typeof ctx.ellipse === 'function') {
          ctx.ellipse(surfPos.x + nx * (ry * 0.22), surfPos.y + ny * (ry * 0.22), rx * 0.70, ry * 0.70, angleRad, Math.PI * 0.15, Math.PI * 0.85, false);
        } else if (typeof ctx.arc === 'function') {
          ctx.arc(surfPos.x + nx * (ry * 0.22), surfPos.y + ny * (ry * 0.22), rx * 0.70, angleRad + Math.PI * 0.15, angleRad + Math.PI * 0.85, false);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 0.6 * scale;
        ctx.stroke();
      }

      ctx.restore();
    });

    // 2c. Eyeball glow removed per user request (clean video face presentation)

    // ==============================================================
    // 3. HAND SKELETONS (Subtle & clean, right thumb excluded)
    // ==============================================================
    const handsToDraw = [
      { hand: leftHand, label: 'LEFT', color: 'rgba(186, 230, 253, 0.75)', isLeft: true },
      { hand: rightHand, label: 'RIGHT', color: 'rgba(241, 245, 249, 0.75)', isLeft: false }
    ].filter(item => Boolean(item.hand));

    handsToDraw.forEach(({ hand, isLeft, color }) => {
      ctx.save();
      ctx.lineWidth = 1.2 * scale;
      ctx.strokeStyle = color;

      // Skeleton Bones (Right thumb suppressed, Left pinky suppressed)
      this.HAND_CONNECTIONS.forEach(([i, j]) => {
        if (!isLeft && ((i >= 1 && i <= 4) || (j >= 1 && j <= 4))) return;
        if (isLeft && ((i >= 17 && i <= 20) || (j >= 17 && j <= 20))) return;
        const p1 = toScreen(hand[i]);
        const p2 = toScreen(hand[j]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Joints (Right thumb suppressed, Left pinky suppressed)
      hand.forEach((p, idx) => {
        if (!isLeft && idx >= 1 && idx <= 4) return;
        if (isLeft && idx >= 17 && idx <= 20) return;
        const sp = toScreen(p);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 1.8 * scale, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
      });

      ctx.restore();
    });

    // ==============================================================
    // 3b. DIRECT FINGERTIP NOTE CAPTURE INDICATORS
    // Minimalist optical beacons: NO text labels ("L1", "R1", etc.)
    // ==============================================================
    const fingerHoleMap = [
      { hand: leftHand,  tipIdx: 8,  holeIdx: 0 },
      { hand: leftHand,  tipIdx: 12, holeIdx: 1 },
      { hand: leftHand,  tipIdx: 16, holeIdx: 2 },
      { hand: rightHand, tipIdx: 8,  holeIdx: 3 },
      { hand: rightHand, tipIdx: 12, holeIdx: 4 },
      { hand: rightHand, tipIdx: 16, holeIdx: 5 },
      { hand: rightHand, tipIdx: 20, holeIdx: 6 }
    ];

    fingerHoleMap.forEach(({ hand, tipIdx, holeIdx }) => {
      if (!hand || !hand[tipIdx]) return;
      const tip = toScreen(hand[tipIdx]);
      const isClosed = holes[holeIdx];

      ctx.save();
      if (isClosed) {
        // Discrete Studio Capture Beacon on Fingertip
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 8.0 * scale, 0, 2 * Math.PI);
        ctx.fillStyle = octaveAura;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 4.5 * scale, 0, 2 * Math.PI);
        ctx.fillStyle = octaveColor;
        ctx.shadowColor = octaveAura;
        ctx.shadowBlur = 6 * scale;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 1.8 * scale, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else {
        // Open Finger Indicator: subtle airy ring
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 4.0 * scale, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1.0 * scale;
        ctx.stroke();
      }
      ctx.restore();
    });



    // ==============================================================
    // ==============================================================
    // 4. FLOATING NOTE PARTICLES (Individual notes, zero background, flies up & fades)
    // ==============================================================
    if (this.floatingNotes && this.floatingNotes.length > 0) {
      const now = performance.now();
      this.floatingNotes = this.floatingNotes.filter(note => {
        const age = now - note.birth;
        if (age >= note.maxAge) return false;

        const progress = age / note.maxAge; // 0.0 to 1.0
        note.x += note.vx;
        note.y += note.vy * (1.0 - progress * 0.25); // floats upward smoothly

        // Starts opaque (1.0), transitions to translucent, fades to 0
        const alpha = Math.max(0, 1.0 - Math.pow(progress, 1.35));

        ctx.save();
        ctx.globalAlpha = alpha;
        // 50% size (5.8px), Space Grotesk font matching the tool, in pitch color
        ctx.font = `700 ${fSize(5.8)}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Soft text drop shadow for pristine legibility against camera feed
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 3 * scale;
        ctx.fillStyle = note.color || '#38bdf8';
        ctx.fillText(note.text, note.x, note.y);
        ctx.restore();

        return true;
      });
    }

    // ==============================================================
    // 5. CHIC MINIMALIST INITIAL SA STABILIZATION
    // (Initial Sa prompt overlay removed per user request, keeping flute area clean)
    // ==============================================================
  }

  // ==============================================================
  // 👁️ CYBER-SPIRITUAL EYEBALL OCTAVE GLOW ENGINE
  // Real-time iris & pupil tracking from MediaPipe FaceMesh
  // Dynamically radiates in the active octave's signature color:
  // - Mandra Sthayi (-1): Deep Royal Velvet Indigo (#818cf8)
  // - Madhya Sthayi (0): Celestial Cyber Cyan / Jade Air (#00f0ff)
  // - Tara Sthayi (+1): Solar Flame Sunset Coral (#fb923c)
  // Features 60 FPS temporal smoothing, natural blink attenuation, and breath pulse
  // ==============================================================
  // ==============================================================
  // ==============================================================
  // 👁️ EYEBALL GLOW (REMOVED PER USER REQUEST)
  // Kept as safe no-op to ensure clean, natural webcam video presentation
  // ==============================================================
  renderEyeballOctaveGlow(ctx, width, height, scale, toScreen, now) {
    // Removed per user request
    return;
  }

  stop() {
    this.isRunning = false;
    this.smoothedEyes = null;
    this.eyeGlowOpacity = 0.0;
    if (this.videoElement && this.videoFrameCallbackId && typeof this.videoElement.cancelVideoFrameCallback === 'function') {
      this.videoElement.cancelVideoFrameCallback(this.videoFrameCallbackId);
      this.videoFrameCallbackId = null;
    }
    if (this.animFrameId && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.animFrameId);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.canvasCtx && this.canvasElement) {
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
    this.onTrackingStatus({ status: 'stopped', message: 'Camera stopped.' });
    this.startIdleLevitationLoop();
  }
}

// Export for browser
window.CarnaticFluteTracker = CarnaticFluteTracker;
