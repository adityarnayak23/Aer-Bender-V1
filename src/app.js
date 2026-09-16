// Main Application Controller for Air Flute

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const videoEl = document.getElementById('webcamVideo');
  const canvasEl = document.getElementById('trackingCanvas');
  const visualizerCanvas = document.getElementById('visualizerCanvas');

  // Camera Controls
  const startCameraBtn = document.getElementById('startCameraBtn');
  const stopCameraBtn = document.getElementById('stopCameraBtn');
  const cameraStatusEl = document.getElementById('cameraStatus');

  // Sensitivity & Flute Height Sliders
  const sensitivitySlider = document.getElementById('sensitivitySlider');
  const sensitivityVal = document.getElementById('sensitivityVal');
  const fluteHeightSlider = document.getElementById('fluteHeightSlider');
  const fluteHeightVal = document.getElementById('fluteHeightVal');

  // HUD Elements
  const spatialOctaveBar = document.getElementById('spatialOctaveBar');
  const zoneMandra = document.getElementById('zoneMandra');
  const zoneMadhya = document.getElementById('zoneMadhya');
  const zoneTara = document.getElementById('zoneTara');
  const flutePosCursor = document.getElementById('flutePosCursor');
  const mouthApertureFill = document.getElementById('mouthApertureFill');
  const holesDiagramEl = document.getElementById('holesDiagram');
  const swarasCardsContainer = document.getElementById('swarasCardsContainer');

  // Carnatic Raga & Swarasthanas Builder Elements
  const ragaSelect = document.getElementById('ragaSelect');
  const ragaNameBadge = document.getElementById('ragaNameBadge');
  const ragaNotesList = document.getElementById('ragaNotesList');
  const swarasthanasMatrix = document.getElementById('swarasthanasMatrix');

  // Expression & Gamaka HUD
  const gamakaMeterBar = document.getElementById('gamakaMeterBar');
  const gamakaValEl = document.getElementById('gamakaVal');

  // Side Guide Elements
  const legendMandra = document.getElementById('legendMandra');
  const legendMadhya = document.getElementById('legendMadhya');
  const legendTara = document.getElementById('legendTara');

  // Controls Elements
  const kattaiSelect = document.getElementById('kattaiSelect');
  const octaveDownBtn = document.getElementById('octaveDownBtn');
  const octaveUpBtn = document.getElementById('octaveUpBtn');
  const octaveDisplay = document.getElementById('octaveDisplay');
  const overblowToggleBtn = document.getElementById('overblowToggleBtn');
  const masterVolumeSlider = document.getElementById('masterVolumeSlider');

  // Electric Flute & Tanpura Elements
  const electricFluteToggleBtn = document.getElementById('electricFluteToggleBtn');
  const timbreModeBadge = document.getElementById('timbreModeBadge');
  const tanpuraToggleBtn = document.getElementById('tanpuraToggleBtn');
  const tanpuraVolumeSlider = document.getElementById('tanpuraVolumeSlider');

  // Recording Elements
  const recordBtn = document.getElementById('recordBtn');
  const recTimerEl = document.getElementById('recTimer');

  // State
  const state = {
    isCameraRunning: false,
    currentSwara: null,
    octave: 0,
    isJazzMode: false,
    isElectricMode: true,
    recordTimerInterval: null,
    recSeconds: 0,
    activeRagaKey: 'mayamalavagowla',
    activeSwarasSet: new Set(['sa', 'ri1', 'ga3', 'ma1', 'pa', 'dha1', 'ni3'])
  };

  // 1. Initialize Audio Engine
  const audio = new window.FluteAudioEngine();
  if (kattaiSelect) audio.setKattai(kattaiSelect.value);

  // 2. Initialize Visualizer with cached buffers (Zero GC overhead)
  const visualizerCtx = visualizerCanvas.getContext('2d');
  let isVisRunning = true;
  let cachedFreqData = null;
  let cachedTimeData = null;

  // Peak hold meters for electric mode
  const peakLevels = new Float32Array(48);
  const peakDecay = 0.04;

  // Floating organic breath particles for classical mode
  const organicParticles = [];
  for (let i = 0; i < 28; i++) {
    organicParticles.push({
      x: Math.random() * 560,
      y: Math.random() * 60,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -0.3 - Math.random() * 0.7,
      size: 1 + Math.random() * 2.2,
      alpha: 0.1 + Math.random() * 0.5,
      hue: Math.random() > 0.5 ? 42 : 155 // golden amber (42) or emerald jade (155)
    });
  }

  function renderVisualizer() {
    if (!isVisRunning) return;

    const w = visualizerCanvas.width;
    const h = visualizerCanvas.height;
    visualizerCtx.clearRect(0, 0, w, h);

    if (audio && audio.analyser) {
      const bufferLength = audio.analyser.frequencyBinCount;
      if (!cachedFreqData || cachedFreqData.length !== bufferLength) {
        cachedFreqData = new Uint8Array(bufferLength);
        cachedTimeData = new Uint8Array(bufferLength);
      }

      audio.analyser.getByteFrequencyData(cachedFreqData);
      audio.analyser.getByteTimeDomainData(cachedTimeData);

      const isElectric = state.isElectricMode;

      // Calculate total RMS / amplitude
      let sumSquares = 0;
      for (let i = 0; i < 64; i++) {
        const norm = (cachedTimeData[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / 64);
      const isSounding = rms > 0.02 || (audio.isPlaying);

      if (isElectric) {
        // =====================================================================
        // ELECTRIC MODE: High-contrast Neon Cyberpunk DAW Spectrum Analyzer
        // =====================================================================
        // Subtle background grid scanlines
        visualizerCtx.save();
        visualizerCtx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
        visualizerCtx.lineWidth = 1;
        for (let gy = 12; gy < h; gy += 12) {
          visualizerCtx.beginPath();
          visualizerCtx.moveTo(0, gy);
          visualizerCtx.lineTo(w, gy);
          visualizerCtx.stroke();
        }
        visualizerCtx.restore();

        // 1. Sharp segmented LED frequency bars
        const barCount = 44;
        const barWidth = 6;
        const gap = 3;
        const totalW = barCount * (barWidth + gap);
        const startX = Math.max(8, (w - totalW) / 2);
        const step = Math.floor((bufferLength * 0.45) / barCount);

        for (let i = 0; i < barCount; i++) {
          const val = cachedFreqData[i * step] || 0;
          const pct = val / 255;
          const barH = Math.max(2, pct * (h - 12));
          const x = startX + i * (barWidth + gap);
          const y = h - 4 - barH;

          // Update peak level with decay
          if (pct > (peakLevels[i] || 0)) {
            peakLevels[i] = pct;
          } else {
            peakLevels[i] = Math.max(0, (peakLevels[i] || 0) - peakDecay);
          }

          // Cyberpunk Neon Cyan to Magenta Gradient
          const barGrad = visualizerCtx.createLinearGradient(0, h - 4, 0, y);
          barGrad.addColorStop(0.0, 'rgba(6, 182, 212, 0.25)');
          barGrad.addColorStop(0.65, '#00f0ff');
          barGrad.addColorStop(1.0, '#ec4899');
          visualizerCtx.fillStyle = barGrad;

          visualizerCtx.fillRect(x, y, barWidth, barH);

          // Peak-hold dot
          if (peakLevels[i] > 0.08) {
            const peakY = h - 4 - (peakLevels[i] * (h - 12)) - 2;
            visualizerCtx.fillStyle = '#ffffff';
            visualizerCtx.shadowColor = '#00f0ff';
            visualizerCtx.shadowBlur = 6;
            visualizerCtx.fillRect(x, Math.max(2, peakY), barWidth, 2);
            visualizerCtx.shadowBlur = 0;
          }
        }

        // 2. High-contrast angular oscilloscope with digital glitch glow
        visualizerCtx.save();
        visualizerCtx.shadowColor = 'rgba(0, 240, 255, 0.9)';
        visualizerCtx.shadowBlur = 10;
        visualizerCtx.lineWidth = 1.8;
        visualizerCtx.strokeStyle = '#00f0ff';

        visualizerCtx.beginPath();
        const sliceW = w / bufferLength;
        let ox = 0;
        for (let i = 0; i < bufferLength; i += 2) {
          const v = cachedTimeData[i] / 128.0;
          const oy = (v * (h * 0.45)) + (h * 0.22);
          if (i === 0) visualizerCtx.moveTo(ox, oy);
          else visualizerCtx.lineTo(ox, oy);
          ox += sliceW * 2;
        }
        visualizerCtx.stroke();
        visualizerCtx.restore();

      } else {
        // =====================================================================
        // CLASSICAL MODE: Fluid Organic Gamaka Waveforms & Glowing Particles
        // =====================================================================
        // 1. Organic drifting breath particles
        visualizerCtx.save();
        for (let i = 0; i < organicParticles.length; i++) {
          const p = organicParticles[i];
          p.x += p.vx * (isSounding ? 1.6 : 0.6);
          p.y += p.vy * (isSounding ? 1.8 : 0.7);

          if (p.y < 0) {
            p.y = h;
            p.x = Math.random() * w;
          }
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;

          const activeAlpha = isSounding ? Math.min(0.85, p.alpha + rms * 1.5) : p.alpha * 0.4;
          visualizerCtx.fillStyle = p.hue === 42
            ? `hsla(42, 95%, 65%, ${activeAlpha})`
            : `hsla(155, 80%, 60%, ${activeAlpha})`;

          visualizerCtx.shadowColor = p.hue === 42 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(16, 185, 129, 0.8)';
          visualizerCtx.shadowBlur = isSounding ? 8 : 3;

          visualizerCtx.beginPath();
          visualizerCtx.arc(p.x, p.y, p.size * (isSounding ? 1.3 : 1.0), 0, Math.PI * 2);
          visualizerCtx.fill();
        }
        visualizerCtx.restore();

        // 2. Continuous, fluid layered Gamaka ribbon curves
        const waveLayers = [
          { stroke: 'rgba(245, 158, 11, 0.45)', glow: 'rgba(245, 158, 11, 0.4)', width: 1.2, phase: 0, amp: 0.55 },
          { stroke: 'rgba(16, 185, 129, 0.65)', glow: 'rgba(16, 185, 129, 0.6)', width: 1.6, phase: 12, amp: 0.75 },
          { stroke: '#ffffff', glow: 'rgba(255, 255, 255, 0.85)', width: 2.0, phase: 24, amp: 1.0 }
        ];

        const step = Math.max(1, Math.floor(bufferLength / 120));
        for (let l = 0; l < waveLayers.length; l++) {
          const layer = waveLayers[l];
          visualizerCtx.save();
          visualizerCtx.shadowColor = layer.glow;
          visualizerCtx.shadowBlur = isSounding ? 12 : 5;
          visualizerCtx.lineWidth = layer.width;
          visualizerCtx.strokeStyle = layer.stroke;

          visualizerCtx.beginPath();
          let prevX = 0;
          let prevY = h / 2;

          for (let i = 0; i < bufferLength; i += step) {
            const idx = (i + layer.phase) % bufferLength;
            const norm = (cachedTimeData[idx] - 128) / 128.0;
            const px = (i / bufferLength) * w;
            const py = (h / 2) + norm * (h * 0.42) * layer.amp;

            if (i === 0) {
              visualizerCtx.moveTo(px, py);
            } else {
              const midX = (prevX + px) / 2;
              const midY = (prevY + py) / 2;
              visualizerCtx.quadraticCurveTo(prevX, prevY, midX, midY);
            }
            prevX = px;
            prevY = py;
          }
          visualizerCtx.lineTo(w, prevY);
          visualizerCtx.stroke();
          visualizerCtx.restore();
        }
      }
    }

    requestAnimationFrame(renderVisualizer);
  }
  requestAnimationFrame(renderVisualizer);

  // 3. Initialize Vision Tracker with Spatial Octave Tracking & Flute Position
  const tracker = new window.CarnaticFluteTracker({
    videoElement: videoEl,
    canvasElement: canvasEl,
    onSwaraDetected: (res) => handleSwaraDetected(res),
    onJantiDetected: (data) => handleJantiDetected(data),
    onGamakaBend: (cents) => handleGamakaBend(cents),
    onOctaveChanged: (octave) => handleOctaveChanged(octave),
    onFlutePosition: (xPos) => handleFlutePosition(xPos),
    onMouthApertureChanged: (mouthData) => handleMouthApertureChanged(mouthData),
    onEmbouchureChanged: (embData) => handleEmbouchureChanged(embData),
    onTrackingStatus: (status) => handleTrackingStatus(status)
  });
  window.fluteTracker = tracker;

  // Handle detected swara from hands
  let silentFramesCount = 0;
  function handleSwaraDetected(res) {
    if (!res || !res.swara) {
      silentFramesCount++;
      // Require 6 consecutive silent frames (~100ms) before muting to absorb momentary camera tracking blips
      if (silentFramesCount >= 6) {
        if (audio.isPlaying) {
          audio.stopVoice();
        }
        state.currentSwara = null;
        highlightActiveCard(null);
        renderHolesDiagram([false, false, false, false, false, false, false]);
      }
      return;
    }
    silentFramesCount = 0;

    const sw = res.swara;
    const isSameSwara = Boolean(state.currentSwara && state.currentSwara.id === sw.id);

    // Only invoke playSwara on fresh note transition or when starting playback!
    // Never re-trigger or hammer playSwara on an already sustaining note!
    if (!isSameSwara || !audio.isPlaying) {
      state.currentSwara = sw;
      audio.setBreathPressure(0.85);
      audio.playSwara(sw);
      highlightActiveCard(sw.id);
    }
    renderHolesDiagram(res.holes);
  }

  function triggerJaruVisual(swaraId) {
    const card = swarasCardsContainer.querySelector(`.swara-card[data-id="${swaraId}"]`);
    if (card) {
      card.classList.add('jaru-glide');
      setTimeout(() => card.classList.remove('jaru-glide'), 350);
    }
  }

  // Handle Carnatic Janti Double-Note Articulation (Sa-Ni-Sa, Ri-Sa-Ri, etc.)
  function handleJantiDetected(data) {
    if (!data || !data.swara) return;
    const sw = data.swara;

    // Trigger authentic Carnatic Janti Sphuritam in audio engine
    const sphuritam = audio.triggerJanti(sw);
    const phrase = data.phrase || (sphuritam && sphuritam.phrase) || `${sw.swara} - ${sw.swara}`;

    // Flash glowing gold aura on HUD swara card
    highlightJantiCard(sw.id, phrase);
  }

  function highlightJantiCard(swaraId, phrase) {
    const card = swarasCardsContainer.querySelector(`.swara-card[data-id="${swaraId}"]`);
    if (card) {
      card.classList.add('janti-flash');
      setTimeout(() => card.classList.remove('janti-flash'), 500);
    }
  }

  // Handle microtonal Gamaka wrist tilt
  function handleGamakaBend(cents) {
    audio.setGamaka(cents);
    if (gamakaValEl) {
      const rounded = Math.round(cents);
      gamakaValEl.textContent = rounded === 0 ? '0¢' : (rounded > 0 ? `+${rounded}¢` : `${rounded}¢`);
    }
    if (gamakaMeterBar) {
      const pct = Math.max(0, Math.min(100, ((cents + 80) / 160) * 100));
      gamakaMeterBar.style.width = `${pct}%`;
    }
  }

  function handleTrackingStatus(status) {
    if (cameraStatusEl) {
      cameraStatusEl.textContent = status.message;
      cameraStatusEl.className = `camera-status status-${status.status}`;
    }
  }

  // Render 7 Tone Hole Circles in HUD
  function renderHolesDiagram(holesArray) {
    if (!holesDiagramEl) return;
    holesDiagramEl.innerHTML = '';

    const labels = ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'R4'];

    holesArray.forEach((stateVal, idx) => {
      const circle = document.createElement('div');
      const isHalf = stateVal === 'half';
      const isClosed = stateVal === true;
      circle.className = `hole-pip ${isClosed ? 'closed' : (isHalf ? 'half' : 'open')}`;
      circle.title = `${labels[idx]}: ${isHalf ? 'Half-curled' : (isClosed ? 'Closed' : 'Open')}`;

      const text = document.createElement('span');
      text.textContent = labels[idx];
      circle.appendChild(text);

      holesDiagramEl.appendChild(circle);
    });
  }

  // =========================================================================
  // 🎶 CARNATIC 16 SWARASTHANAS & RAGA BUILDER ENGINE
  // =========================================================================
  const SWARA_FAMILIES = [
    { family: 'sa', label: 'Sa', swaras: ['sa'] },
    { family: 'ri', label: 'Ri', swaras: ['ri1', 'ri2', 'ri3'] },
    { family: 'ga', label: 'Ga', swaras: ['ga1', 'ga2', 'ga3'] },
    { family: 'ma', label: 'Ma', swaras: ['ma1', 'ma2'] },
    { family: 'pa', label: 'Pa', swaras: ['pa'] },
    { family: 'dha', label: 'Dha', swaras: ['dha1', 'dha2', 'dha3'] },
    { family: 'ni', label: 'Ni', swaras: ['ni1', 'ni2', 'ni3'] }
  ];

  const SHORT_SWARA_NAMES = {
    sa: 'Shadjam',
    ri1: 'Suddha',
    ri2: 'Chatusruti',
    ri3: 'Satsruti',
    ga1: 'Suddha',
    ga2: 'Sadharana',
    ga3: 'Antara',
    ma1: 'Suddha',
    ma2: 'Prati',
    pa: 'Panchamam',
    dha1: 'Suddha',
    dha2: 'Chatusruti',
    dha3: 'Satsruti',
    ni1: 'Suddha',
    ni2: 'Kaisiki',
    ni3: 'Kakali'
  };

  function renderSwarasthanaMatrix() {
    if (!swarasthanasMatrix) return;
    swarasthanasMatrix.innerHTML = '';

    SWARA_FAMILIES.forEach(grp => {
      const row = document.createElement('div');
      row.className = 'swara-matrix-row';

      const label = document.createElement('span');
      label.className = 'matrix-type-label';
      label.textContent = grp.label;
      row.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'matrix-cells-grid';

      grp.swaras.forEach(swId => {
        const sw = window.SwarasData.SWARA_BY_ID[swId];
        if (!sw) return;

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `swara-chip ${state.activeSwarasSet.has(swId) ? 'active' : ''}`;
        chip.dataset.id = swId;
        const shortName = SHORT_SWARA_NAMES[swId] || sw.name;
        chip.title = `${sw.name} (${sw.western} / +${sw.cents}¢)`;

        chip.innerHTML = `
          <span class="chip-short">${sw.short}</span>
          <span class="chip-name">${shortName}</span>
          <span class="chip-cents">+${sw.cents}¢</span>
        `;

        chip.addEventListener('click', (e) => {
          e.preventDefault();
          toggleSwaraChip(swId);
        });

        grid.appendChild(chip);
      });

      const emptyCount = 3 - grp.swaras.length;
      for (let k = 0; k < emptyCount; k++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'matrix-cell-empty';
        grid.appendChild(emptyCell);
      }

      row.appendChild(grid);
      swarasthanasMatrix.appendChild(row);
    });
  }

  function toggleSwaraChip(swId) {
    if (state.activeSwarasSet.has(swId)) {
      if (state.activeSwarasSet.size <= 2) return; // Keep scale playable (min 2 swaras)
      state.activeSwarasSet.delete(swId);
    } else {
      state.activeSwarasSet.add(swId);
    }

    const matchedPreset = findMatchingRagaPreset(state.activeSwarasSet);
    state.activeRagaKey = matchedPreset || 'custom';
    updateRagaUI();
  }

  function findMatchingRagaPreset(activeSet) {
    if (!window.SwarasData || !window.SwarasData.CARNATIC_RAGAS) return null;
    const ragas = window.SwarasData.CARNATIC_RAGAS;
    for (const [key, raga] of Object.entries(ragas)) {
      if (raga.swaras.length === activeSet.size && raga.swaras.every(s => activeSet.has(s))) {
        return key;
      }
    }
    return null;
  }

  function selectRagaPreset(key) {
    if (key === 'custom') {
      state.activeRagaKey = 'custom';
      updateRagaUI();
      return;
    }
    const raga = window.SwarasData.CARNATIC_RAGAS[key];
    if (raga) {
      state.activeRagaKey = key;
      state.activeSwarasSet = new Set(raga.swaras);
      updateRagaUI();
    }
  }

  function updateRagaUI() {
    if (ragaSelect) {
      ragaSelect.value = state.activeRagaKey;
    }

    const raga = window.SwarasData.CARNATIC_RAGAS[state.activeRagaKey];
    if (ragaNameBadge) {
      ragaNameBadge.textContent = raga ? raga.name : 'Custom Scale';
    }

    // Get active swara objects ordered by frequency ratio
    const activeSwaras = Array.from(state.activeSwarasSet)
      .map(id => window.SwarasData.SWARA_BY_ID[id])
      .filter(Boolean)
      .sort((a, b) => a.freqRatio - b.freqRatio);

    if (ragaNotesList) {
      ragaNotesList.textContent = activeSwaras.map(s => s.short).join(' · ');
    }

    // Update chip active classes in matrix
    if (swarasthanasMatrix) {
      const chips = swarasthanasMatrix.querySelectorAll('.swara-chip');
      chips.forEach(chip => {
        chip.classList.toggle('active', state.activeSwarasSet.has(chip.dataset.id));
      });
    }

    // Restrict Tracker and Audio engine strictly to active scale swaras
    const activeIdsArray = Array.from(state.activeSwarasSet);
    if (tracker && tracker.setAllowedSwaras) {
      tracker.setAllowedSwaras(activeIdsArray);
    }
    if (audio && audio.setAllowedSwaras) {
      audio.setAllowedSwaras(activeIdsArray);
    }

    // Dynamically update Swara Reference Cards
    renderSwaraCards(activeSwaras);

    // Update Practice Phrases for active Raga
    if (typeof renderRagaPhrases === 'function') {
      renderRagaPhrases();
    }
  }

  // Render Swaras Reference Cards for Active Raga
  function renderSwaraCards(activeSwaras) {
    swarasCardsContainer.innerHTML = '';

    const list = activeSwaras || Array.from(state.activeSwarasSet)
      .map(id => window.SwarasData.SWARA_BY_ID[id])
      .filter(Boolean)
      .sort((a, b) => a.freqRatio - b.freqRatio);

    list.forEach(sw => {
      const card = document.createElement('div');
      card.className = 'swara-card';
      card.dataset.id = sw.id;
      card.dataset.family = sw.family || sw.id;

      let pipsHtml = '';
      sw.pattern.forEach(p => {
        const isClosed = p === true;
        const isHalf = p === 'half';
        const cls = isClosed ? 'closed' : (isHalf ? 'half' : 'open');
        pipsHtml += `<span class="mini-pip ${cls}" title="${isHalf ? 'Half-curled' : (isClosed ? 'Closed' : 'Open')}"></span>`;
      });

      card.innerHTML = `
        <div class="swara-card-header">
          <span class="swara-symbol">${sw.short}</span>
          <div class="swara-titles">
            <h4>${sw.swara || sw.name}</h4>
            <span class="western-sub">${sw.western}4 (${sw.cents > 0 ? '+' + sw.cents : sw.cents}¢)</span>
          </div>
        </div>
        <div class="card-pips-row">${pipsHtml}</div>
        <div class="card-rule">${sw.ruleDescription}</div>
        <button class="card-play-btn">Play ${sw.short}</button>
      `;

      card.addEventListener('click', () => {
        audio.resume();
        state.currentSwara = sw;
        audio.setBreathPressure(0.85);
        audio.playSwara(sw);
        highlightActiveCard(sw.id);
        renderHolesDiagram(sw.pattern);
      });

      swarasCardsContainer.appendChild(card);
    });
  }

  function highlightActiveCard(swaraId) {
    const cards = swarasCardsContainer.querySelectorAll('.swara-card');
    cards.forEach(c => {
      const isMatch = swaraId && (
        c.dataset.id === swaraId || 
        c.dataset.family === swaraId || 
        (swaraId.startsWith(c.dataset.id) && c.dataset.id !== 'sa')
      );
      if (isMatch) c.classList.add('active');
      else c.classList.remove('active');
    });
  }

  // Vertical Octave Change (Up = Tara / +1, Center = Madhya / 0, Down = Mandra / -1)
  function handleOctaveChanged(octave, moveLine = false) {
    state.octave = octave;
    audio.setOctaveShift(octave);

    // Switch active line on tracker when requested
    if (moveLine && tracker) {
      tracker.selectOctave(octave);
    }

    // Update Octave display number in settings
    if (octaveDisplay) {
      octaveDisplay.textContent = octave > 0 ? `+${octave}` : octave;
    }

    // Update HUD zones on Camera overlay
    if (zoneMandra) zoneMandra.classList.toggle('active', octave === -1);
    if (zoneMadhya) zoneMadhya.classList.toggle('active', octave === 0);
    if (zoneTara) zoneTara.classList.toggle('active', octave === 1);

    // Update Flute Cursor position on vertical HUD bar
    if (flutePosCursor) {
      if (octave === 1) flutePosCursor.style.top = '18%';
      else if (octave === -1) flutePosCursor.style.top = '82%';
      else flutePosCursor.style.top = '50%';
    }

    // Update Side Panel Guide indicators
    if (legendMandra) legendMandra.classList.toggle('active', octave === -1);
    if (legendMadhya) legendMadhya.classList.toggle('active', octave === 0);
    if (legendTara) legendTara.classList.toggle('active', octave === 1);

    // Update Register button
    if (overblowToggleBtn) {
      if (octave === -1) {
        overblowToggleBtn.className = 'btn btn-overblow active';
        overblowToggleBtn.textContent = 'Mandra Sthayi (Deep Bass Flute)';
      } else if (octave === 1) {
        overblowToggleBtn.className = 'btn btn-overblow active';
        overblowToggleBtn.textContent = 'Tara Sthayi (High Octave Flute)';
      } else {
        overblowToggleBtn.className = 'btn btn-overblow';
        overblowToggleBtn.textContent = 'Madhya Sthayi (Normal Octave)';
      }
    }
  }

  // Update Flute Vertical Position Cursor on Camera HUD
  function handleFlutePosition(yPos) {
    const pct = Math.round(yPos * 100);
    if (fluteHeightVal) fluteHeightVal.textContent = `${pct}%`;
    if (fluteHeightSlider && document.activeElement !== fluteHeightSlider) {
      fluteHeightSlider.value = pct;
    }
  }

  // Handle Mouth Aperture updates from FaceMesh
  function handleMouthApertureChanged(data) {
    if (!data) return;
    if (mouthApertureFill) {
      // Direct finger-style score mapped 0% - 100%
      const score = data.score !== undefined ? data.score : data.ratio;
      const pct = Math.max(5, Math.min(100, score * 100));
      mouthApertureFill.style.height = `${pct}%`;
      if (data.octave === 1) {
        mouthApertureFill.style.background = '#fb923c';
      } else if (data.octave === -1) {
        mouthApertureFill.style.background = '#818cf8';
      } else {
        mouthApertureFill.style.background = '#94a3b8';
      }
    }
  }

  // Handle Blow Hole Alignment from FaceMesh
  let isLipsAligned = false;
  function handleEmbouchureChanged(data) {
    if (!data) return;
    isLipsAligned = Boolean(data.isAligned);
  }

  // Camera Buttons
  startCameraBtn.addEventListener('click', async () => {
    audio.resume();
    startCameraBtn.disabled = true;
    startCameraBtn.textContent = 'Starting AI Camera...';

    // Auto-start Tanpura drone by default when camera starts
    if (!audio.tanpuraActive) {
      audio.toggleTanpura(true);
      if (tanpuraToggleBtn) {
        tanpuraToggleBtn.classList.add('active');
        tanpuraToggleBtn.innerHTML = '🪕 Tanpura: Active';
      }
    }

    try {
      await tracker.init();
      state.isCameraRunning = true;
      startCameraBtn.style.display = "none";
      stopCameraBtn.style.display = "inline-flex";
      const cameraWelcomeOverlay = document.getElementById("cameraWelcomeOverlay");
      if (cameraWelcomeOverlay) cameraWelcomeOverlay.classList.add("hidden");
    } catch (err) {
      startCameraBtn.disabled = false;
      startCameraBtn.textContent = 'Start Camera Tracking';
      alert('Camera error: ' + (err.message || err));
    }
  });

  stopCameraBtn.addEventListener('click', () => {
    tracker.stop();
    state.isCameraRunning = false;
    audio.stopVoice();

    // User requirement: Pause button should pause the tanpura too
    if (audio.tanpuraActive) {
      audio.toggleTanpura(false);
      if (tanpuraToggleBtn) {
        tanpuraToggleBtn.classList.remove('active');
        tanpuraToggleBtn.innerHTML = '🪕 Tanpura Drone: Off';
      }
    }

    if (talaState && talaState.isPlaying) {
      stopTala();
    }

    stopCameraBtn.style.display = "none";
    startCameraBtn.style.display = "none";
    startCameraBtn.disabled = false;
    startCameraBtn.textContent = "Start Camera Tracking";
    const cameraWelcomeOverlay = document.getElementById("cameraWelcomeOverlay");
    if (cameraWelcomeOverlay) cameraWelcomeOverlay.classList.remove("hidden");
  });


  // Sensitivity Slider
  if (sensitivitySlider) {
    sensitivitySlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (sensitivityVal) sensitivityVal.textContent = val.toFixed(2);
      tracker.setCurlThreshold(val);
    });
  }

  // Flute Height Slider
  if (fluteHeightSlider) {
    fluteHeightSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (fluteHeightVal) fluteHeightVal.textContent = `${val}%`;
      tracker.setFluteY(val / 100);
    });
  }


  // Raga Selection
  if (ragaSelect) {
    ragaSelect.addEventListener('change', (e) => {
      selectRagaPreset(e.target.value);
    });
  }

  // Kattai Selection
  if (kattaiSelect) {
    kattaiSelect.addEventListener('change', (e) => {
      audio.setKattai(e.target.value);
      if (state.currentSwara) {
        audio.playSwara(state.currentSwara);
      }
    });
  }

  // Octave Shift Buttons
  if (octaveDownBtn) {
    octaveDownBtn.addEventListener('click', () => {
      if (audio.octaveShift > -1) {
        handleOctaveChanged(audio.octaveShift - 1, true);
      }
    });
  }

  if (octaveUpBtn) {
    octaveUpBtn.addEventListener('click', () => {
      if (audio.octaveShift < 1) {
        handleOctaveChanged(audio.octaveShift + 1, true);
      }
    });
  }

  // Sthayi Cycle Button: Mandra (-1) -> Madhya (0) -> Tara (1) -> Mandra (-1)
  if (overblowToggleBtn) {
    overblowToggleBtn.addEventListener('click', () => {
      let nextOctave = audio.octaveShift + 1;
      if (nextOctave > 1) nextOctave = -1;
      handleOctaveChanged(nextOctave, true);
    });
  }

  // Direct Click Listeners for Side Guide and HUD Zones
  if (legendMandra) legendMandra.addEventListener('click', () => handleOctaveChanged(-1, true));
  if (legendMadhya) legendMadhya.addEventListener('click', () => handleOctaveChanged(0, true));
  if (legendTara) legendTara.addEventListener('click', () => handleOctaveChanged(1, true));
  if (zoneMandra) zoneMandra.addEventListener('click', () => handleOctaveChanged(-1, true));
  if (zoneMadhya) zoneMadhya.addEventListener('click', () => handleOctaveChanged(0, true));
  if (zoneTara) zoneTara.addEventListener('click', () => handleOctaveChanged(1, true));

  // Master Volume
  if (masterVolumeSlider) {
    masterVolumeSlider.addEventListener('input', (e) => {
      if (audio.masterGain) {
        audio.masterGain.gain.setValueAtTime(parseFloat(e.target.value), audio.ctx.currentTime);
      }
    });
  }

  // ⚡ Electric vs. 🪈 Carnatic 2-Button Switch (Electric default)
  const modeElectricBtn = document.getElementById('modeElectricBtn');
  const modeCarnaticBtn = document.getElementById('modeCarnaticBtn');

  function setTimbreMode(isElectric) {
    audio.resume();
    state.isElectricMode = isElectric;
    audio.setElectricMode(isElectric);

    if (modeElectricBtn && modeCarnaticBtn) {
      if (isElectric) {
        modeElectricBtn.classList.add('active');
        modeElectricBtn.setAttribute('aria-pressed', 'true');
        modeCarnaticBtn.classList.remove('active');
        modeCarnaticBtn.setAttribute('aria-pressed', 'false');
      } else {
        modeCarnaticBtn.classList.add('active');
        modeCarnaticBtn.setAttribute('aria-pressed', 'true');
        modeElectricBtn.classList.remove('active');
        modeElectricBtn.setAttribute('aria-pressed', 'false');
      }
    }
    if (timbreModeBadge) {
      timbreModeBadge.classList.toggle('electric-active', isElectric);
      timbreModeBadge.textContent = isElectric ? '⚡ Electric Flute' : 'Acoustic Engine';
    }
  }

  function toggleElectricMode() {
    setTimbreMode(!state.isElectricMode);
  }

  if (modeElectricBtn) {
    modeElectricBtn.addEventListener('click', () => setTimbreMode(true));
  }
  if (modeCarnaticBtn) {
    modeCarnaticBtn.addEventListener('click', () => setTimbreMode(false));
  }
  if (timbreModeBadge) {
    timbreModeBadge.addEventListener('click', () => toggleElectricMode());
  }

  // Set default Electric mode UI state
  setTimbreMode(true);

  // Tanpura Drone Toggle
  tanpuraToggleBtn.addEventListener('click', () => {
    audio.resume();
    const willBeActive = !audio.tanpuraActive;
    audio.toggleTanpura(willBeActive);
    if (willBeActive) {
      tanpuraToggleBtn.classList.add('active');
      tanpuraToggleBtn.innerHTML = '🪕 Tanpura: Active';
    } else {
      tanpuraToggleBtn.classList.remove('active');
      tanpuraToggleBtn.innerHTML = '🪕 Tanpura Drone: Off';
    }
  });

  tanpuraVolumeSlider.addEventListener('input', (e) => {
    audio.setTanpuraVolume(parseFloat(e.target.value));
  });


  const recordModeSelect = document.getElementById('recordModeSelect');

  const updateRecordBtnLabel = () => {
    if (videoRecorder && videoRecorder.isRecording) return;
    const mode = recordModeSelect ? recordModeSelect.value : 'camera';
    const label = (mode === 'camera') ? '📹 Record Video' : '🖥️ Record Screen';
    recordBtn.innerHTML = `<span class="rec-dot"></span> <span class="btn-text">${label}</span>`;
  };

  if (recordModeSelect) {
    recordModeSelect.addEventListener('change', updateRecordBtnLabel);
  }

  // 4. Initialize Video & Performance Recorder (Camera Viewport & Whole Screen Modes)
  const videoRecorder = new window.FluteVideoRecorder({
    videoElement: videoEl,
    canvasElement: canvasEl,
    audioEngine: audio,
    getCurrentSwara: () => state.currentSwara,
    getOctave: () => state.octave,
    onStateChange: ({ status, downloadReady, error }) => {
      if (status === 'stopped' || status === 'cancelled' || status === 'error') {
        recordBtn.classList.remove('recording');
        updateRecordBtnLabel();
        if (recordModeSelect) recordModeSelect.disabled = false;
        if (state.recordTimerInterval) {
          clearInterval(state.recordTimerInterval);
          state.recordTimerInterval = null;
        }
        recTimerEl.style.display = 'none';
      }

      if (status === 'cancelled' && cameraStatusEl) {
        cameraStatusEl.textContent = 'Recording cancelled.';
        setTimeout(() => {
          if (state.isCameraRunning) {
            cameraStatusEl.textContent = 'Tracking active! Place hands on the silver dots.';
          }
        }, 2500);
      }

      if (status === 'error' && cameraStatusEl) {
        cameraStatusEl.textContent = `⚠️ Recording note: ${error || 'Device unavailable'}`;
      }

      if (downloadReady && cameraStatusEl) {
        const modeDesc = (videoRecorder.mode === 'camera') ? 'Flute performance video' : 'Screen performance video';
        cameraStatusEl.textContent = `📹 ${modeDesc} saved! Download started.`;
        setTimeout(() => {
          if (state.isCameraRunning) {
            cameraStatusEl.textContent = 'Tracking active! Place hands on the silver dots.';
          }
        }, 3500);
      }
    }
  });

  // Performance Recording (Flute Camera Viewport or Whole Screen)
  recordBtn.addEventListener('click', async () => {
    if (audio && typeof audio.resume === 'function') {
      try {
        await audio.resume();
      } catch (e) {}
    }

    const mode = recordModeSelect ? recordModeSelect.value : 'camera';

    // Auto-start camera if in camera mode and not yet running
    if (mode === 'camera' && !state.isCameraRunning && !videoRecorder.isRecording) {
      try {
        if (cameraStatusEl) cameraStatusEl.textContent = 'Starting camera for performance recording...';
        startCameraBtn.click();
      } catch (e) {}
    }

    if (!videoRecorder.isRecording) {
      if (recordModeSelect) recordModeSelect.disabled = true;
      const ok = await videoRecorder.start(mode);
      if (ok) {
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '<span class="rec-dot"></span> <span class="btn-text">⏹ Stop & Save</span>';
        state.recSeconds = 0;
        recTimerEl.textContent = '00:00';
        recTimerEl.style.display = 'inline-block';
        if (cameraStatusEl) {
          const desc = (mode === 'camera') ? 'flute performance video' : 'screen performance';
          cameraStatusEl.textContent = `📹 Recording ${desc}... Click "Stop & Save" when done.`;
        }
        state.recordTimerInterval = setInterval(() => {
          state.recSeconds++;
          const mins = String(Math.floor(state.recSeconds / 60)).padStart(2, '0');
          const secs = String(state.recSeconds % 60).padStart(2, '0');
          recTimerEl.textContent = `${mins}:${secs}`;
        }, 1000);
      } else {
        if (recordModeSelect) recordModeSelect.disabled = false;
        updateRecordBtnLabel();
      }
    } else {
      videoRecorder.stop();
      recordBtn.classList.remove('recording');
      updateRecordBtnLabel();
      if (recordModeSelect) recordModeSelect.disabled = false;
      if (state.recordTimerInterval) {
        clearInterval(state.recordTimerInterval);
        state.recordTimerInterval = null;
      }
      recTimerEl.style.display = 'none';
    }
  });

  // Studio Controls Dock Toggle (Unobtrusive Spatial AR Mode)
  const dockToggleBtn = document.getElementById('dockToggleBtn');
  const controlsPanelEl = document.querySelector('.controls-panel');
  const mainContentEl = document.querySelector('.main-content');

  function toggleControlsDock() {
    if (!controlsPanelEl) return;
    const isCollapsed = controlsPanelEl.classList.toggle('dock-collapsed');
    if (tracker) {
      tracker.isPanelCollapsed = isCollapsed;
    }
    if (mainContentEl) {
      mainContentEl.classList.toggle('dock-collapsed', isCollapsed);
    }
    if (dockToggleBtn) {
      dockToggleBtn.classList.toggle('active', isCollapsed);
      dockToggleBtn.setAttribute('aria-expanded', !isCollapsed);
      dockToggleBtn.innerHTML = isCollapsed ? '◫ Expand' : '◫ Collapse';
    }
  }

  if (dockToggleBtn) {
    dockToggleBtn.addEventListener("click", toggleControlsDock);
  }

  // Hero Start Camera button
  const heroStartCameraBtn = document.getElementById("heroStartCameraBtn");
  if (heroStartCameraBtn) {
    heroStartCameraBtn.addEventListener("click", () => {
      startCameraBtn.click();
    });
  }

  // Learn to Play Modal & Visual Animated Scale Walkthrough Handlers
  const learnToPlayModal = document.getElementById("learnToPlayModal");
  const learnToPlayBtn = document.getElementById("learnToPlayBtn");
  const headerLearnBtn = document.getElementById("headerLearnBtn");
  const closeLearnModalBtn = document.getElementById("closeLearnModalBtn");
  const learnModalStartBtn = document.getElementById("learnModalStartBtn");

  const scaleSwaraTabsContainer = document.getElementById("scaleSwaraTabs");
  const scaleAnimAutoBtn = document.getElementById("scaleAnimAutoBtn");
  const scaleSwaraPill = document.getElementById("scaleSwaraPill");
  const scaleSwaraDesc = document.getElementById("scaleSwaraDesc");

  const SCALE_NOTES_DATA = [
    {
      swaraKey: "sa",
      swaraId: "sa",
      title: "SA (C4)",
      note: "C4",
      holes: [true, true, false, false, false, false, false],
      color: "#38bdf8",
      desc: "Cover first 2 holes with Left Index & Middle finger. Foundation note of Indian music!"
    },
    {
      swaraKey: "ri",
      swaraId: "ri2",
      title: "RI (D4)",
      note: "D4",
      holes: [true, false, false, false, false, false, false],
      color: "#2dd4bf",
      desc: "Lift Left Middle finger; keep only Hole 1 closed with Left Index finger."
    },
    {
      swaraKey: "ga",
      swaraId: "ga3",
      title: "GA (E4)",
      note: "E4",
      holes: [false, false, false, false, false, false, false],
      color: "#4ade80",
      desc: "Lift all fingers! All 7 holes open for a light, breezy Gandharam resonance."
    },
    {
      swaraKey: "ma",
      swaraId: "ma1",
      title: "MA (F4)",
      note: "F4",
      holes: [false, true, true, true, true, true, true],
      color: "#facc15",
      desc: "Close Holes 2 to 7 (Left Hand Middle & Ring + Right Hand all 4 fingers closed)."
    },
    {
      swaraKey: "pa",
      swaraId: "pa",
      title: "PA (G4)",
      note: "G4",
      holes: [true, true, true, true, true, false, false],
      color: "#fb923c",
      desc: "Close Holes 1 to 5 (Left Hand all 3 closed + Right Hand Index & Middle closed)."
    },
    {
      swaraKey: "dha",
      swaraId: "dha2",
      title: "DHA (A4)",
      note: "A4",
      holes: [true, true, true, true, false, false, false],
      color: "#f43f5e",
      desc: "Close Holes 1 to 4 (Left Hand all 3 closed + Right Hand Index closed)."
    },
    {
      swaraKey: "ni",
      swaraId: "ni3",
      title: "NI (B4)",
      note: "B4",
      holes: [true, true, true, false, false, false, false],
      color: "#c084fc",
      desc: "Close Holes 1 to 3 (Left Hand all 3 closed; all Right Hand fingers lifted)."
    }
  ];

  let currentScaleIndex = 0;
  let scaleAnimationTimer = null;
  let isScaleAutoPlaying = true;
  let previewStopTimer = null;

  function renderScaleNote(index, playSound = false) {
    if (index < 0 || index >= SCALE_NOTES_DATA.length) return;
    currentScaleIndex = index;
    const noteData = SCALE_NOTES_DATA[index];

    // 1. Update Tabs
    if (scaleSwaraTabsContainer) {
      const tabs = scaleSwaraTabsContainer.querySelectorAll('.swara-tab');
      tabs.forEach((tab, idx) => {
        if (idx === index) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
    }

    // 2. Update Description Banner
    if (scaleSwaraPill) {
      scaleSwaraPill.textContent = noteData.title;
      scaleSwaraPill.style.background = noteData.color;
      scaleSwaraPill.style.color = '#020617';
      scaleSwaraPill.style.boxShadow = `0 0 16px ${noteData.color}66`;
    }
    if (scaleSwaraDesc) {
      scaleSwaraDesc.textContent = noteData.desc;
    }

    // 3. Update Holes & Pressing Fingers
    noteData.holes.forEach((isClosed, hIdx) => {
      const holeNum = hIdx + 1;
      const holeEl = document.getElementById(`holeNode${holeNum}`);
      const fingerEl = document.getElementById(`finger${holeNum}`);
      if (holeEl) {
        if (isClosed) {
          holeEl.classList.add('active-closed');
          const fill = holeEl.querySelector('.hole-disc-fill');
          if (fill) {
            fill.setAttribute('opacity', '1');
            fill.setAttribute('fill', noteData.color);
          }
        } else {
          holeEl.classList.remove('active-closed');
          const fill = holeEl.querySelector('.hole-disc-fill');
          if (fill) fill.setAttribute('opacity', '0');
        }
      }
      if (fingerEl) {
        if (isClosed) {
          fingerEl.classList.add('finger-down');
        } else {
          fingerEl.classList.remove('finger-down');
        }
      }
    });

    // 4. Play Preview Sound (if requested and audio engine ready)
    if (playSound && audio) {
      try {
        const swaraObj = window.SwarasData && window.SwarasData.SWARA_BY_ID
          ? (window.SwarasData.SWARA_BY_ID[noteData.swaraId] || window.SwarasData.SWARA_BY_ID[noteData.swaraKey])
          : null;
        if (swaraObj) {
          if (previewStopTimer) {
            clearTimeout(previewStopTimer);
            previewStopTimer = null;
          }
          audio.playSwara(swaraObj);
          previewStopTimer = setTimeout(() => {
            if (!state.isCameraRunning) {
              audio.stopVoice();
            }
          }, 1100);
        }
      } catch (err) {
        // Silently catch unresumed audio context
      }
    }
  }

  function startScaleAnimation() {
    stopScaleAnimation();
    isScaleAutoPlaying = true;
    updateScaleAutoBtnUI();
    scaleAnimationTimer = setInterval(() => {
      const nextIdx = (currentScaleIndex + 1) % SCALE_NOTES_DATA.length;
      renderScaleNote(nextIdx, true);
    }, 1800);
  }

  function stopScaleAnimation() {
    if (scaleAnimationTimer) {
      clearInterval(scaleAnimationTimer);
      scaleAnimationTimer = null;
    }
    isScaleAutoPlaying = false;
    updateScaleAutoBtnUI();
  }

  function updateScaleAutoBtnUI() {
    if (!scaleAnimAutoBtn) return;
    if (isScaleAutoPlaying) {
      scaleAnimAutoBtn.classList.add('active');
      scaleAnimAutoBtn.innerHTML = '<span class="anim-play-icon">⏸</span> <span class="anim-toggle-text">Pause Animation</span>';
    } else {
      scaleAnimAutoBtn.classList.remove('active');
      scaleAnimAutoBtn.innerHTML = '<span class="anim-play-icon">▶</span> <span class="anim-toggle-text">Auto Play Scale</span>';
    }
  }

  if (scaleAnimAutoBtn) {
    scaleAnimAutoBtn.addEventListener('click', () => {
      audio.resume();
      if (isScaleAutoPlaying) {
        stopScaleAnimation();
      } else {
        startScaleAnimation();
      }
    });
  }

  if (scaleSwaraTabsContainer) {
    const tabs = scaleSwaraTabsContainer.querySelectorAll('.swara-tab');
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        audio.resume();
        stopScaleAnimation(); // pause so user can inspect this specific note
        renderScaleNote(idx, true);
      });
    });
  }

  const openLearnModal = () => {
    if (learnToPlayModal) {
      learnToPlayModal.classList.remove("hidden");
      renderScaleNote(currentScaleIndex, false);
      startScaleAnimation();
    }
  };

  const closeLearnModal = () => {
    if (learnToPlayModal) {
      learnToPlayModal.classList.add("hidden");
      stopScaleAnimation();
      if (!state.isCameraRunning) {
        audio.stopVoice();
      }
    }
  };

  if (learnToPlayBtn) learnToPlayBtn.addEventListener("click", openLearnModal);
  if (headerLearnBtn) headerLearnBtn.addEventListener("click", openLearnModal);
  if (closeLearnModalBtn) closeLearnModalBtn.addEventListener("click", closeLearnModal);

  if (learnModalStartBtn) {
    learnModalStartBtn.addEventListener("click", () => {
      closeLearnModal();
      if (!state.isCameraRunning) {
        startCameraBtn.click();
      }
    });
  }

  if (learnToPlayModal) {
    learnToPlayModal.addEventListener("click", (e) => {
      if (e.target === learnToPlayModal) closeLearnModal();
    });
  }

  // Initialize first note visual state
  renderScaleNote(0, false);

  // Initialize instant canvas guide on load
  if (tracker && typeof tracker.initCanvasPreview === "function") {
    tracker.initCanvasPreview();
  }
  window.addEventListener("resize", () => {
    if (!state.isCameraRunning && tracker && typeof tracker.initCanvasPreview === "function") {
      tracker.initCanvasPreview();
    }
  });
  const floatingDockOpenBtn = document.getElementById('floatingDockOpenBtn');
  if (floatingDockOpenBtn) {
    floatingDockOpenBtn.addEventListener('click', toggleControlsDock);
  }

  // Keyboard Shortcuts (S, R, G, M, P, D, N, Space for octave shift, J for Janti, V for Video Rec, H/D for Dock)
  let lastKeyTime = 0;
  let lastPressedKey = '';

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const targetTag = (e.target && e.target.tagName) ? e.target.tagName : '';
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(targetTag)) return;

    const key = e.key.toUpperCase();

    // Toggle studio controls dock via 'H' or 'D'
    if (key === 'H' || key === 'D') {
      e.preventDefault();
      toggleControlsDock();
      return;
    }

    // Toggle video recording via 'V' key
    if (key === 'V') {
      e.preventDefault();
      recordBtn.click();
      return;
    }

    // Direct Electric Flute toggle via 'E' key
    if (key === 'E') {
      e.preventDefault();
      toggleElectricMode();
      return;
    }

    // Direct Janti trigger via 'J' key
    if (key === 'J') {
      e.preventDefault();
      if (state.currentSwara) {
        handleJantiDetected({ swara: state.currentSwara, octave: state.octave });
      }
      return;
    }

    const swaraMap = {
      'S': 'sa', '1': 'sa',
      'R': 'ri', '2': 'ri',
      'G': 'ga', '3': 'ga',
      'M': 'ma', '4': 'ma',
      'P': 'pa', '5': 'pa',
      'D': 'dha', '6': 'dha',
      'N': 'ni', '7': 'ni'
    };

    if (swaraMap[key]) {
      audio.resume();
      const targetFamily = swaraMap[key];
      // Select the specific variety active in the current raga scale
      const activeSwaraId = Array.from(state.activeSwarasSet).find(id => {
        const item = window.SwarasData.SWARA_BY_ID[id];
        return item && (item.family === targetFamily || item.id === targetFamily);
      }) || targetFamily;

      const sw = window.SwarasData.SWARA_BY_ID[activeSwaraId] ||
                 window.SwarasData.SWARA_BY_ID[targetFamily] ||
                 window.SwarasData.CARNATIC_SWARAS.find(s => s.id === targetFamily);

      if (sw) {
        const now = performance.now();
        const isDoubleTap = (key === lastPressedKey) && (now - lastKeyTime < 420);
        lastKeyTime = now;
        lastPressedKey = key;

        state.currentSwara = sw;
        audio.setBreathPressure(0.85);

        if (isDoubleTap) {
          handleJantiDetected({ swara: sw, octave: state.octave });
        } else {
          audio.playSwara(sw);
        }

        highlightActiveCard(sw.id);
        renderHolesDiagram(sw.pattern);
      }
    } else if (e.code === 'Space') {
      e.preventDefault();
      let nextOctave = audio.octaveShift + 1;
      if (nextOctave > 1) nextOctave = -1;
      handleOctaveChanged(nextOctave);
    } else if (key === 'T') {
      tanpuraToggleBtn.click();
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toUpperCase();
    if (['S', 'R', 'G', 'M', 'P', 'D', 'N', '1', '2', '3', '4', '5', '6', '7'].includes(key)) {
      if (!state.isCameraRunning) {
        audio.stopVoice();
        highlightActiveCard(null);
      }
    }
  });

  // =========================================================================
  // 🥁 Carnatic Tala & Metronome Laya Engine (Fills Right Bottom Real Estate)
  // =========================================================================
  const TALA_DEFINITIONS = {
    adi: {
      name: 'Adi Tala',
      beats: 8,
      angas: '1 Laghu (4) + 2 Dhrutams (2+2)',
      kriyas: [
        { beat: 1, name: 'Samam (Clap)', isSamam: true },
        { beat: 2, name: 'Count (Little)' },
        { beat: 3, name: 'Count (Ring)' },
        { beat: 4, name: 'Count (Middle)' },
        { beat: 5, name: 'Clap (Dhrutam 1)' },
        { beat: 6, name: 'Wave' },
        { beat: 7, name: 'Clap (Dhrutam 2)' },
        { beat: 8, name: 'Wave' }
      ]
    },
    rupaka: {
      name: 'Rupaka Tala',
      beats: 3,
      angas: '1 Dhrutam (1) + 1 Laghu (2)',
      kriyas: [
        { beat: 1, name: 'Clap (Samam)', isSamam: true },
        { beat: 2, name: 'Clap (Laghu 1)' },
        { beat: 3, name: 'Wave (Laghu 2)' }
      ]
    },
    misra_chapu: {
      name: 'Misra Chapu',
      beats: 7,
      angas: '3 + 2 + 2',
      kriyas: [
        { beat: 1, name: 'Clap (Samam)', isSamam: true },
        { beat: 2, name: 'Wave' },
        { beat: 3, name: 'Wave' },
        { beat: 4, name: 'Clap' },
        { beat: 5, name: 'Wave' },
        { beat: 6, name: 'Clap' },
        { beat: 7, name: 'Wave' }
      ]
    },
    khanda_chapu: {
      name: 'Khanda Chapu',
      beats: 5,
      angas: '2 + 1 + 2',
      kriyas: [
        { beat: 1, name: 'Clap (Samam)', isSamam: true },
        { beat: 2, name: 'Wave' },
        { beat: 3, name: 'Clap' },
        { beat: 4, name: 'Clap' },
        { beat: 5, name: 'Wave' }
      ]
    },
    tisra_eka: {
      name: 'Tisra Eka',
      beats: 3,
      angas: '1 Laghu (3)',
      kriyas: [
        { beat: 1, name: 'Clap (Samam)', isSamam: true },
        { beat: 2, name: 'Count (Little)' },
        { beat: 3, name: 'Count (Ring)' }
      ]
    }
  };

  const RAGA_PRACTICE_PHRASES = {
    mayamalavagowla: [
      { name: 'Sarali 1', phrase: ['sa', 'ri1', 'ga3', 'ma1', 'pa', 'dha1', 'ni3', 'sa'], label: 'S R₁ G₃ M₁ · P D₁ N₃ Ṡ' },
      { name: 'Janta 1', phrase: ['sa', 'sa', 'ri1', 'ri1', 'ga3', 'ga3', 'ma1', 'ma1'], label: 'SS R₁R₁ G₃G₃ M₁M₁' },
      { name: 'Mandra', phrase: ['sa', 'ni3', 'dha1', 'pa', 'dha1', 'ni3', 'sa'], label: 'S N₃ D₁ P · D₁ N₃ S' }
    ],
    shankarabharanam: [
      { name: 'Sarali 1', phrase: ['sa', 'ri2', 'ga3', 'ma1', 'pa', 'dha2', 'ni3', 'sa'], label: 'S R₂ G₃ M₁ · P D₂ N₃ Ṡ' },
      { name: 'Tara Sanchara', phrase: ['ma1', 'pa', 'dha2', 'ni3', 'sa', 'ri2', 'ga3'], label: 'M₁ P D₂ N₃ · Ṡ Ṙ₂ Ġ₃' }
    ],
    kalyani: [
      { name: 'Sarali 1', phrase: ['sa', 'ri2', 'ga3', 'ma2', 'pa', 'dha2', 'ni3', 'sa'], label: 'S R₂ G₃ M₂ · P D₂ N₃ Ṡ' },
      { name: 'Prati Ma', phrase: ['ga3', 'ma2', 'pa', 'dha2', 'ni3', 'sa'], label: 'G₃ M₂ P D₂ · N₃ Ṡ' }
    ],
    kharaharapriya: [
      { name: 'Sarali 1', phrase: ['sa', 'ri2', 'ga2', 'ma1', 'pa', 'dha2', 'ni2', 'sa'], label: 'S R₂ G₂ M₁ · P D₂ N₂ Ṡ' },
      { name: 'Catch Phrase', phrase: ['ri2', 'ga2', 'ma1', 'pa', 'dha2', 'ni2', 'dha2', 'pa'], label: 'R₂ G₂ M₁ P · D₂ N₂ D₂ P' }
    ],
    mohanam: [
      { name: 'Arohana', phrase: ['sa', 'ri2', 'ga3', 'pa', 'dha2', 'sa'], label: 'S R₂ G₃ P · D₂ Ṡ' },
      { name: 'Avarohana', phrase: ['sa', 'dha2', 'pa', 'ga3', 'ri2', 'sa'], label: 'Ṡ D₂ P G₃ · R₂ S' }
    ],
    hamsadhwani: [
      { name: 'Catch Phrase', phrase: ['sa', 'ri2', 'ga3', 'pa', 'ni3', 'sa'], label: 'S R₂ G₃ P · N₃ Ṡ' },
      { name: 'Vatapi', phrase: ['ga3', 'ri2', 'sa', 'ni3', 'pa', 'sa'], label: 'G₃ R₂ S Ṇ₃ · P S' }
    ],
    hindolam: [
      { name: 'Arohana', phrase: ['sa', 'ga2', 'ma1', 'dha1', 'ni2', 'sa'], label: 'S G₂ M₁ D₁ · N₂ Ṡ' },
      { name: 'Samaja', phrase: ['ma1', 'dha1', 'ni2', 'dha1', 'ma1', 'ga2', 'sa'], label: 'M₁ D₁ N₂ D₁ · M₁ G₂ S' }
    ],
    custom: [
      { name: 'Scale Run', phrase: ['sa', 'ri1', 'ga3', 'ma1', 'pa', 'dha1', 'ni3'], label: 'Active Scale Run' }
    ]
  };

  const talaState = {
    isPlaying: false,
    currentTalaKey: 'adi',
    bpm: 75,
    speedMultiplier: 1,
    currentBeatIndex: 0,
    intervalId: null
  };

  const talaPlayBtn = document.getElementById('talaPlayBtn');
  const talaPlayIcon = document.getElementById('talaPlayIcon');
  const talaPlayText = document.getElementById('talaPlayText');
  const talaSelect = document.getElementById('talaSelect');
  const talaAngasDisplay = document.getElementById('talaAngasDisplay');
  const talaBpmDisplay = document.getElementById('talaBpmDisplay');
  const talaBpmDown = document.getElementById('talaBpmDown');
  const talaBpmUp = document.getElementById('talaBpmUp');
  const talaCurrentKriya = document.getElementById('talaCurrentKriya');
  const talaAksharaCounter = document.getElementById('talaAksharaCounter');
  const talaPipsRow = document.getElementById('talaPipsRow');
  const talaPhrasesChips = document.getElementById('talaPhrasesChips');
  const talaSpeedBtns = document.querySelectorAll('.tala-speed-btn');

  function initTalaPips() {
    if (!talaPipsRow) return;
    talaPipsRow.innerHTML = '';
    const tala = TALA_DEFINITIONS[talaState.currentTalaKey] || TALA_DEFINITIONS.adi;
    if (talaAngasDisplay) talaAngasDisplay.textContent = tala.angas;

    for (let i = 0; i < tala.beats; i++) {
      const pip = document.createElement('div');
      pip.className = `tala-pip ${i === 0 ? 'samam-marker' : ''}`;
      pip.textContent = (i + 1);
      pip.dataset.beat = i;
      talaPipsRow.appendChild(pip);
    }
    updateTalaDisplay(0);
  }

  function updateTalaDisplay(beatIdx) {
    const tala = TALA_DEFINITIONS[talaState.currentTalaKey] || TALA_DEFINITIONS.adi;
    const kriya = tala.kriyas[beatIdx] || { name: `Beat ${beatIdx + 1}` };

    if (talaCurrentKriya) talaCurrentKriya.textContent = kriya.name;
    if (talaAksharaCounter) talaAksharaCounter.textContent = `Beat ${beatIdx + 1} of ${tala.beats}`;

    if (talaPipsRow) {
      const pips = talaPipsRow.querySelectorAll('.tala-pip');
      pips.forEach((pip, idx) => {
        pip.classList.toggle('active', idx === beatIdx);
      });
    }
  }

  function stepTala() {
    const tala = TALA_DEFINITIONS[talaState.currentTalaKey] || TALA_DEFINITIONS.adi;
    const isSamam = talaState.currentBeatIndex === 0;

    if (audio && audio.playTalaClick) {
      audio.playTalaClick(isSamam);
    }

    updateTalaDisplay(talaState.currentBeatIndex);
    talaState.currentBeatIndex = (talaState.currentBeatIndex + 1) % tala.beats;
  }

  function startTala() {
    audio.resume();
    talaState.isPlaying = true;
    if (talaPlayBtn) talaPlayBtn.classList.add('active');
    if (talaPlayIcon) talaPlayIcon.textContent = '⏹';
    if (talaPlayText) talaPlayText.textContent = 'Stop Tala';

    talaState.currentBeatIndex = 0;
    stepTala();

    const intervalMs = (60000 / (talaState.bpm * talaState.speedMultiplier));
    if (talaState.intervalId) clearInterval(talaState.intervalId);
    talaState.intervalId = setInterval(stepTala, intervalMs);
  }

  function stopTala() {
    talaState.isPlaying = false;
    if (talaPlayBtn) talaPlayBtn.classList.remove('active');
    if (talaPlayIcon) talaPlayIcon.textContent = '▶';
    if (talaPlayText) talaPlayText.textContent = 'Start Tala';

    if (talaState.intervalId) {
      clearInterval(talaState.intervalId);
      talaState.intervalId = null;
    }
    updateTalaDisplay(0);
  }

  if (talaPlayBtn) {
    talaPlayBtn.addEventListener('click', () => {
      if (talaState.isPlaying) stopTala();
      else startTala();
    });
  }

  if (talaSelect) {
    talaSelect.addEventListener('change', (e) => {
      talaState.currentTalaKey = e.target.value;
      initTalaPips();
      if (talaState.isPlaying) {
        stopTala();
        startTala();
      }
    });
  }

  talaSpeedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      talaSpeedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      talaState.speedMultiplier = parseFloat(btn.dataset.speed) || 1;
      if (talaState.isPlaying) {
        stopTala();
        startTala();
      }
    });
  });

  function adjustTalaBpm(delta) {
    talaState.bpm = Math.max(40, Math.min(220, talaState.bpm + delta));
    if (talaBpmDisplay) talaBpmDisplay.textContent = `${talaState.bpm} BPM`;
    if (talaState.isPlaying) {
      stopTala();
      startTala();
    }
  }

  if (talaBpmDown) talaBpmDown.addEventListener('click', () => adjustTalaBpm(-4));
  if (talaBpmUp) talaBpmUp.addEventListener('click', () => adjustTalaBpm(+4));

  function renderRagaPhrases() {
    if (!talaPhrasesChips) return;
    talaPhrasesChips.innerHTML = '';
    const phrases = RAGA_PRACTICE_PHRASES[state.activeRagaKey] || RAGA_PRACTICE_PHRASES.mayamalavagowla;

    phrases.forEach(item => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'phrase-chip';
      chip.title = `Practice ${item.name}: ${item.label}`;
      chip.textContent = `${item.name}`;

      chip.addEventListener('click', () => {
        playPracticePhrase(item.phrase);
      });

      talaPhrasesChips.appendChild(chip);
    });
  }

  let phrasePlaybackTimer = null;
  function playPracticePhrase(phraseIds) {
    if (phrasePlaybackTimer) clearInterval(phrasePlaybackTimer);
    audio.resume();
    let idx = 0;

    phrasePlaybackTimer = setInterval(() => {
      if (idx >= phraseIds.length) {
        clearInterval(phrasePlaybackTimer);
        phrasePlaybackTimer = null;
        if (!state.isCameraRunning) {
          audio.stopVoice();
          highlightActiveCard(null);
        }
        return;
      }

      const swId = phraseIds[idx];
      const sw = window.SwarasData.SWARA_BY_ID[swId];
      if (sw) {
        state.currentSwara = sw;
        audio.setBreathPressure(0.85);
        audio.playSwara(sw);
        highlightActiveCard(sw.id);
        renderHolesDiagram(sw.pattern);
      }
      idx++;
    }, 360);
  }

  // Initial render: Build 16 Swarasthanas Matrix, active Raga, Tala, and tone holes
  renderSwarasthanaMatrix();
  updateRagaUI();
  initTalaPips();
  renderRagaPhrases();
  renderHolesDiagram([false, false, false, false, false, false, false]);
});
