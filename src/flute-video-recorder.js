// =========================================================================
// 📹 FluteVideoRecorder: Flute Video & Audio Performance Recorder
// =========================================================================
// Modes:
// 1. 'camera': Composites mirrored webcam, flute lines, silver holes,
//              hand tracking, Swara HUD pill, and audio visualizer
// 2. 'screen': Captures entire screen/window/tab with pure synchronized studio audio
//
// Studio Audio: Acoustic Carnatic Flute / Electric Flute + Tanpura Drone

class FluteVideoRecorder {
  constructor(options = {}) {
    this.videoEl = options.videoElement;
    this.canvasEl = options.canvasElement;
    this.audio = options.audioEngine;
    this.getCurrentSwara = options.getCurrentSwara || (() => null);
    this.getOctave = options.getOctave || (() => 0);
    this.onStateChange = options.onStateChange || (() => {});

    // Compositing Canvas for Camera Video + Flute Overlay + HUD
    this.compCanvas = document.createElement('canvas');
    this.compCtx = this.compCanvas.getContext('2d');

    this.displayStream = null;
    this.compositeStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.animId = null;
    this.startTime = 0;
    this.mode = 'camera';

    this.spectrumData = new Uint8Array(32);
  }

  // Get best supported video recording MIME type
  getBestMimeType() {
    const candidateCodecs = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4'
    ];

