// Audio Frequency Spectrum and Oscilloscope Visualizer for GestureChords

class AudioVisualizer {
  constructor(canvasElement, audioEngine) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.audio = audioEngine;
    this.animId = null;
    this.isRunning = false;
    this.accentColor = '#38bdf8';

    // Buffers
    this.freqData = null;
    this.timeData = null;
  }

  setAccentColor(color) {
    this.accentColor = color || '#38bdf8';
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const render = () => {
      if (!this.isRunning) return;
      this.draw();
      this.animId = requestAnimationFrame(render);
    };

    this.animId = requestAnimationFrame(render);
  }

  stop() {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
    }
  }

  draw() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!this.audio || !this.audio.analyser) {
      this.drawIdle(ctx, width, height);
      return;
    }

    const analyser = this.audio.analyser;
    const bufferLength = analyser.frequencyBinCount;

    if (!this.freqData || this.freqData.length !== bufferLength) {
      this.freqData = new Uint8Array(bufferLength);
      this.timeData = new Uint8Array(bufferLength);
    }

    analyser.getByteFrequencyData(this.freqData);
    analyser.getByteTimeDomainData(this.timeData);

    // 1. Draw Glowing Frequency Spectrum Bars
    const barCount = 48;
    const barWidth = (width / barCount) - 3;
    const step = Math.floor((bufferLength * 0.45) / barCount);

    for (let i = 0; i < barCount; i++) {
      const val = this.freqData[i * step] || 0;
      const percent = val / 255;
      const barHeight = Math.max(3, percent * (height * 0.85));
      const x = i * (barWidth + 3);
      const y = height - barHeight;

      // Vertical gradient
      const grad = ctx.createLinearGradient(0, height, 0, y);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
      grad.addColorStop(0.6, this.accentColor);
      grad.addColorStop(1, '#a855f7');

      ctx.fillStyle = grad;
      ctx.shadowColor = this.accentColor;
      ctx.shadowBlur = percent > 0.3 ? 10 : 0;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 2. Draw Oscilloscope Waveform Overlay
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = this.timeData[i] / 128.0; // 0 to 2
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();
  }

  // Subtle pulsing sine wave when no sound is playing
  drawIdle(ctx, width, height) {
    const time = Date.now() * 0.002;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.beginPath();

    for (let x = 0; x < width; x += 5) {
      const y = height / 2 + Math.sin(x * 0.02 + time) * 6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// Export for browser
window.AudioVisualizer = AudioVisualizer;
