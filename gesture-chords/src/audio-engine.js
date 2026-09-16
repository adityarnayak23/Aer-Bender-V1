// Web Audio Polyphonic Synthesizer Engine for GestureChords

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.currentInstrument = 'rhodes'; // rhodes, pad, piano, pluck, synth80s
    this.playMode = 'strum'; // strike, strum, arp, sustain
    this.activeVoices = [];
    this.sustainedNotes = [];
    this.currentChordNotes = [];
    this.arpInterval = null;
    this.arpIndex = 0;
    this.arpBpm = 110;
    this.strumSpeedMs = 45;

    // Recording
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;

    // Audio Graph Nodes (set upon init)
    this.masterGain = null;
    this.filterNode = null;
    this.pannerNode = null;
    this.convolver = null;
    this.reverbGain = null;
    this.dryGain = null;
    this.compressor = null;
    this.analyser = null;
    this.recDestination = null;
  }

  // Initialize Web Audio Context after user interaction
  init() {
    if (this.isInitialized) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master Compressor (Limiter)
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

    // Filter Node (Modulated by hand vertical position)
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(6500, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Stereo Panner (Modulated by hand horizontal position)
    if (this.ctx.createStereoPanner) {
      this.pannerNode = this.ctx.createStereoPanner();
      this.pannerNode.pan.setValueAtTime(0, this.ctx.currentTime);
    } else {
      this.pannerNode = this.ctx.createGain(); // fallback
    }

    // Reverb Engine (Procedural algorithmic impulse response)
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.generateReverbImpulse(2.5, 2.0);

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    // Real-time Analyser for Visualizer
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.85;

    // Recording Destination
    this.recDestination = this.ctx.createMediaStreamDestination();

    // Wiring Audio Graph:
    // Voice -> Filter -> Panner -> [Dry + (Convolver -> ReverbGain)] -> Compressor -> MasterGain -> Analyser -> Output
    this.filterNode.connect(this.pannerNode);

    this.pannerNode.connect(this.dryGain);
    this.pannerNode.connect(this.convolver);
    this.convolver.connect(this.reverbGain);

    this.dryGain.connect(this.compressor);
    this.reverbGain.connect(this.compressor);

    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.masterGain.connect(this.recDestination);
    this.analyser.connect(this.ctx.destination);

    this.isInitialized = true;
  }

  // Generate algorithmic lush reverb buffer
  generateReverbImpulse(duration, decay) {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const factor = Math.pow(n / length, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  // Ensure AudioContext is running (unlock browser autoplay policy)
  async resume() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // Set Master Volume (0.0 to 1.0)
  setVolume(val) {
    if (!this.masterGain) return;
    const clamped = Math.max(0, Math.min(1, val));
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  // Dynamically modulate low-pass filter with hand height (0: top/bright, 1: bottom/dark)
  setFilterCutoff(normalizedY) {
    if (!this.filterNode || !this.ctx) return;
    // Map normalized Y (0.0 at top of video to 1.0 at bottom)
    // Raising hand (lower Y) = higher cutoff (sparkling bright)
    const inverted = 1.0 - Math.max(0, Math.min(1, normalizedY));
    const minFreq = 400;
    const maxFreq = 14000;
    // Exponential frequency curve
    const freq = minFreq * Math.pow(maxFreq / minFreq, inverted);
    this.filterNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.04);
  }

  // Modulate stereo panning with hand horizontal position (0: left, 1: right)
  setPan(normalizedX) {
    if (!this.pannerNode || !this.ctx || !this.pannerNode.pan) return;
    // Mirroring: in mirrored camera, pointing to user's right is normalizedX ~ 1.0
    const pan = (normalizedX * 2 - 1) * 0.75; // -0.75 to +0.75
    this.pannerNode.pan.setTargetAtTime(pan, this.ctx.currentTime, 0.05);
  }

  // Set instrument timbre preset
  setInstrument(type) {
    this.currentInstrument = type;
  }

  // Set play mode
  setPlayMode(mode) {
    this.stopArp();
    this.playMode = mode;
    if (mode === 'arp' && this.currentChordNotes.length > 0) {
      this.startArp(this.currentChordNotes);
    }
  }

  // Main trigger method when a chord gesture is detected
  playChord(chordNotes, velocity = 1.0) {
    this.resume();
    this.currentChordNotes = [...chordNotes];

    if (chordNotes.length === 0) {
      this.stopAllVoices();
      this.stopArp();
      return;
    }

    if (this.playMode === 'strike') {
      this.stopAllVoices();
      chordNotes.forEach(note => this.triggerSingleNote(note, 0, velocity));
    } else if (this.playMode === 'strum') {
      this.stopAllVoices();
      chordNotes.forEach((note, index) => {
        const delayMs = index * this.strumSpeedMs;
        this.triggerSingleNote(note, delayMs / 1000, velocity);
      });
    } else if (this.playMode === 'sustain') {
      this.sustainChord(chordNotes, velocity);
    } else if (this.playMode === 'arp') {
      this.startArp(chordNotes);
    }
  }

  // Synthesize single note based on selected instrument
  triggerSingleNote(noteName, timeOffset = 0, velocity = 1.0) {
    if (!this.ctx || !this.isInitialized) return;

    const freq = window.ChordsData.noteToFreq(noteName);
    const startTime = this.ctx.currentTime + timeOffset;

    switch (this.currentInstrument) {
      case 'rhodes':
        this.synthRhodes(freq, startTime, velocity);
        break;
      case 'pad':
        this.synthPad(freq, startTime, velocity);
        break;
      case 'piano':
        this.synthPiano(freq, startTime, velocity);
        break;
      case 'pluck':
        this.synthPluck(freq, startTime, velocity);
        break;
      case 'synth80s':
        this.synth80s(freq, startTime, velocity);
        break;
      default:
        this.synthRhodes(freq, startTime, velocity);
    }
  }

  // 1. Warm Electric Piano (Rhodes): Sine fundamental + 3rd harmonic tine + warm bell decay
  synthRhodes(freq, startTime, velocity = 1.0) {
    const voiceGain = this.ctx.createGain();
    const duration = 2.4;

    // Fundamental Sine
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    // Warm Second Harmonic
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, startTime);
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.25, startTime);
    osc2.connect(osc2Gain);
    osc2Gain.connect(voiceGain);

    // Metal Tine overtone (gives that authentic Rhodes tine click)
    const tineOsc = this.ctx.createOscillator();
    tineOsc.type = 'sine';
    tineOsc.frequency.setValueAtTime(freq * 4.2, startTime);
    const tineGain = this.ctx.createGain();
    tineGain.gain.setValueAtTime(0.3 * velocity, startTime);
    tineGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);
    tineOsc.connect(tineGain);
    tineGain.connect(voiceGain);

    // Amplitude Envelope
    const peakGain = 0.28 * velocity;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    voiceGain.gain.exponentialRampToValueAtTime(peakGain * 0.5, startTime + 0.45);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(voiceGain);
    voiceGain.connect(this.filterNode);

    osc1.start(startTime);
    osc2.start(startTime);
    tineOsc.start(startTime);

    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    tineOsc.stop(startTime + duration);

    this.trackVoice({ stop: () => {
      voiceGain.gain.cancelScheduledValues(this.ctx.currentTime);
      voiceGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
      setTimeout(() => {
        try { osc1.stop(); osc2.stop(); tineOsc.stop(); } catch (e) {}
      }, 100);
    }});
  }

  // 2. Lush Ambient Pad: Detuned dual saws + warm triangle, long majestic tail
  synthPad(freq, startTime, velocity = 1.0) {
    const voiceGain = this.ctx.createGain();
    const duration = 4.0;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc1.detune.setValueAtTime(-8, startTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq, startTime);
    osc2.detune.setValueAtTime(8, startTime);

    const osc3 = this.ctx.createOscillator();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(freq * 0.5, startTime); // warm sub octave

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.3, startTime);
    osc3.connect(subGain);
    subGain.connect(voiceGain);

    // Envelope: slow dreamy attack, sustained lush body
    const peakGain = 0.16 * velocity;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.35); // 350ms attack
    voiceGain.gain.exponentialRampToValueAtTime(peakGain * 0.8, startTime + 1.5);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(voiceGain);
    osc2.connect(voiceGain);
    voiceGain.connect(this.filterNode);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    osc3.stop(startTime + duration);

    this.trackVoice({ stop: () => {
      voiceGain.gain.cancelScheduledValues(this.ctx.currentTime);
      voiceGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
      setTimeout(() => {
        try { osc1.stop(); osc2.stop(); osc3.stop(); } catch (e) {}
      }, 500);
    }});
  }

  // 3. Acoustic Grand Piano: Complex harmonic blend with hammer transient
  synthPiano(freq, startTime, velocity = 1.0) {
    const voiceGain = this.ctx.createGain();
    const duration = 2.8;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.35, startTime);
    osc2.connect(osc2Gain);
    osc2Gain.connect(voiceGain);

    // Hammer Attack transient
    const hammer = this.ctx.createOscillator();
    hammer.type = 'square';
    hammer.frequency.setValueAtTime(freq * 3, startTime);
    const hammerGain = this.ctx.createGain();
    hammerGain.gain.setValueAtTime(0.18 * velocity, startTime);
    hammerGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.04);
    hammer.connect(hammerGain);
    hammerGain.connect(voiceGain);

    const peakGain = 0.26 * velocity;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.008);
    voiceGain.gain.exponentialRampToValueAtTime(peakGain * 0.4, startTime + 0.6);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(voiceGain);
    voiceGain.connect(this.filterNode);

    osc1.start(startTime);
    osc2.start(startTime);
    hammer.start(startTime);

    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    hammer.stop(startTime + duration);

    this.trackVoice({ stop: () => {
      voiceGain.gain.cancelScheduledValues(this.ctx.currentTime);
      voiceGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.1);
      setTimeout(() => {
        try { osc1.stop(); osc2.stop(); hammer.stop(); } catch (e) {}
      }, 120);
    }});
  }

  // 4. Acoustic Pluck / Harp: Crisp snappy plucked string with resonant decay
  synthPluck(freq, startTime, velocity = 1.0) {
    const voiceGain = this.ctx.createGain();
    const duration = 2.0;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    // Bright overtone
    const oscHarmonic = this.ctx.createOscillator();
    oscHarmonic.type = 'sawtooth';
    oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);
    const harmGain = this.ctx.createGain();
    harmGain.gain.setValueAtTime(0.3, startTime);
    harmGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.2);
    oscHarmonic.connect(harmGain);
    harmGain.connect(voiceGain);

    const peakGain = 0.3 * velocity;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.005);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(voiceGain);
    voiceGain.connect(this.filterNode);

    osc.start(startTime);
    oscHarmonic.start(startTime);

    osc.stop(startTime + duration);
    oscHarmonic.stop(startTime + duration);

    this.trackVoice({ stop: () => {
      voiceGain.gain.cancelScheduledValues(this.ctx.currentTime);
      voiceGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.06);
      setTimeout(() => {
        try { osc.stop(); oscHarmonic.stop(); } catch (e) {}
      }, 80);
    }});
  }

  // 5. 80s Retro Synth: Fat chorus saw with resonant sweep
  synth80s(freq, startTime, velocity = 1.0) {
    const voiceGain = this.ctx.createGain();
    const duration = 2.5;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc1.detune.setValueAtTime(-14, startTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq, startTime);
    osc2.detune.setValueAtTime(14, startTime);

    const oscSub = this.ctx.createOscillator();
    oscSub.type = 'square';
    oscSub.frequency.setValueAtTime(freq * 0.5, startTime);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.2, startTime);
    oscSub.connect(subGain);
    subGain.connect(voiceGain);

    // Individual note filter sweep for punch
    const noteFilter = this.ctx.createBiquadFilter();
    noteFilter.type = 'lowpass';
    noteFilter.Q.setValueAtTime(4.0, startTime);
    noteFilter.frequency.setValueAtTime(freq * 8, startTime);
    noteFilter.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.8);

    const peakGain = 0.22 * velocity;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
    voiceGain.gain.exponentialRampToValueAtTime(peakGain * 0.6, startTime + 0.5);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(noteFilter);
    osc2.connect(noteFilter);
    noteFilter.connect(voiceGain);
    voiceGain.connect(this.filterNode);

    osc1.start(startTime);
    osc2.start(startTime);
    oscSub.start(startTime);

    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    oscSub.stop(startTime + duration);

    this.trackVoice({ stop: () => {
      voiceGain.gain.cancelScheduledValues(this.ctx.currentTime);
      voiceGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.1);
      setTimeout(() => {
        try { osc1.stop(); osc2.stop(); oscSub.stop(); } catch (e) {}
      }, 120);
    }});
  }

  // Sustain mode chord management
  sustainChord(notes, velocity = 1.0) {
    this.stopAllVoices();
    this.sustainedNotes = [];

    notes.forEach(note => {
      const freq = window.ChordsData.noteToFreq(note);
      const startTime = this.ctx.currentTime;
      const voiceGain = this.ctx.createGain();

      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc1.detune.setValueAtTime(-5, startTime);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq, startTime);
      osc2.detune.setValueAtTime(5, startTime);

      const peakGain = (0.2 / Math.sqrt(notes.length)) * velocity;
      voiceGain.gain.setValueAtTime(0.0001, startTime);
      voiceGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.2);

      osc1.connect(voiceGain);
      osc2.connect(voiceGain);
      voiceGain.connect(this.filterNode);

      osc1.start(startTime);
      osc2.start(startTime);

      const voice = {
        stop: () => {
          voiceGain.gain.cancelScheduledValues(this.ctx.currentTime);
          voiceGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.25);
          setTimeout(() => {
            try { osc1.stop(); osc2.stop(); } catch (e) {}
          }, 300);
        }
      };
      this.sustainedNotes.push(voice);
      this.trackVoice(voice);
    });
  }

  // Arpeggiator loop
  startArp(notes) {
    this.stopArp();
    if (!notes || notes.length === 0) return;

    this.arpIndex = 0;
    const intervalMs = (60000 / this.arpBpm) / 2; // Eighth notes

    // Trigger first note immediately
    this.triggerSingleNote(notes[0], 0, 0.9);
    this.arpIndex = 1;

    this.arpInterval = setInterval(() => {
      if (notes.length === 0) return;
      const note = notes[this.arpIndex % notes.length];
      this.triggerSingleNote(note, 0, 0.85);
      this.arpIndex++;
    }, intervalMs);
  }

  stopArp() {
    if (this.arpInterval) {
      clearInterval(this.arpInterval);
      this.arpInterval = null;
    }
  }

  // Voice tracking & cleanup
  trackVoice(voice) {
    this.activeVoices.push(voice);
    if (this.activeVoices.length > 32) {
      const oldest = this.activeVoices.shift();
      try { oldest.stop(); } catch (e) {}
    }
  }

  stopAllVoices() {
    this.activeVoices.forEach(v => {
      try { v.stop(); } catch (e) {}
    });
    this.activeVoices = [];
    this.sustainedNotes = [];
  }

  // Audio Recording (Direct .webm / .wav download)
  startRecording() {
    if (!this.recDestination) return false;
    this.recordedChunks = [];
    try {
      this.mediaRecorder = new MediaRecorder(this.recDestination.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
    } catch (e) {
      this.mediaRecorder = new MediaRecorder(this.recDestination.stream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `gesture-chords-jam-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    };

    this.mediaRecorder.start();
    this.isRecording = true;
    return true;
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      return true;
    }
    return false;
  }
}

// Export for browser
window.AudioEngine = AudioEngine;