    for (const mime of candidateCodecs) {
      try {
        if (typeof MediaRecorder !== 'undefined' &&
            typeof MediaRecorder.isTypeSupported === 'function' &&
            MediaRecorder.isTypeSupported(mime)) {
          return mime;
        }
      } catch (e) {}
    }
    return '';
  }

  // Start recording performance with studio audio (mode: 'camera' [default] | 'screen')
  async start(mode = 'camera') {
    if (this.isRecording) return false;

    // Ensure audio engine is awake and recording destination is created
    if (this.audio && typeof this.audio.resume === 'function') {
      try {
        await this.audio.resume();
      } catch (e) {
        console.warn('Audio resume note:', e);
      }
    }

    this.recordedChunks = [];
    this.startTime = Date.now();
    this.mode = mode;

    let streamToRecord = null;

    if (mode === 'screen') {
      streamToRecord = await this.startScreenStream();
    } else {
      streamToRecord = this.startCompositeCameraStream();
    }

    if (!streamToRecord) {
      this.onStateChange({ status: 'cancelled' });
      return false;
    }

    // Assemble combined MediaStream: Video Track + Studio Audio Track
    const recordStream = new MediaStream();

    const videoTrack = streamToRecord.getVideoTracks()[0];
    if (videoTrack) {
      recordStream.addTrack(videoTrack);

      // Listen for browser native "Stop sharing" event
      videoTrack.addEventListener('ended', () => {
        if (this.isRecording) {
          this.stop();
        }
      });
    } else {
      console.error('FluteVideoRecorder: No video track found in streamToRecord.');
      this.cleanupStreams();
      this.onStateChange({ status: 'error', error: 'No video stream available' });
      return false;
    }

    // Merge studio audio tracks from Flute Audio Engine (Flute + Tanpura)
    if (this.audio && this.audio.recDestination && this.audio.recDestination.stream) {
      const audioTracks = this.audio.recDestination.stream.getAudioTracks();
      audioTracks.forEach(track => {
        try {
          recordStream.addTrack(track);
        } catch (e) {}
      });
    }

    const mimeType = this.getBestMimeType();

    try {
      const options = mimeType
        ? { mimeType, videoBitsPerSecond: 3000000 }
        : {};
      this.mediaRecorder = new MediaRecorder(recordStream, options);
    } catch (e) {
      console.warn('FluteVideoRecorder: MediaRecorder options fallback, attempting default:', e);
      try {
        this.mediaRecorder = new MediaRecorder(recordStream);
      } catch (err2) {
        console.error('FluteVideoRecorder: Failed to initialize MediaRecorder:', err2);
        this.cleanupStreams();
        this.onStateChange({ status: 'error', error: err2.message });
        return false;
      }
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      // Safely stop stream tracks AFTER all chunks have been flushed
      this.cleanupStreams();

      const usedMime = (this.mediaRecorder && this.mediaRecorder.mimeType) || mimeType || 'video/webm';
      const isMp4 = usedMime.toLowerCase().includes('mp4');
      const ext = isMp4 ? 'mp4' : 'webm';

      if (this.recordedChunks.length === 0) {
        console.warn('FluteVideoRecorder: No recorded data chunks received.');
        this.onStateChange({ status: 'stopped', downloadReady: false, error: 'No video data recorded' });
        return;
      }

      const blob = new Blob(this.recordedChunks, { type: usedMime });
      if (blob.size === 0) {
        console.warn('FluteVideoRecorder: Recorded blob is 0 bytes.');
        this.onStateChange({ status: 'stopped', downloadReady: false, error: 'Recorded file was empty' });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const modeTag = (this.mode === 'camera') ? 'camera' : 'screen';
      a.download = `air-flute-${modeTag}-performance-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        try {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch (e) {}
      }, 1000);

      this.onStateChange({
        status: 'stopped',
        downloadReady: true,
        blobSize: blob.size,
        ext,
        mode: this.mode
      });
    };

    // Mark active recording state BEFORE starting recording and animation
    this.isRecording = true;

    // Start compositing loop if in camera mode
    if (this.mode === 'camera') {
      this.startCameraCompositingLoop();
    }

    this.mediaRecorder.start(1000); // 1-second chunks for steady buffer flushing
    this.onStateChange({ status: 'recording', mode: this.mode });
    return true;
  }

  // Pure Native Screen Recording (Zero-Lag Hardware Accelerated)
  async startScreenStream() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      console.warn('FluteVideoRecorder: getDisplayMedia is not supported in this browser.');
      return null;
    }

    try {
      this.displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          frameRate: { ideal: 30, max: 30 },
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        systemAudio: 'exclude'
      });
      return this.displayStream;
    } catch (err) {
      console.warn('FluteVideoRecorder: Screen recording cancelled or dismissed:', err);
      return null;
    }
  }

  // Camera-Only Canvas Compositor: Live Camera (Mirrored) + Flute Overlay + Live Swara HUD
  startCompositeCameraStream() {
    const w = (this.canvasEl && this.canvasEl.width > 0)
      ? this.canvasEl.width
      : ((this.videoEl && this.videoEl.videoWidth > 0) ? this.videoEl.videoWidth : 1280);
    const h = (this.canvasEl && this.canvasEl.height > 0)
      ? this.canvasEl.height
      : ((this.videoEl && this.videoEl.videoHeight > 0) ? this.videoEl.videoHeight : 720);

    this.compCanvas.width = w;
    this.compCanvas.height = h;

    // Create 30 FPS stream from composite canvas
    this.compositeStream = this.compCanvas.captureStream(30);
    return this.compositeStream;
  }

  // Continuous Camera Compositing Loop
  startCameraCompositingLoop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    const renderLoop = () => {
      if (!this.isRecording) return;

      const w = (this.canvasEl && this.canvasEl.width > 0)
        ? this.canvasEl.width
        : ((this.videoEl && this.videoEl.videoWidth > 0) ? this.videoEl.videoWidth : 1280);
      const h = (this.canvasEl && this.canvasEl.height > 0)
        ? this.canvasEl.height
        : ((this.videoEl && this.videoEl.videoHeight > 0) ? this.videoEl.videoHeight : 720);

      if (this.compCanvas.width !== w || this.compCanvas.height !== h) {
        this.compCanvas.width = w;
        this.compCanvas.height = h;
      }

      this.compCtx.clearRect(0, 0, w, h);

      // 1. Draw webcam feed mirrored (scaleX = -1) to match player perspective
      if (this.videoEl && this.videoEl.readyState >= 2) {
        this.compCtx.save();
        this.compCtx.translate(w, 0);
        this.compCtx.scale(-1, 1);
        this.compCtx.drawImage(this.videoEl, 0, 0, w, h);
        this.compCtx.restore();
      } else {
        // Aesthetic dark stage backdrop if camera feed is starting
        const grad = this.compCtx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#0a0d14');
        grad.addColorStop(1, '#030406');
        this.compCtx.fillStyle = grad;
        this.compCtx.fillRect(0, 0, w, h);
      }

      // 2. Composite Flute Tracking Overlay (Lines, Holes, Hands, Ripples)
      if (this.canvasEl && this.canvasEl.width > 0 && this.canvasEl.height > 0) {
        this.compCtx.drawImage(this.canvasEl, 0, 0, w, h);
      }

      // 3. Draw Watermark, Swara Pill, and Live Audio Visualizer
      this.renderVideoHUD(this.compCtx, w, h);

      this.animId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
  }

  // Draw elegant brand watermark, live swara badge, and recording indicator on video
  renderVideoHUD(ctx, w, h) {
    ctx.save();

    // Top-Left: Brand Watermark
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText('AIR BENDER v1', 16, 24);

    ctx.font = '500 9.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(203, 213, 225, 0.75)';
    const kattaiName = (this.audio && this.audio.kattai) ? `${this.audio.kattai} Kattai` : '1.5 Kattai (C#)';
    ctx.fillText(kattaiName, 16, 38);

    // Top-Right: Rec Indicator & Live Timer
    const elapsedSecs = Math.max(0, Math.floor((Date.now() - this.startTime) / 1000));
    const mins = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
    const secs = String(elapsedSecs % 60).padStart(2, '0');
    const timerStr = `REC ${mins}:${secs}`;

    const pulse = (Math.sin(Date.now() / 180) + 1) / 2;
    ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + 0.6 * pulse})`;
    ctx.beginPath();
    ctx.arc(w - 78, 22, 4.5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(timerStr, w - 16, 26);

    // Active Swara Pill at Top-Center
    const curSw = this.getCurrentSwara();
    if (curSw) {
      const oct = this.getOctave();
      const octLabel = oct > 0 ? '▲ Tara' : (oct < 0 ? '▼ Mandra' : '◆ Madhya');
      const text = `${curSw.short || ''} · ${curSw.swara || ''} (${octLabel})`;

      ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
      const m = ctx.measureText(text);
      const pw = m.width + 24;
      const px = (w - pw) / 2;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(px, 12, pw, 24, 12);
      } else {
        ctx.rect(px, 12, pw, 24);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(text, w / 2, 28);
    }

    // Sleek Audio Spectrum Visualizer at Bottom Edge of Video
    if (this.audio && this.audio.analyser && this.spectrumData) {
      try {
        this.audio.analyser.getByteFrequencyData(this.spectrumData);
        const barCount = 32;
        const totalW = Math.min(260, w * 0.4);
        const startX = (w - totalW) / 2;
        const barW = (totalW / barCount) - 1.5;
        const maxH = 22;
        const bottomY = h - 12;

        ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
        for (let i = 0; i < barCount; i++) {
          const val = this.spectrumData[i] / 255;
          const barH = Math.max(2, val * maxH);
          ctx.fillRect(startX + i * (barW + 1.5), bottomY - barH, barW, barH);
        }
      } catch (e) {}
    }

    ctx.restore();
  }

  // Stop recording and trigger download
  stop() {
    if (!this.isRecording) return false;
    this.isRecording = false;

    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    // Gracefully stop MediaRecorder to flush final buffer
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        if (typeof this.mediaRecorder.requestData === 'function') {
          this.mediaRecorder.requestData();
        }
      } catch (e) {}

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn('FluteVideoRecorder: Error calling mediaRecorder.stop():', e);
        this.cleanupStreams();
      }
    } else {
      this.cleanupStreams();
      this.onStateChange({ status: 'stopped', downloadReady: false });
    }

    return true;
  }

  // Safely clean up MediaStreams and tracks
  cleanupStreams() {
    if (this.displayStream) {
      try {
        this.displayStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      this.displayStream = null;
    }

    if (this.compositeStream) {
      try {
        this.compositeStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      this.compositeStream = null;
    }
  }
}

// Export for browser
window.FluteVideoRecorder = FluteVideoRecorder;
