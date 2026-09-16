// Microphone Breath & Blow Detector for Air Flute
// Measures high-frequency acoustic turbulence to detect blowing into the laptop mic

class MicBreathDetector {
  constructor(options = {}) {
    this.audioCtx = null;
    this.stream = null;
    this.analyser = null;
    this.filter = null;
    this.isActive = false;
    this.animId = null;

    this.onBreath = options.onBreath || (() => {});
    this.onOverblow = options.onOverblow || (() => {});

    this.blowThreshold = 0.08;
    this.overblowThreshold = 0.65;
  }

  async start() {
    if (this.isActive) return true;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      const source = this.audioCtx.createMediaStreamSource(this.stream);

      // Highpass/Bandpass filter to isolate breath hiss noise (2.5 kHz to 6 kHz)
      this.filter = this.audioCtx.createBiquadFilter();
      this.filter.type = 'bandpass';
      this.filter.frequency.setValueAtTime(3500, this.audioCtx.currentTime);
      this.filter.Q.setValueAtTime(1.5, this.audioCtx.currentTime);

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;

      source.connect(this.filter);
      this.filter.connect(this.analyser);

      this.isActive = true;
      this.startAnalyzing();
      return true;
    } catch (err) {
      console.warn('Microphone breath detection unavailable:', err);
      this.isActive = false;
      return false;
    }
  }

  startAnalyzing() {
    const data = new Uint8Array(this.analyser.frequencyBinCount);

    const check = () => {
      if (!this.isActive) return;

      this.analyser.getByteFrequencyData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      const avg = sum / data.length / 255; // 0.0 to 1.0

      if (avg > this.blowThreshold) {
        const intensity = Math.min(1.0, (avg - this.blowThreshold) / (1.0 - this.blowThreshold));
        this.onBreath(intensity);

        if (intensity > this.overblowThreshold) {
          this.onOverblow(true);
        } else {
          this.onOverblow(false);
        }
      } else {
        this.onBreath(0);
        this.onOverblow(false);
      }

      this.animId = requestAnimationFrame(check);
    };

    this.animId = requestAnimationFrame(check);
  }

  stop() {
    this.isActive = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
  }
}

// Export for browser
window.MicBreathDetector = MicBreathDetector;
