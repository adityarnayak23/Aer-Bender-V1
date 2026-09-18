// =========================================================================
// 🪈 High-Fidelity Carnatic Bamboo Venu Audio Engine (Acoustic Sample Sampler)
// =========================================================================
// Directly plays real acoustic recordings from classical Carnatic Flute tutorial
// (Master Sriharsha Ramkumar / Music Master Carnatic Bamboo Flute sessions)
// 1. Authentic studio-recorded acoustic audio samples for each Swara (Sa, Ri, Ga, Ma, Pa, Dha, Ni, Tara Sa)
// 2. Real bamboo embouchure breath chiff, wooden bore resonances, and natural tone
// 3. Dynamic pitch-ratio playback matching exact Carnatic Kattai / Shruti
// 4. Crossfade looping for continuous notes as long as fingers cover tone holes
// 5. Authentic continuous Jaaru (Meend) pitch gliding between Swaras
// 6. Real-time Gamaka hand-tilt microtonal detuning (Kampita / Nokku)
// 7. Concert Sabha Convolver Reverb & Classical Tanpura Drone

class FluteAudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;

    // Pitch & State Parameters
    this.currentFreq = 261.63; // Sa C4 (1 Kattai)
    this.currentSwaraObj = null;
    this.isPlaying = false;
    this.breathPressure = 0.88;
    this.gamakaCents = 0;
    this.kattai = '1.5';
    this.octaveShift = 0;
    this.isOverblown = false;
    this.allowedSwaraIds = null;
    this.isJazzMode = false;
    this.isElectricMode = true;
    this.activeElectricVoice = null;
    this.electricDistortionCurve = null;

    // Real Recorded Acoustic Samples
    this.manifest = null;
    this.sampleBuffers = {};
    this.samplesLoaded = false;
    this.activeSampleVoice = null;

    // Audio Graph Core Nodes
    this.activeVoice = null;
    this.masterGain = null;
    this.analyser = null;
    this.reverbNode = null;
    this.reverbGain = null;
    this.dryGain = null;
    this.recDestination = null;

    // Physical Modeling Fallback Tables & Noise
    this.venuWaveMadhya = null;
    this.venuWaveTara = null;
    this.embouchureCurve = null;
    this.noiseBuffer = null;

    // Tanpura Drone
    this.tanpuraActive = false;
    this.tanpuraGain = null;
    this.tanpuraInterval = null;

    // Recording
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
  }

  // Initialize Web Audio Context & Load Real Samples on user gesture
  init() {
    if (this.isInitialized) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
      this.ctx = new AudioContextClass({ latencyHint: 'interactive' });
    } catch (e) {
      this.ctx = new AudioContextClass();
    }

    // 1. Dynamics Compressor (Transparent limiter to prevent digital clipping)
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-10, this.ctx.currentTime);
    compressor.knee.setValueAtTime(20, this.ctx.currentTime);
    compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.90, this.ctx.currentTime);

    // 2. Visualizer Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.84;

    // 3. Authentic Sabha Concert Reverb (Warm South Indian Music Hall acoustics)
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.generateSabhaImpulse(2.4, 2.2);

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0.30, this.ctx.currentTime);

    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    // Audio Graph Wiring
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(compressor);
    this.dryGain.connect(compressor);

    compressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Recording Output
    this.recDestination = this.ctx.createMediaStreamDestination();
    this.masterGain.connect(this.recDestination);

    // Physical Modeling Fallback initialization
    this.createVenuPeriodicWaves();
    this.embouchureCurve = this.createEmbouchureCurve();
    this.noiseBuffer = this.createNoiseBuffer();

    // Tanpura Drone Setup
    this.setupTanpura();

    // 4. Asynchronously Load Real Recorded Carnatic Flute Samples from Aditya's C# Master
    this.loadAcousticSamples();

    this.isInitialized = true;
  }

  async resume() {
    if (!this.isInitialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // -------------------------------------------------------------------------
  // 🎶 ACOUSTIC SAMPLE LOADER (Aditya Original C# Master Flute Recordings)
  // -------------------------------------------------------------------------

  async loadAcousticSamples() {
    try {
      const cacheBust = 'aditya_' + Date.now();
      const res = await fetch('/audio/samples/manifest.json?v=' + cacheBust);
      if (!res.ok) {
        console.warn('Sample manifest not reachable; running on physical model.');
        return;
      }
      this.manifest = await res.json();

      const loadPromises = Object.keys(this.manifest).map(async (key) => {
        const item = this.manifest[key];
        try {
          const fileRes = await fetch('/' + item.file + '?v=' + cacheBust);
          if (!fileRes.ok) return;
          const arrayBuffer = await fileRes.arrayBuffer();
          const decoded = await this.ctx.decodeAudioData(arrayBuffer);
          this.sampleBuffers[key] = decoded;
        } catch (err) {
          console.warn(`Could not decode sample ${key}:`, err);
        }
      });

      await Promise.all(loadPromises);
      this.samplesLoaded = true;
      console.log('✅ Aditya C# Original Master Samples loaded successfully!');
    } catch (e) {
      console.warn('Acoustic samples loading exception:', e);
    }
  }

  // -------------------------------------------------------------------------
  // 🎵 PLAYING SWARAS (Real Samples with Fallback to Physical Modeling)
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // 🎵 PLAYING SWARAS (Real Samples with Fallback to Physical Modeling)
  // -------------------------------------------------------------------------

  setAllowedSwaras(swaraIds) {
    this.allowedSwaraIds = swaraIds ? (Array.isArray(swaraIds) ? swaraIds : Array.from(swaraIds)) : null;
  }

  playSwara(swaraObj, transitionMeta = null, prevFreq = null, prevSwaraObj = null) {
    this.resume();
    this.currentSwaraObj = swaraObj;

    const family = (swaraObj.family || swaraObj.id || 'sa').toLowerCase();
    // User Requirement: "let lower octave sa match the mid octave - for technical purpose do this modification"
    const isLowerSa = (family === 'sa' && this.octaveShift === -1);
    const effectiveOctaveShift = isLowerSa ? 0 : this.octaveShift;

    const freq = window.SwarasData.getSwaraFreq(
      swaraObj,
      this.kattai,
      effectiveOctaveShift,
      this.isOverblown
    );

    // Base sample family ratios from Aditya's original Shankarabharanam flute recordings:
    // Sa=1.0, Ri=R2 (9/8), Ga=G3 (5/4), Ma=M1 (4/3), Pa=3/2, Dha=D2 (5/3), Ni=N3 (15/8)
    const BASE_SAMPLE_FAMILY_RATIOS = {
      sa: 1.0,
      ri: 9 / 8,     // Chathushruti Ri (R2)
      ga: 5 / 4,     // Antara Ga (G3)
      ma: 4 / 3,     // Shuddha Ma (M1)
      pa: 3 / 2,     // Panchamam (Pa)
      dha: 5 / 3,    // Chathushruti Dha (D2)
      ni: 15 / 8     // Kakali Ni (N3)
    };

    const baseFamilyRatio = BASE_SAMPLE_FAMILY_RATIOS[family] || 1.0;
    const swaraRatio = swaraObj.freqRatio || 1.0;
    // Microtonal detuning relative to the acoustic master sample:
    const swaraDetuneCents = 1200 * Math.log2(swaraRatio / baseFamilyRatio);

    let sampleId = family;
    if (this.octaveShift === -1) {
      const bassId = 'bass_' + family;
      if (this.sampleBuffers[bassId]) {
        sampleId = bassId;
      }
    } else if (this.octaveShift === 1 || this.isOverblown) {
      const highId = family + '_high';
      if (this.sampleBuffers[highId]) {
        sampleId = highId;
      }
    }

    if (this.isElectricMode) {
      this.playElectricFlute(sampleId, freq, swaraDetuneCents, transitionMeta, prevFreq || this.currentFreq, prevSwaraObj || this.currentSwaraObj, swaraObj);
    } else if (this.samplesLoaded && this.sampleBuffers[sampleId]) {
      this.playAcousticSample(sampleId, freq, swaraDetuneCents);
    } else {
      // Instant physical modeling fallback
      if (!this.isPlaying || !this.activeVoice) {
        this.startVoice(freq);
      } else {
        this.updatePitch(freq);
      }
    }
    this.currentFreq = freq;
  }

  playAcousticSample(sampleId, targetFreq, swaraDetuneCents = 0) {
    const now = this.ctx.currentTime;
    const item = this.manifest[sampleId];
    const buffer = this.sampleBuffers[sampleId];
    if (!buffer) return;

    // The samples are Aditya's native 1.5 Kattai (C#) flute recording,
    // tuned in 100% mathematical phase-lock with the C# Tanpura reference drone (276.36 Hz).
    // When kattai is 1.5, playbackRate is exactly 1.0 (pure harmonic resonance).
    const nativeRoot = 276.36; // 1.5 Kattai (C# Tanpura Reference)
    const currentRoot = (window.SwarasData && window.SwarasData.KATTAI_ROOTS[this.kattai]) 
      ? window.SwarasData.KATTAI_ROOTS[this.kattai].freq 
      : 276.36;
    let playbackRate = currentRoot / nativeRoot;

    // Strict Octave Enforcement:
    // When in Higher Octave (+1), ensure pitch is strictly higher octave (x2 if fallback sample used)
    // When in Lower Octave (-1), ensure pitch is strictly lower octave (x0.5 if fallback sample used)
    if ((this.octaveShift === 1 || this.isOverblown) && !sampleId.endsWith('_high')) {
      playbackRate *= 2.0;
    } else if (this.octaveShift === -1 && !sampleId.startsWith('bass_')) {
      playbackRate *= 0.5;
    }

    const totalDetune = this.gamakaCents + swaraDetuneCents;

    // If currently playing the SAME sample, glide the playbackRate & detune smoothly (Jaaru Meend)
    if (this.isPlaying && this.activeSampleVoice && this.activeSampleVoice.sampleId === sampleId) {
      this.activeSampleVoice.source.playbackRate.setTargetAtTime(playbackRate, now, 0.05);
      this.activeSampleVoice.source.detune.setTargetAtTime(totalDetune, now, 0.04);
      this.activeSampleVoice.targetFreq = targetFreq;
      this.activeSampleVoice.swaraDetuneCents = swaraDetuneCents;
      return;
    }

    // Otherwise, create new AudioBufferSourceNode and crossfade
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = item.loopStart || 0.22;
    source.loopEnd = item.loopEnd || (buffer.duration - 0.08);
    source.playbackRate.setValueAtTime(playbackRate, now);

    // 🎷 JAZZ MODE: DRAGGED NOTES PORTAMENTO (GLISSANDO)
    // When transitioning between notes in jazz mode, start at the previous pitch
    // and smoothly slide into target pitch over ~120ms for warm legato phrasing!
    if (this.isJazzMode && this.isPlaying && this.currentFreq && targetFreq && Math.abs(this.currentFreq - targetFreq) > 3) {
      const centsDiff = Math.max(-700, Math.min(700, 1200 * Math.log2(this.currentFreq / targetFreq)));
      const startDetune = totalDetune + centsDiff;
      source.detune.setValueAtTime(startDetune, now);
      source.detune.setTargetAtTime(totalDetune, now, 0.042); // Smooth ~130ms pitch drag
    } else {
      source.detune.setValueAtTime(totalDetune, now);
    }

    const isTaraOctave = sampleId.endsWith('_high') || this.octaveShift === 1 || this.isOverblown;
    const isMandraOctave = sampleId.startsWith('bass_') || this.octaveShift === -1 || targetFreq < 240;
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, now);
    // Boosted acoustic output across all 3 octaves: Mandra lower octave (1.15), Madhya mid octave (1.05), Tara higher octave (0.95)
    const targetGain = (isTaraOctave ? 0.95 : (isMandraOctave ? 1.15 : 1.05)) * this.breathPressure;
    // Crisp 8ms attack in Carnatic classical mode (55ms warm attack in Jazz Mode)
    const attackTime = this.isJazzMode ? 0.055 : 0.008;
    voiceGain.gain.linearRampToValueAtTime(targetGain, now + attackTime);

    // Warm body shaping, Massive Bass Weight, and Tamed Highs across all octaves
    const bodyBassFilter = this.ctx.createBiquadFilter();
    bodyBassFilter.type = 'lowshelf';
    if (isMandraOctave) {
      bodyBassFilter.frequency.setValueAtTime(240, now);
      bodyBassFilter.gain.setValueAtTime(10.5, now);
    } else if (isTaraOctave) {
      bodyBassFilter.frequency.setValueAtTime(340, now);
      bodyBassFilter.gain.setValueAtTime(8.0, now); // Warm foundational bass for high notes
    } else {
      bodyBassFilter.frequency.setValueAtTime(280, now);
      bodyBassFilter.gain.setValueAtTime(9.2, now); // Rich woody bass weight for mid notes
    }

    // High Cut: Tames harsh treble glare, sibilance, and room reflection highs
    const highCutFilter = this.ctx.createBiquadFilter();
    highCutFilter.type = 'highshelf';
    highCutFilter.frequency.setValueAtTime(3400, now);
    highCutFilter.gain.setValueAtTime(-6.0, now);

    source.connect(bodyBassFilter);
    bodyBassFilter.connect(highCutFilter);
    highCutFilter.connect(voiceGain);
    voiceGain.connect(this.dryGain);

    // Tara higher octave gets spacious concert hall bloom (warm Sabha acoustics)
    if (isTaraOctave) {
      const taraReverbGain = this.ctx.createGain();
      taraReverbGain.gain.setValueAtTime(1.35, now);
      voiceGain.connect(taraReverbGain);
      taraReverbGain.connect(this.reverbNode);
    } else {
      voiceGain.connect(this.reverbNode);
    }

    source.start(now);

    // Fade out previous voices cleanly: 16ms in Carnatic mode so rapid ornament notes (e.g. Ni in Sa-Ni-Sa) stop promptly
    this.fadePreviousVoice(this.isJazzMode ? 0.080 : 0.016);

    this.activeSampleVoice = {
      source,
      gain: voiceGain,
      sampleId,
      playbackRate,
      targetFreq,
      swaraDetuneCents
    };
    this.isPlaying = true;
  }

  // -------------------------------------------------------------------------
  // ⚡ ELECTRIC FLUTE AUDIO SYNTHESIZER ENGINE (EWI / Synth Lead Fusion)
  // -------------------------------------------------------------------------
  playElectricFlute(sampleId, targetFreq, swaraDetuneCents = 0, transitionMeta = null, prevFreq = null, prevSwaraObj = null, swaraObj = null) {
    const now = this.ctx.currentTime;
    const fromFreq = prevFreq || this.currentFreq;
    const fromSwara = prevSwaraObj || this.currentSwaraObj;
    const isLegato = Boolean(
      (transitionMeta && transitionMeta.isLegato) ||
      (this.isPlaying && fromSwara && fromFreq && targetFreq && Math.abs(fromFreq - targetFreq) > 3)
    );

    // If currently playing the electric voice and pitch is identical, skip
    if (this.isPlaying && this.activeElectricVoice && Math.abs(this.activeElectricVoice.targetFreq - targetFreq) < 1) {
      return;
    }

    // If currently playing and legato glide, glide the existing electric voice
    if (this.isPlaying && this.activeElectricVoice && isLegato) {
      const isLowerOctave = (this.octaveShift === -1 || targetFreq < 240);
      const glideTime = 0.015; // Crisp 15ms classical Indian woodwind pitch transition
      this.activeElectricVoice.oscillators.forEach(osc => {
        const mult = osc._freqMultiplier || 1.0;
        osc.frequency.cancelScheduledValues(now);
        osc.frequency.setValueAtTime(osc.frequency.value, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, targetFreq * mult), now + glideTime);
      });
      const baseCutoff = Math.min(3600, Math.max(1000, targetFreq * 2.2));
      this.activeElectricVoice.filter.frequency.setTargetAtTime(baseCutoff * (0.65 + 0.45 * this.breathPressure), now, 0.015);
      const isTaraOctave = (this.octaveShift === 1 || this.isOverblown || targetFreq > 600);
      if (this.activeElectricVoice.bassEQ) {
        const targetBassGain = isLowerOctave ? 11.5 : (isTaraOctave ? 9.0 : 10.2);
        const targetBassFreq = isLowerOctave ? 220 : (isTaraOctave ? 360 : 300);
        this.activeElectricVoice.bassEQ.frequency.setTargetAtTime(targetBassFreq, now, 0.015);
        this.activeElectricVoice.bassEQ.gain.setTargetAtTime(targetBassGain, now, 0.015);
      }
      if (this.activeElectricVoice.bodyWeightEQ) {
        const bodyFreq = isLowerOctave ? 280 : (isTaraOctave ? 440 : 340);
        this.activeElectricVoice.bodyWeightEQ.frequency.setTargetAtTime(bodyFreq, now, 0.015);
        this.activeElectricVoice.bodyWeightEQ.gain.setTargetAtTime(isLowerOctave ? 5.0 : 6.8, now, 0.015);
      }
      if (this.activeElectricVoice.oscMixGainSub) {
        const targetSubGain = isLowerOctave ? 0.82 : (isTaraOctave ? 0.58 : 0.66);
        this.activeElectricVoice.oscMixGainSub.gain.setTargetAtTime(targetSubGain, now, 0.015);
      }
      if (this.activeElectricVoice.boreBreathFilter) {
        this.activeElectricVoice.boreBreathFilter.frequency.setTargetAtTime(targetFreq, now, 0.015);
      }
      if (this.activeElectricVoice.acousticLayer && this.activeElectricVoice.acousticLayer.source) {
        const nativeRoot = 276.36;
        const currentRoot = (window.SwarasData && window.SwarasData.KATTAI_ROOTS[this.kattai]) 
          ? window.SwarasData.KATTAI_ROOTS[this.kattai].freq 
          : 276.36;
        let layerRate = currentRoot / nativeRoot;
        if ((this.octaveShift === 1 || this.isOverblown) && !sampleId.endsWith('_high')) {
          layerRate *= 2.0;
        } else if (this.octaveShift === -1 && !sampleId.startsWith('bass_')) {
          layerRate *= 0.5;
        }
        this.activeElectricVoice.acousticLayer.source.playbackRate.setTargetAtTime(layerRate, now, 0.035);
        this.activeElectricVoice.acousticLayer.source.detune.setTargetAtTime(this.gamakaCents + swaraDetuneCents, now, 0.035);
      }
      this.activeElectricVoice.targetFreq = targetFreq;
      this.currentFreq = targetFreq;
      return;
    }

    // Crossfade from previous voices
    this.fadePreviousVoice(isLegato ? 0.032 : 0.012);
    this.startElectricVoice(targetFreq, isLegato, fromFreq, swaraObj);

    // 🪈 30% Continuous Earthy Indian Bamboo Flute Acoustic Layer
    // Continuous blend of Aditya's authentic recorded C# bamboo flute master samples (30% gain)
    if (this.samplesLoaded && this.sampleBuffers[sampleId] && this.manifest && this.manifest[sampleId]) {
      try {
        const item = this.manifest[sampleId];
        const buffer = this.sampleBuffers[sampleId];
        const nativeRoot = 276.36;
        const currentRoot = (window.SwarasData && window.SwarasData.KATTAI_ROOTS[this.kattai]) 
          ? window.SwarasData.KATTAI_ROOTS[this.kattai].freq 
          : 276.36;
        let playbackRate = currentRoot / nativeRoot;
        if ((this.octaveShift === 1 || this.isOverblown) && !sampleId.endsWith('_high')) {
          playbackRate *= 2.0;
        } else if (this.octaveShift === -1 && !sampleId.startsWith('bass_')) {
          playbackRate *= 0.5;
        }

        const acousticSource = this.ctx.createBufferSource();
        acousticSource.buffer = buffer;
        acousticSource.loop = true;
        acousticSource.loopStart = item.loopStart || 0.22;
        acousticSource.loopEnd = item.loopEnd || (buffer.duration - 0.08);
        acousticSource.playbackRate.setValueAtTime(playbackRate, now);
        acousticSource.detune.setValueAtTime(this.gamakaCents + swaraDetuneCents, now);

        // Warm earthy wood tone shaping filter (+4.5dB at 520Hz)
        const acousticEarthFilter = this.ctx.createBiquadFilter();
        acousticEarthFilter.type = 'peaking';
        acousticEarthFilter.frequency.setValueAtTime(520, now);
        acousticEarthFilter.Q.setValueAtTime(1.4, now);
        acousticEarthFilter.gain.setValueAtTime(4.5, now);

        // High shelf cut to keep tone warm and velvety
        const acousticHighCut = this.ctx.createBiquadFilter();
        acousticHighCut.type = 'highshelf';
        acousticHighCut.frequency.setValueAtTime(3400, now);
        acousticHighCut.gain.setValueAtTime(-6.0, now);

        // Exactly 30% Indian flute sound layer
        const acousticLayerGain = this.ctx.createGain();
        acousticLayerGain.gain.setValueAtTime(0.001, now);
        acousticLayerGain.gain.linearRampToValueAtTime(0.30 * this.breathPressure, now + (isLegato ? 0.015 : 0.008));

        acousticSource.connect(acousticEarthFilter);
        acousticEarthFilter.connect(acousticHighCut);
        acousticHighCut.connect(acousticLayerGain);
        acousticLayerGain.connect(this.dryGain);

        // Room reverb bloom for natural hall acoustic presence
        const acousticReverbSend = this.ctx.createGain();
        acousticReverbSend.gain.setValueAtTime(0.35, now);
        acousticLayerGain.connect(acousticReverbSend);
        acousticReverbSend.connect(this.reverbNode);

        acousticSource.start(now);

        if (this.activeElectricVoice) {
          this.activeElectricVoice.acousticLayer = {
            source: acousticSource,
            gain: acousticLayerGain,
            sampleId,
            playbackRate,
            swaraDetuneCents
          };
        }
      } catch (e) {}
    }

    this.isPlaying = true;
    this.currentFreq = targetFreq;
  }

  startElectricVoice(targetFreq, isLegato = false, fromFreq = null, swaraObj = null) {
    const now = this.ctx.currentTime;
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, now);

    const isLowerOctave = (this.octaveShift === -1 || targetFreq < 240);

    // 1. Dual Harmonic Oscillators + Sub-Harmonic (Classic EWI Synthesizer Architecture)
    // Primary Lead: Pure Sawtooth Wave (phase-aligned)
    const oscSaw = this.ctx.createOscillator();
    oscSaw.type = 'sawtooth';
    oscSaw._baseDetune = 0;
    oscSaw._freqMultiplier = 1.0;

    // Secondary Lead: Resonant Square / Pulse Wave
    const oscSquare = this.ctx.createOscillator();
    oscSquare.type = 'square';
    oscSquare._baseDetune = 0;
    oscSquare._freqMultiplier = 1.0;

    // Sub-Harmonic Octave: Triangle Wave (0.5x frequency) with massive boost in Lower Octave for good physical weight
    const oscSub = this.ctx.createOscillator();
    oscSub.type = 'triangle';
    oscSub._baseDetune = 0;
    oscSub._freqMultiplier = 0.5;

    const isTaraOctave = (this.octaveShift === 1 || this.isOverblown || targetFreq > 600);

    const oscMixGainSaw = this.ctx.createGain();
    oscMixGainSaw.gain.setValueAtTime(isLowerOctave ? 0.55 : 0.40, now);

    const oscMixGainSquare = this.ctx.createGain();
    oscMixGainSquare.gain.setValueAtTime(isLowerOctave ? 0.48 : 0.44, now);

    const oscMixGainSub = this.ctx.createGain();
    // Sub-Harmonic Bass Weight: Heavy physical weight in Mandra (0.82), deep bass foundation in Madhya (0.66) and Tara (0.58)
    oscMixGainSub.gain.setValueAtTime(isLowerOctave ? 0.82 : (isTaraOctave ? 0.58 : 0.66), now);

    if (isLegato && fromFreq && Math.abs(fromFreq - targetFreq) > 3) {
      oscSaw.frequency.setValueAtTime(fromFreq, now);
      oscSquare.frequency.setValueAtTime(fromFreq, now);
      oscSub.frequency.setValueAtTime(fromFreq * 0.5, now);

      oscSaw.frequency.exponentialRampToValueAtTime(Math.max(20, targetFreq), now + 0.045);
      oscSquare.frequency.exponentialRampToValueAtTime(Math.max(20, targetFreq), now + 0.045);
      oscSub.frequency.exponentialRampToValueAtTime(Math.max(20, targetFreq * 0.5), now + 0.045);
    } else {
      oscSaw.frequency.setValueAtTime(targetFreq, now);
      oscSquare.frequency.setValueAtTime(targetFreq, now);
      oscSub.frequency.setValueAtTime(targetFreq * 0.5, now);
    }

    oscSaw.detune.setValueAtTime(this.gamakaCents + oscSaw._baseDetune, now);
    oscSquare.detune.setValueAtTime(this.gamakaCents + oscSquare._baseDetune, now);
    oscSub.detune.setValueAtTime(this.gamakaCents, now);

    oscSaw.connect(oscMixGainSaw);
    oscSquare.connect(oscMixGainSquare);
    oscSub.connect(oscMixGainSub);

    const oscSum = this.ctx.createGain();
    oscMixGainSaw.connect(oscSum);
    oscMixGainSquare.connect(oscSum);
    oscMixGainSub.connect(oscSum);

    // 2. Warm Lowpass Filter (Ceiling capped at 3600Hz, gentle Q = 1.8 to eliminate harsh shrillness)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const baseCutoff = Math.min(3600, Math.max(1000, targetFreq * 2.2));
    filter.frequency.setValueAtTime(baseCutoff * (0.65 + 0.45 * this.breathPressure), now);
    filter.Q.setValueAtTime(1.8, now); // Smooth velvety resonant roll-off

    // 3. Tube Preamp Saturation Waveshaper
    if (!this.electricDistortionCurve) {
      this.electricDistortionCurve = this.generateElectricDistortionCurve(22);
    }
    const waveShaper = this.ctx.createWaveShaper();
    waveShaper.curve = this.electricDistortionCurve;
    waveShaper.oversample = '2x';

    // 3b. Mandra & Mid/High Bass Weight: Resonant Low-Shelf Boost (+10.2dB Mid, +9.0dB High)
    const bassEQ = this.ctx.createBiquadFilter();
    bassEQ.type = 'lowshelf';
    if (isLowerOctave) {
      bassEQ.frequency.setValueAtTime(220, now);
      bassEQ.gain.setValueAtTime(11.5, now);
    } else if (isTaraOctave) {
      bassEQ.frequency.setValueAtTime(360, now);
      bassEQ.gain.setValueAtTime(9.0, now); // Foundational bass warmth for high notes
    } else {
      bassEQ.frequency.setValueAtTime(300, now);
      bassEQ.gain.setValueAtTime(10.2, now); // Enormous bass weight for mid notes
    }

    // 3c. Acoustic Flute Wood & Bore Body Weight: Peaking Warmth Filter (+6.8dB)
    const bodyWeightEQ = this.ctx.createBiquadFilter();
    bodyWeightEQ.type = 'peaking';
    const bodyFreq = isLowerOctave ? 280 : (isTaraOctave ? 440 : 340);
    bodyWeightEQ.frequency.setValueAtTime(bodyFreq, now);
    bodyWeightEQ.Q.setValueAtTime(1.3, now);
    bodyWeightEQ.gain.setValueAtTime(isLowerOctave ? 5.0 : 6.8, now);

    // 3d. High Frequency Taming: Smooth High-Shelf Cut (-7.5dB above 3200Hz to eliminate digital harshness)
    const highCutEQ = this.ctx.createBiquadFilter();
    highCutEQ.type = 'highshelf';
    highCutEQ.frequency.setValueAtTime(3200, now);
    highCutEQ.gain.setValueAtTime(-7.5, now);

    oscSum.connect(filter);
    filter.connect(waveShaper);
    waveShaper.connect(bassEQ);
    bassEQ.connect(bodyWeightEQ);
    bodyWeightEQ.connect(highCutEQ);
    highCutEQ.connect(voiceGain);

    // 4. 🌬️ CONTINUOUS ORGANIC FLUTE WIND & BORE TURBULENCE ENGINE (30% Earthy Indian Flute Breath)
    // Breathes life into the electric sound with natural bamboo wind texture!
    let windNoise = null;
    let boreBreathFilter = null;
    let earthyWoodFilter = null;
    let windGain = null;
    if (this.noiseBuffer) {
      try {
        windNoise = this.ctx.createBufferSource();
        windNoise.buffer = this.noiseBuffer;
        windNoise.loop = true;

        // Bore column resonant air tracking fundamental swara pitch (rich hollow air core)
        boreBreathFilter = this.ctx.createBiquadFilter();
        boreBreathFilter.type = 'bandpass';
        boreBreathFilter.frequency.setValueAtTime(targetFreq, now);
        boreBreathFilter.Q.setValueAtTime(2.8, now);

        // Earthy bamboo wood cavity node resonance (warm hollow organic body ~540Hz)
        earthyWoodFilter = this.ctx.createBiquadFilter();
        earthyWoodFilter.type = 'bandpass';
        earthyWoodFilter.frequency.setValueAtTime(540, now);
        earthyWoodFilter.Q.setValueAtTime(2.2, now);

        const earthyWoodGain = this.ctx.createGain();
        earthyWoodGain.gain.setValueAtTime(0.35, now);
        earthyWoodFilter.connect(earthyWoodGain);

        // Embouchure lip-plate edge wind rush filter (soft warm chiff, tamed highs)
        const edgeBreathFilter = this.ctx.createBiquadFilter();
        edgeBreathFilter.type = 'bandpass';
        edgeBreathFilter.frequency.setValueAtTime(2200, now);
        edgeBreathFilter.Q.setValueAtTime(1.5, now);

        const edgeGain = this.ctx.createGain();
        edgeGain.gain.setValueAtTime(0.22, now);
        edgeBreathFilter.connect(edgeGain);

        windGain = this.ctx.createGain();
        // Exactly 30% organic Indian flute breath texture
        const initialWindGain = Math.max(0.001, 0.30 * this.breathPressure);
        windGain.gain.setValueAtTime(initialWindGain, now);

        windNoise.connect(boreBreathFilter);
        boreBreathFilter.connect(windGain);

        windNoise.connect(earthyWoodFilter);
        earthyWoodGain.connect(windGain);

        windNoise.connect(edgeBreathFilter);
        edgeGain.connect(windGain);

        // Feed natural earthy wind turbulence into voiceGain
        windGain.connect(voiceGain);

        // Add subtle hall bloom to the breath turbulence
        const windReverb = this.ctx.createGain();
        windReverb.gain.setValueAtTime(0.25, now);
        windGain.connect(windReverb);
        windReverb.connect(this.reverbNode);

        windNoise.start(now);
      } catch (e) {
        windNoise = null;
      }
    }

    // 5. Pure Sustained Tone (Zero automatic LFO oscillation on held notes)
    const vibratoOsc = this.ctx.createOscillator();
    vibratoOsc.frequency.setValueAtTime(5.2, now);
    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.setValueAtTime(0.0001, now);

    vibratoOsc.connect(vibratoGain);
    vibratoGain.connect(oscSaw.detune);
    vibratoGain.connect(oscSquare.detune);

    // 6. Connect to Audio Graph (Dry + Reverb)
    voiceGain.connect(this.dryGain);
    const electricReverbSend = this.ctx.createGain();
    electricReverbSend.gain.setValueAtTime(0.40, now);
    voiceGain.connect(electricReverbSend);
    electricReverbSend.connect(this.reverbNode);

    // 7. Volume Attack Envelope (Equal-loudness compensated: high punch across all 3 octaves)
    const targetGain = (isLowerOctave ? 0.98 : (isTaraOctave ? 0.86 : 0.92)) * this.breathPressure;
    const attackTime = isLegato ? 0.012 : 0.005;
    voiceGain.gain.linearRampToValueAtTime(targetGain, now + attackTime);

    oscSaw.start(now);
    oscSquare.start(now);
    oscSub.start(now);
    vibratoOsc.start(now);

    this.activeElectricVoice = {
      oscillators: [oscSaw, oscSquare, oscSub],
      windNoise,
      boreBreathFilter,
      earthyWoodFilter,
      windGain,
      vibratoOsc,
      gain: voiceGain,
      filter,
      bassEQ,
      bodyWeightEQ,
      highCutEQ,
      oscMixGainSub,
      baseCutoff,
      targetFreq,
      acousticLayer: null
    };
  }

  generateElectricDistortionCurve(k = 24) {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // -------------------------------------------------------------------------
  // 🪈 JANTI SPHURITAM (CARNATIC DOUBLE-NOTE: Sa-Ni-Sa, Ri-Sa-Ri, Ga-Ri-Ga, etc.)
  // -------------------------------------------------------------------------
  // In authentic Carnatic flute tradition, the second note of a Janta Varisai pair
  // is articulated through "Sphuritam" — a rapid micro-ornament flick that
  // momentarily strikes from the immediate lower swara of the scale before snapping back:
  triggerJanti(swaraObj, allowedSwaraIds) {
    this.resume();
    if (!swaraObj && this.currentSwaraObj) {
      swaraObj = this.currentSwaraObj;
    }
    if (!swaraObj) return null;

    // If not already playing, start note normally
    if (!this.isPlaying || (!this.activeSampleVoice && !this.activeVoice)) {
      this.playSwara(swaraObj);
      return null;
    }

    const swaraId = (swaraObj.id || '').toLowerCase();
    const family = (swaraObj.family || swaraId).toLowerCase();
    const activeIds = allowedSwaraIds || this.allowedSwaraIds;

    let centsOffset = -180;
    let phrase = `${swaraObj.swara || swaraObj.short} - ${swaraObj.swara || swaraObj.short}`;

    // Dynamic Sphuritam calculated from active scale
    if (activeIds && window.SwarasData && window.SwarasData.SWARA_BY_ID) {
      const scaleSwaras = activeIds
        .map(id => window.SwarasData.SWARA_BY_ID[id.toLowerCase()])
        .filter(Boolean)
        .sort((a, b) => a.freqRatio - b.freqRatio);

      const idx = scaleSwaras.findIndex(s => s.id === swaraObj.id || s.family === family);
      if (idx > 0) {
        const lowerSwara = scaleSwaras[idx - 1];
        centsOffset = 1200 * Math.log2(lowerSwara.freqRatio / swaraObj.freqRatio);
        phrase = `${swaraObj.short} - ${lowerSwara.short} - ${swaraObj.short}`;
      } else if (idx === 0) {
        // Sa flick down to Mandra Ni (highest note in lower octave)
        const topSwara = scaleSwaras[scaleSwaras.length - 1];
        const mandraRatio = topSwara.freqRatio / 2.0;
        centsOffset = 1200 * Math.log2(mandraRatio / swaraObj.freqRatio);
        phrase = `${swaraObj.short} - ${topSwara.short}̣ - ${swaraObj.short}`;
      }
    } else {
      const JANTI_SPHURITAM = {
        sa:  { phrase: 'Sa - Ni - Sa', centsOffset: -112 },
        ri:  { phrase: 'Ri - Sa - Ri', centsOffset: -204 },
        ga:  { phrase: 'Ga - Ri - Ga', centsOffset: -182 },
        ma:  { phrase: 'Ma - Ga - Ma', centsOffset: -112 },
        pa:  { phrase: 'Pa - Ma - Pa', centsOffset: -204 },
        dha: { phrase: 'Dha - Pa - Dha', centsOffset: -182 },
        ni:  { phrase: 'Ni - Dha - Ni', centsOffset: -204 }
      };
      const base = JANTI_SPHURITAM[family] || JANTI_SPHURITAM.sa;
      centsOffset = base.centsOffset;
      phrase = base.phrase;
    }

    const now = this.ctx.currentTime;
    const baseCents = this.gamakaCents + (this.activeSampleVoice ? (this.activeSampleVoice.swaraDetuneCents || 0) : 0);

    // 1. Acoustic Sample Voice Execution (Authentic C# Bamboo Flute Master Recording)
    if (this.activeSampleVoice) {
      const g = this.activeSampleVoice.gain.gain;
      const d = this.activeSampleVoice.source.detune;
      const baseGain = 0.95 * this.breathPressure;

      // Volume envelope:
      // t0 -> t0+10ms: micro-dip to mark strike boundary (down to 35%)
      // t0+12ms -> t0+55ms: lower note sounds clearly (at 85% volume)
      // t0+65ms -> t0+85ms: snap back with punch (+18% accented re-attack)
      // t0+135ms: settle back to steady normal gain
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0.35 * baseGain, now + 0.010);
      g.linearRampToValueAtTime(0.85 * baseGain, now + 0.022);
      g.setValueAtTime(0.85 * baseGain, now + 0.055);
      g.linearRampToValueAtTime(1.18 * baseGain, now + 0.075);
      g.linearRampToValueAtTime(baseGain, now + 0.135);

      // Pitch Sphuritam flick:
      // t0: base swara (e.g. Ri)
      // t0+10ms -> t0+20ms: drops down to lower swara (e.g. Sa at -204c)
      // t0+20ms -> t0+58ms: holds lower swara for ~38ms
      // t0+58ms -> t0+78ms: snaps back up to base swara with slight +20c nokku
      // t0+115ms: settles smoothly back to exact base pitch
      d.cancelScheduledValues(now);
      d.setValueAtTime(baseCents, now);
      d.setValueAtTime(baseCents, now + 0.006);
      d.linearRampToValueAtTime(baseCents + centsOffset, now + 0.020);
      d.setValueAtTime(baseCents + centsOffset, now + 0.058);
      d.linearRampToValueAtTime(baseCents + 20, now + 0.078);
      d.linearRampToValueAtTime(baseCents, now + 0.115);
    }

    if (this.activeElectricVoice) {
      const g = this.activeElectricVoice.gain.gain;
      const baseGain = 0.85 * this.breathPressure;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value || baseGain, now);
      g.linearRampToValueAtTime(0.32 * baseGain, now + 0.010);
      g.linearRampToValueAtTime(0.88 * baseGain, now + 0.022);
      g.setValueAtTime(0.88 * baseGain, now + 0.055);
      g.linearRampToValueAtTime(1.15 * baseGain, now + 0.075);
      g.linearRampToValueAtTime(baseGain, now + 0.135);

      this.activeElectricVoice.oscillators.forEach(osc => {
        const d = osc.detune;
        const b = (osc._baseDetune || 0) + this.gamakaCents;
        d.cancelScheduledValues(now);
        d.setValueAtTime(b, now);
        d.setValueAtTime(b, now + 0.006);
        d.linearRampToValueAtTime(b + centsOffset, now + 0.020);
        d.setValueAtTime(b + centsOffset, now + 0.058);
        d.linearRampToValueAtTime(b + 20, now + 0.078);
        d.linearRampToValueAtTime(b, now + 0.115);
      });
    }

    // 2. Physical Modeling Voice Fallback
    if (this.activeVoice) {
      const g = this.activeVoice.gain.gain;
      const baseGain = 0.90 * this.breathPressure;

      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0.35 * baseGain, now + 0.010);
      g.linearRampToValueAtTime(0.85 * baseGain, now + 0.022);
      g.setValueAtTime(0.85 * baseGain, now + 0.055);
      g.linearRampToValueAtTime(1.18 * baseGain, now + 0.075);
      g.linearRampToValueAtTime(baseGain, now + 0.135);

      const osc1 = this.activeVoice.primaryOsc.detune;
      const osc2 = this.activeVoice.bodyOsc.detune;
      [osc1, osc2].forEach(detuneParam => {
        detuneParam.cancelScheduledValues(now);
        detuneParam.setValueAtTime(baseCents, now);
        detuneParam.setValueAtTime(baseCents, now + 0.006);
        detuneParam.linearRampToValueAtTime(baseCents + centsOffset, now + 0.020);
        detuneParam.setValueAtTime(baseCents + centsOffset, now + 0.058);
        detuneParam.linearRampToValueAtTime(baseCents + 20, now + 0.078);
        detuneParam.linearRampToValueAtTime(baseCents, now + 0.115);
      });
    }

    // 3. Crisp bamboo breath chiff on the snap-back re-attack
    this.playTongueChiff(now + 0.075);

    return { phrase, centsOffset };
  }

  // Brief 25ms acoustic breath chiff on finger tap / janti re-attack
  playTongueChiff(time) {
    if (!this.noiseBuffer) return;
    try {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, time);
      filter.Q.setValueAtTime(1.8, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.08 * this.breathPressure, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.030);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.dryGain);

      noise.start(time);
      noise.stop(time + 0.035);
    } catch (e) {}
  }

  // Smooth pitch update during note transitions
  updatePitch(targetFreq) {
    const now = this.ctx.currentTime;
    if (this.activeSampleVoice && this.isPlaying) {
      const nativeRoot = 276.36;
      const currentRoot = (window.SwarasData && window.SwarasData.KATTAI_ROOTS[this.kattai]) 
        ? window.SwarasData.KATTAI_ROOTS[this.kattai].freq 
        : 276.36;
      let rate = currentRoot / nativeRoot;
      if ((this.octaveShift === 1 || this.isOverblown) && !this.activeSampleVoice.sampleId.endsWith('_high')) {
        rate *= 2.0;
      } else if (this.octaveShift === -1 && !this.activeSampleVoice.sampleId.startsWith('bass_')) {
        rate *= 0.5;
      }
      this.activeSampleVoice.source.playbackRate.setTargetAtTime(rate, now, 0.055);
      this.activeSampleVoice.targetFreq = targetFreq;
    }

    if (this.activeVoice && this.isPlaying) {
      const glideTime = this.isJazzMode ? 0.12 : 0.06;
      this.activeVoice.primaryOsc.frequency.setTargetAtTime(targetFreq, now, glideTime);
      this.activeVoice.bodyOsc.frequency.setTargetAtTime(targetFreq, now, glideTime);
      this.activeVoice.boreBreathFilter.frequency.setTargetAtTime(targetFreq, now, glideTime);
      this.activeVoice.baseFreq = targetFreq;
    }
  }

  // Smooth crossfade of previous voice without interrupting playback
  fadePreviousVoice(releaseTime = 0.040) {
    const now = this.ctx.currentTime;
    if (this.activeSampleVoice) {
      const oldSample = this.activeSampleVoice;
      this.activeSampleVoice = null;
      oldSample.gain.gain.cancelScheduledValues(now);
      oldSample.gain.gain.setTargetAtTime(0.0001, now, releaseTime);
      setTimeout(() => {
        try {
          oldSample.source.stop();
          oldSample.source.disconnect();
          oldSample.gain.disconnect();
        } catch (e) {}
      }, 160);
    }

    if (this.activeElectricVoice) {
      const oldElectric = this.activeElectricVoice;
      this.activeElectricVoice = null;
      oldElectric.gain.gain.cancelScheduledValues(now);
      oldElectric.gain.gain.setTargetAtTime(0.0001, now, releaseTime);
      setTimeout(() => {
        try {
          if (oldElectric.oscillators) {
            oldElectric.oscillators.forEach(osc => {
              try { osc.stop(); osc.disconnect(); } catch (e) {}
            });
          }
          if (oldElectric.windNoise) {
            try { oldElectric.windNoise.stop(); oldElectric.windNoise.disconnect(); } catch (e) {}
          }
          if (oldElectric.vibratoOsc) {
            try { oldElectric.vibratoOsc.stop(); oldElectric.vibratoOsc.disconnect(); } catch (e) {}
          }
          if (oldElectric.acousticLayer && oldElectric.acousticLayer.source) {
            try {
              oldElectric.acousticLayer.source.stop();
              oldElectric.acousticLayer.source.disconnect();
              oldElectric.acousticLayer.gain.disconnect();
            } catch (e) {}
          }
          oldElectric.gain.disconnect();
        } catch (e) {}
      }, 160);
    }

    if (this.activeVoice) {
      const oldVoice = this.activeVoice;
      this.activeVoice = null;
      oldVoice.gain.gain.cancelScheduledValues(now);
      oldVoice.gain.gain.setTargetAtTime(0.0001, now, releaseTime);
      setTimeout(() => {
        try {
          oldVoice.primaryOsc.stop();
          oldVoice.bodyOsc.stop();
          oldVoice.noiseSource.stop();
          if (oldVoice.flutter1) oldVoice.flutter1.stop();
          if (oldVoice.flutter2) oldVoice.flutter2.stop();
          oldVoice.gain.disconnect();
        } catch (e) {}
      }, 160);
    }
  }

  // Smooth release when stopping
  stopVoice() {
    const now = this.ctx.currentTime;
    const rel = this.isJazzMode ? 0.060 : 0.010;

    if (this.activeSampleVoice) {
      const oldSample = this.activeSampleVoice;
      this.activeSampleVoice = null;
      oldSample.gain.gain.cancelScheduledValues(now);
      oldSample.gain.gain.linearRampToValueAtTime(0.0001, now + rel);
      setTimeout(() => {
        try {
          oldSample.source.stop();
          oldSample.source.disconnect();
          oldSample.gain.disconnect();
        } catch (e) {}
      }, Math.round((rel + 0.02) * 1000));
    }

    if (this.activeElectricVoice) {
      const oldElectric = this.activeElectricVoice;
      this.activeElectricVoice = null;
      oldElectric.gain.gain.cancelScheduledValues(now);
      oldElectric.gain.gain.linearRampToValueAtTime(0.0001, now + rel);
      setTimeout(() => {
        try {
          if (oldElectric.oscillators) {
            oldElectric.oscillators.forEach(osc => {
              try { osc.stop(); osc.disconnect(); } catch (e) {}
            });
          }
          if (oldElectric.windNoise) {
            try { oldElectric.windNoise.stop(); oldElectric.windNoise.disconnect(); } catch (e) {}
          }
          if (oldElectric.vibratoOsc) {
            try { oldElectric.vibratoOsc.stop(); oldElectric.vibratoOsc.disconnect(); } catch (e) {}
          }
          if (oldElectric.acousticLayer && oldElectric.acousticLayer.source) {
            try {
              oldElectric.acousticLayer.source.stop();
              oldElectric.acousticLayer.source.disconnect();
              oldElectric.acousticLayer.gain.disconnect();
            } catch (e) {}
          }
          oldElectric.gain.disconnect();
        } catch (e) {}
      }, Math.round((rel + 0.02) * 1000));
    }

    if (this.activeVoice) {
      const oldVoice = this.activeVoice;
      this.activeVoice = null;
      oldVoice.gain.gain.cancelScheduledValues(now);
      oldVoice.gain.gain.linearRampToValueAtTime(0.0001, now + rel);
      setTimeout(() => {
        try {
          oldVoice.primaryOsc.stop();
          oldVoice.bodyOsc.stop();
          oldVoice.noiseSource.stop();
          if (oldVoice.flutter1) oldVoice.flutter1.stop();
          if (oldVoice.flutter2) oldVoice.flutter2.stop();
          oldVoice.gain.disconnect();
        } catch (e) {}
      }, Math.round((rel + 0.02) * 1000));
    }

    this.isPlaying = false;
  }

  // -------------------------------------------------------------------------
  // 🎛️ CONTROLS & EXPRESSION
  // -------------------------------------------------------------------------

  setGamaka(cents) {
    const newCents = Math.max(-100, Math.min(100, cents));
    // Filter out micro-jitter under 0.6 cents to prevent audio-rate phase flutter
    if (Math.abs(newCents - (this.gamakaCents || 0)) < 0.6) return;
    this.gamakaCents = newCents;
    const now = this.ctx ? this.ctx.currentTime : 0;
    if (this.activeSampleVoice && this.ctx) {
      const swDetune = this.activeSampleVoice.swaraDetuneCents || 0;
      this.activeSampleVoice.source.detune.setTargetAtTime(this.gamakaCents + swDetune, now, 0.035);
    }
    if (this.activeElectricVoice && this.ctx) {
      this.activeElectricVoice.oscillators.forEach(osc => {
        const baseDetune = osc._baseDetune || 0;
        osc.detune.setTargetAtTime(this.gamakaCents + baseDetune, now, 0.035);
      });
      if (this.activeElectricVoice.acousticLayer && this.activeElectricVoice.acousticLayer.source) {
        const swDetune = this.activeElectricVoice.acousticLayer.swaraDetuneCents || 0;
        this.activeElectricVoice.acousticLayer.source.detune.setTargetAtTime(this.gamakaCents + swDetune, now, 0.035);
      }
    }
    if (this.activeVoice && this.ctx) {
      this.activeVoice.primaryOsc.detune.setTargetAtTime(this.gamakaCents, now, 0.035);
      this.activeVoice.bodyOsc.detune.setTargetAtTime(this.gamakaCents, now, 0.035);
    }
  }

  setBreathPressure(pressure) {
    this.breathPressure = Math.max(0, Math.min(1.0, pressure));
    const now = this.ctx.currentTime;
    if (this.activeSampleVoice && this.isPlaying) {
      const isTaraOctave = (this.activeSampleVoice.sampleId && this.activeSampleVoice.sampleId.endsWith('_high')) || this.octaveShift === 1 || this.isOverblown;
      const isMandraOctave = (this.activeSampleVoice.sampleId && this.activeSampleVoice.sampleId.startsWith('bass_')) || this.octaveShift === -1 || (this.activeSampleVoice.targetFreq && this.activeSampleVoice.targetFreq < 240);
      const targetGain = (isTaraOctave ? 0.95 : (isMandraOctave ? 1.15 : 1.05)) * this.breathPressure;
      this.activeSampleVoice.gain.gain.setTargetAtTime(targetGain, now, 0.03);
    }
    if (this.activeElectricVoice && this.isPlaying) {
      const freq = this.activeElectricVoice.targetFreq || this.currentFreq;
      const isLowerOctave = (this.octaveShift === -1 || (freq && freq < 240));
      const isTaraOctave = (this.octaveShift === 1 || this.isOverblown || (freq && freq > 600));
      const targetGain = (isLowerOctave ? 0.98 : (isTaraOctave ? 0.86 : 0.92)) * this.breathPressure;
      this.activeElectricVoice.gain.gain.setTargetAtTime(targetGain, now, 0.03);
      if (this.activeElectricVoice.filter) {
        const baseCutoff = this.activeElectricVoice.baseCutoff || 2200;
        const dynamicCutoff = Math.min(3600, baseCutoff * (0.65 + 0.45 * this.breathPressure));
        this.activeElectricVoice.filter.frequency.setTargetAtTime(dynamicCutoff, now, 0.03);
      }
      if (this.activeElectricVoice.windGain) {
        const targetWind = Math.max(0.001, 0.30 * this.breathPressure);
        this.activeElectricVoice.windGain.gain.setTargetAtTime(targetWind, now, 0.03);
      }
      if (this.activeElectricVoice.acousticLayer && this.activeElectricVoice.acousticLayer.gain) {
        this.activeElectricVoice.acousticLayer.gain.gain.setTargetAtTime(0.30 * this.breathPressure, now, 0.03);
      }
    }
    if (this.activeVoice && this.isPlaying) {
      const freq = this.activeVoice.baseFreq || this.currentFreq;
      const isLowerOctave = (this.octaveShift === -1 || (freq && freq < 240));
      const isTaraOctave = (this.octaveShift === 1 || this.isOverblown || (freq && freq > 600));
      const targetGain = (isLowerOctave ? 0.98 : (isTaraOctave ? 0.86 : 0.92)) * this.breathPressure;
      this.activeVoice.gain.gain.setTargetAtTime(targetGain, now, 0.03);
    }
  }

  setKattai(kattaiId) {
    this.kattai = kattaiId;
    this.updateTanpuraPitch();
    if (this.isPlaying && this.currentSwaraObj) {
      this.playSwara(this.currentSwaraObj);
    }
  }

  setOctaveShift(shift) {
    // Strictly clamp to exactly 1 lower (-1) and 1 higher (+1) octave
    const newShift = Math.max(-1, Math.min(1, parseInt(shift, 10) || 0));
    if (this.octaveShift === newShift) return;
    this.octaveShift = newShift;
    if (this.isPlaying && this.currentSwaraObj) {
      this.playSwara(this.currentSwaraObj);
    }
  }

  setOverblown(isOver) {
    this.isOverblown = isOver;
    if (this.isPlaying && this.currentSwaraObj) {
      this.playSwara(this.currentSwaraObj);
    }
  }

  // ⚡ Electric Flute Mode: expressive EWI synth lead fusion
  setElectricMode(enabled) {
    this.isElectricMode = Boolean(enabled);
    if (this.isPlaying && this.currentSwaraObj) {
      this.playSwara(this.currentSwaraObj);
    }
    return this.isElectricMode;
  }

  toggleElectricMode() {
    return this.setElectricMode(!this.isElectricMode);
  }

  // 🎷 Jazz Flute Mode: smooth dragged legato notes (glissando / portamento)
  setJazzMode(enabled) {
    this.isJazzMode = Boolean(enabled);
    return this.isJazzMode;
  }

  // Direct note playback for simulations and tutorials (e.g. Step 4 octave tests)
  playDirectNote(freq, breathPressure = 0.75) {
    this.resume();
    this.setBreathPressure(breathPressure);
    this.startVoice(freq);
    this.isPlaying = true;
  }

  setTimbre() {}

  // -------------------------------------------------------------------------
  // 🎋 PHYSICAL MODELING FALLBACK SYNTHESIZER
  // -------------------------------------------------------------------------

  createVenuPeriodicWaves() {
    const numHarmonics = 32;
    const realM = new Float32Array(numHarmonics);
    const imagM = new Float32Array(numHarmonics);
    realM[0] = 0; imagM[0] = 0;

    const amplitudesM = [0, 1.000, 0.540, 0.280, 0.135, 0.070, 0.038, 0.020, 0.011, 0.006, 0.003];
    for (let n = 1; n < amplitudesM.length; n++) {
      const phase = (n - 1) * 0.35;
      realM[n] = amplitudesM[n] * Math.cos(phase);
      imagM[n] = amplitudesM[n] * Math.sin(phase);
    }
    this.venuWaveMadhya = this.ctx.createPeriodicWave(realM, imagM, { disableNormalization: false });

    const realT = new Float32Array(numHarmonics);
    const imagT = new Float32Array(numHarmonics);
    realT[0] = 0; imagT[0] = 0;

    const amplitudesT = [0, 1.000, 0.440, 0.240, 0.110, 0.055, 0.026, 0.013, 0.006];
    for (let n = 1; n < amplitudesT.length; n++) {
      const phase = (n - 1) * 0.42;
      realT[n] = amplitudesT[n] * Math.cos(phase);
      imagT[n] = amplitudesT[n] * Math.sin(phase);
    }
    this.venuWaveTara = this.ctx.createPeriodicWave(realT, imagT, { disableNormalization: false });
  }

  createEmbouchureCurve() {
    const n = 2048;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(1.35 * x) * 0.82 + (x - (x * x * x) / 3.0) * 0.18;
    }
    return curve;
  }

  createNoiseBuffer() {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555;
      b1 = 0.99332 * b1 + white * 0.0750;
      b2 = 0.96900 * b2 + white * 0.1538;
      b3 = 0.86650 * b3 + white * 0.3104;
      b4 = 0.55000 * b4 + white * 0.5329;
      b5 = -0.7616 * b5 - white * 0.0168;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.10;
    }
    return buffer;
  }

  generateSabhaImpulse(duration, decay) {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const decayFactor = Math.exp(-t * (3.8 / decay));
      const earlyRefl = (i === Math.floor(sampleRate * 0.024) || i === Math.floor(sampleRate * 0.052)) ? 0.28 : 0;
      left[i] = ((Math.random() * 2 - 1) * decayFactor + earlyRefl) * 0.65;
      right[i] = ((Math.random() * 2 - 1) * decayFactor + earlyRefl) * 0.65;
    }
    return impulse;
  }

  startVoice(freq) {
    this.stopVoice();

    const now = this.ctx.currentTime;
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, now);

    const isLowerOctave = (this.octaveShift === -1 || freq < 240);

    const primaryOsc = this.ctx.createOscillator();
    const wave = this.isOverblown ? this.venuWaveTara : this.venuWaveMadhya;
    primaryOsc.setPeriodicWave(wave);
    primaryOsc.frequency.setValueAtTime(freq, now);

    const bodyOsc = this.ctx.createOscillator();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(freq, now);
    const bodyGain = this.ctx.createGain();
    bodyGain.gain.setValueAtTime(isLowerOctave ? 0.52 : 0.40, now);
    bodyOsc.connect(bodyGain);

    const waveShaper = this.ctx.createWaveShaper();
    waveShaper.curve = this.embouchureCurve;
    waveShaper.oversample = '2x';

    primaryOsc.connect(waveShaper);
    bodyGain.connect(waveShaper);

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    noiseSource.loop = true;

    const boreBreathFilter = this.ctx.createBiquadFilter();
    boreBreathFilter.type = 'bandpass';
    boreBreathFilter.frequency.setValueAtTime(freq, now);
    boreBreathFilter.Q.setValueAtTime(4.2, now);
    const boreBreathGain = this.ctx.createGain();
    boreBreathGain.gain.setValueAtTime(0.085, now);

    const chiffFilter = this.ctx.createBiquadFilter();
    chiffFilter.type = 'bandpass';
    chiffFilter.frequency.setValueAtTime(3600, now);
    chiffFilter.Q.setValueAtTime(1.5, now);
    const chiffGain = this.ctx.createGain();
    chiffGain.gain.setValueAtTime(0.0001, now);
    chiffGain.gain.linearRampToValueAtTime(0.065, now + 0.02);
    chiffGain.gain.exponentialRampToValueAtTime(0.032, now + 0.08);

    noiseSource.connect(boreBreathFilter);
    boreBreathFilter.connect(boreBreathGain);
    noiseSource.connect(chiffFilter);
    chiffFilter.connect(chiffGain);

    waveShaper.connect(voiceGain);
    boreBreathGain.connect(voiceGain);
    chiffGain.connect(voiceGain);

    const woodResonance = this.ctx.createBiquadFilter();
    woodResonance.type = 'peaking';
    woodResonance.frequency.setValueAtTime(880, now);
    woodResonance.Q.setValueAtTime(1.8, now);
    woodResonance.gain.setValueAtTime(3.4, now);

    const holeRadiation = this.ctx.createBiquadFilter();
    holeRadiation.type = 'peaking';
    holeRadiation.frequency.setValueAtTime(2250, now);
    holeRadiation.Q.setValueAtTime(1.6, now);
    holeRadiation.gain.setValueAtTime(2.6, now);

    const bambooDamping = this.ctx.createBiquadFilter();
    bambooDamping.type = 'lowpass';
    const cutoff = this.isOverblown ? 6600 : 5200;
    bambooDamping.frequency.setValueAtTime(cutoff, now);
    bambooDamping.Q.setValueAtTime(0.65, now);

    // Mandra & Mid/High Bass Weight Filter (+8.5dB lower octave, +6.2dB mid/high)
    const bassWeightFilter = this.ctx.createBiquadFilter();
    bassWeightFilter.type = 'lowshelf';
    bassWeightFilter.frequency.setValueAtTime(isLowerOctave ? 240 : 300, now);
    bassWeightFilter.gain.setValueAtTime(isLowerOctave ? 8.5 : 6.2, now);

    voiceGain.connect(woodResonance);
    woodResonance.connect(holeRadiation);
    holeRadiation.connect(bambooDamping);
    bambooDamping.connect(bassWeightFilter);

    bassWeightFilter.connect(this.dryGain);
    bassWeightFilter.connect(this.reverbNode);

    const isTaraOctave = (this.octaveShift === 1 || this.isOverblown || freq > 600);
    const targetGain = (isLowerOctave ? 0.98 : (isTaraOctave ? 0.86 : 0.92)) * this.breathPressure;
    voiceGain.gain.cancelScheduledValues(now);
    voiceGain.gain.linearRampToValueAtTime(targetGain, now + 0.032);

    primaryOsc.start(now);
    bodyOsc.start(now);
    noiseSource.start(now);

    this.activeVoice = {
      gain: voiceGain,
      primaryOsc,
      bodyOsc,
      noiseSource,
      boreBreathFilter,
      bambooDamping,
      baseFreq: freq
    };

    this.isPlaying = true;
  }

  // -------------------------------------------------------------------------
  // 🪕 TANPURA DRONE ENGINE (Authentic Acoustic C# Indian Tanpura BGM)
  // -------------------------------------------------------------------------

  setupTanpura() {
    this.tanpuraVolume = 0.6;
    this.tanpuraGain = this.ctx.createGain();
    this.tanpuraGain.gain.setValueAtTime(this.tanpuraVolume * 0.45, this.ctx.currentTime);

    // Warm acoustic presence filter for authentic jawari harmonics
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4800, this.ctx.currentTime);

    this.tanpuraGain.connect(filter);
    filter.connect(this.dryGain);
    filter.connect(this.reverbNode);

    // Authentic Indian Acoustic Tanpura recording in C# (1.5 Kattai)
    this.tanpuraAudio = new Audio();
    this.tanpuraAudio.loop = true;
    this.tanpuraAudio.crossOrigin = 'anonymous';
    this.tanpuraAudio.preload = 'auto';

    const canPlayMp3 = this.tanpuraAudio.canPlayType('audio/mpeg');
    this.tanpuraAudio.src = (canPlayMp3 !== '') ? '/audio/tanpura_c_sharp.mp3' : '/audio/tanpura_c_sharp.m4a';

    try {
      this.tanpuraSourceNode = this.ctx.createMediaElementSource(this.tanpuraAudio);
      this.tanpuraSourceNode.connect(this.tanpuraGain);
    } catch (e) {
      console.warn('Tanpura MediaElementSource note:', e);
      this.tanpuraAudio.volume = this.tanpuraVolume * 0.45;
    }
  }

  updateTanpuraPitch() {
    if (!this.tanpuraAudio) return;
    // Native recording is tuned precisely to C# (1.5 Kattai = 276.36 Hz)
    const nativeRoot = 276.36;
    const currentRoot = (window.SwarasData && window.SwarasData.KATTAI_ROOTS[this.kattai])
      ? window.SwarasData.KATTAI_ROOTS[this.kattai].freq
      : 276.36;
    const rate = Math.max(0.5, Math.min(2.0, currentRoot / nativeRoot));
    this.tanpuraAudio.playbackRate = rate;
  }

  toggleTanpura(active) {
    this.resume();
    this.tanpuraActive = active;
    if (active) this.startTanpura();
    else this.stopTanpura();
  }

  setTanpuraVolume(val) {
    this.tanpuraVolume = val;
    if (this.tanpuraGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.tanpuraGain.gain.cancelScheduledValues(now);
      this.tanpuraGain.gain.linearRampToValueAtTime(val * 0.45, now + 0.05);
    }
    if (this.tanpuraAudio) {
      this.tanpuraAudio.volume = Math.max(0, Math.min(1, val));
    }
  }

  startTanpura() {
    if (!this.tanpuraActive) return;
    this.resume();
    this.updateTanpuraPitch();
    if (this.tanpuraAudio) {
      const now = this.ctx ? this.ctx.currentTime : 0;
      if (this.tanpuraGain && this.ctx) {
        this.tanpuraGain.gain.cancelScheduledValues(now);
        this.tanpuraGain.gain.setValueAtTime(0.0001, now);
        this.tanpuraGain.gain.linearRampToValueAtTime((this.tanpuraVolume ?? 0.6) * 0.45, now + 0.8);
      }
      this.tanpuraAudio.play().catch(e => {
        console.warn('Tanpura play prevented by browser policy:', e);
      });
    }
  }

  stopTanpura() {
    if (this.tanpuraAudio) {
      const now = this.ctx ? this.ctx.currentTime : 0;
      if (this.tanpuraGain && this.ctx) {
        this.tanpuraGain.gain.cancelScheduledValues(now);
        this.tanpuraGain.gain.setValueAtTime(this.tanpuraGain.gain.value, now);
        this.tanpuraGain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
      }
      setTimeout(() => {
        if (!this.tanpuraActive && this.tanpuraAudio) {
          this.tanpuraAudio.pause();
        }
      }, 450);
    }
  }

  // -------------------------------------------------------------------------
  // 🎙️ RECORDING (.webm)
  // -------------------------------------------------------------------------

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
      a.download = `carnatic-flute-${Date.now()}.webm`;
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

  playTalaClick(isSamam = false) {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (isSamam) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
        gain.gain.setValueAtTime(0.65, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);

        const click = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        click.type = 'triangle';
        click.frequency.setValueAtTime(1100, t);
        click.frequency.exponentialRampToValueAtTime(250, t + 0.025);
        clickGain.gain.setValueAtTime(0.45, t);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        click.connect(clickGain);
        clickGain.connect(this.masterGain || this.ctx.destination);
        click.start(t);
        click.stop(t + 0.035);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(680, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.035);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.045);
      }
    } catch (e) {
      console.warn('Tala audio click error:', e);
    }
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
window.FluteAudioEngine = FluteAudioEngine;
