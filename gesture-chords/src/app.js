// Main Application Controller for GestureChords

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const videoEl = document.getElementById('webcamVideo');
  const canvasEl = document.getElementById('trackingCanvas');
  const visualizerCanvas = document.getElementById('visualizerCanvas');
  const pianoContainer = document.getElementById('pianoContainer');

  const startCameraBtn = document.getElementById('startCameraBtn');
  const stopCameraBtn = document.getElementById('stopCameraBtn');
  const cameraStatusEl = document.getElementById('cameraStatus');
  const trackingBadgeEl = document.getElementById('trackingBadge');

  // Chord & HUD Elements
  const gestureIconEl = document.getElementById('gestureIcon');
  const gestureNameEl = document.getElementById('gestureName');
  const chordNameEl = document.getElementById('chordName');
  const chordNotesListEl = document.getElementById('chordNotesList');
  const chordsCardsContainer = document.getElementById('chordsCardsContainer');

  // Controls Elements
  const presetSelect = document.getElementById('presetSelect');
  const keySelect = document.getElementById('keySelect');
  const instrumentBtns = document.querySelectorAll('[data-instrument]');
  const playModeBtns = document.querySelectorAll('[data-mode]');
  const volumeSlider = document.getElementById('volumeSlider');
  const octaveDownBtn = document.getElementById('octaveDownBtn');
  const octaveUpBtn = document.getElementById('octaveUpBtn');
  const octaveDisplay = document.getElementById('octaveDisplay');

  // Expression Indicators
  const filterValEl = document.getElementById('filterVal');
  const filterMeterBar = document.getElementById('filterMeterBar');
  const panValEl = document.getElementById('panVal');

  // Recording Elements
  const recordBtn = document.getElementById('recordBtn');
  const recTimerEl = document.getElementById('recTimer');

  // Application State
  const state = {
    currentPreset: 'pop',
    keyRoot: 'C',
    keyOffsetSemitones: 0,
    octaveShift: 0,
    currentFingers: -1,
    isCameraRunning: false,
    recordTimerInterval: null,
    recSeconds: 0
  };

  // 1. Initialize Audio Engine
  const audio = new window.AudioEngine();

  // 2. Initialize Visualizer
  const visualizer = new window.AudioVisualizer(visualizerCanvas, audio);
  visualizer.start();

  // 3. Initialize Piano Display
  const piano = new window.PianoDisplay(pianoContainer, (clickedNote) => {
    audio.resume();
    audio.triggerSingleNote(clickedNote, 0, 1.0);
  });

  // 4. Initialize Gesture Tracker
  const tracker = new window.GestureTracker({
    videoElement: videoEl,
    canvasElement: canvasEl,
    onGestureChange: (gesture) => handleGestureDetected(gesture),
    onContinuousControl: (expression) => handleContinuousExpression(expression),
    onTrackingStatus: (status) => handleTrackingStatus(status)
  });

  // Handle detected finger count change
  function handleGestureDetected(gesture) {
    state.currentFingers = gesture.fingerCount;

    if (gesture.fingerCount === -1) {
      // No hand in view
      updateHudRest('No Hand Detected', 'Point hand at camera');
      piano.clearAll();
      chordsCardsContainer.querySelectorAll('.chord-card').forEach(c => c.classList.remove('active'));
      return;
    }

    const currentProgression = window.ChordsData.CHORD_PRESETS[state.currentPreset];
    const rawChord = currentProgression.chords[gesture.fingerCount];

    if (!rawChord) return;

    if (gesture.fingerCount === 0 || rawChord.notes.length === 0) {
      // Mute / Fist gesture
      audio.playChord([]);
      piano.clearAll();
      visualizer.setAccentColor('#64748b');
      updateHudRest('✊ Fist Detected', 'Mute / Rest (Silence)');
      highlightActiveCard(0);
      return;
    }

    // Transpose notes based on key and octave
    const transposedNotes = window.ChordsData.transposeNotes(
      rawChord.notes,
      state.keyOffsetSemitones,
      state.octaveShift
    );

    // Play chord in Web Audio
    audio.playChord(transposedNotes, 1.0);

    // Update Piano display
    piano.setChordNotes(transposedNotes, rawChord.color);

    // Update Visualizer Accent Color
    visualizer.setAccentColor(rawChord.color);

    // Update HUD & Cards
    updateHudChord(gesture.fingerCount, rawChord, transposedNotes);
    highlightActiveCard(gesture.fingerCount);
  }

  // Handle continuous hand height and horizontal position
  function handleContinuousExpression(expression) {
    if (!state.isCameraRunning) return;

    // Filter Cutoff (Hand Height: 0.0 top, 1.0 bottom)
    audio.setFilterCutoff(expression.normalizedY);
    const heightPct = Math.round((1.0 - expression.normalizedY) * 100);
    if (filterMeterBar) filterMeterBar.style.width = `${heightPct}%`;
    if (filterValEl) {
      const approxHz = Math.round(400 * Math.pow(14000 / 400, 1.0 - expression.normalizedY));
      filterValEl.textContent = `${approxHz} Hz`;
    }

    // Stereo Panning
    audio.setPan(expression.normalizedX);
    if (panValEl) {
      const panVal = Math.round((expression.normalizedX * 2 - 1) * 100);
      panValEl.textContent = panVal === 0 ? 'Center' : (panVal < 0 ? `L ${Math.abs(panVal)}%` : `R ${panVal}%`);
    }

    // Fast downward strumming gesture detection
    if (expression.isStrumDownward && audio.currentChordNotes.length > 0) {
      audio.playChord(audio.currentChordNotes, 1.1);
    }
  }

  // Update Status Banner
  function handleTrackingStatus(status) {
    if (cameraStatusEl) {
      cameraStatusEl.textContent = status.message;
      cameraStatusEl.className = `camera-status status-${status.status}`;
    }
  }

  // Update HUD with active chord
  function updateHudChord(fingerCount, chord, notes) {
    const icons = {
      0: '✊',
      1: '☝️',
      2: '✌️',
      3: '🤟',
      4: '🖖',
      5: '🖐️'
    };

    if (gestureIconEl) gestureIconEl.textContent = icons[fingerCount] || '✨';
    if (gestureNameEl) gestureNameEl.textContent = `${fingerCount} ${fingerCount === 1 ? 'Finger' : 'Fingers'}`;

    // Key transposing name display
    const rootName = getTransposedChordName(chord.name, state.keyOffsetSemitones);
    if (chordNameEl) {
      chordNameEl.textContent = rootName;
      chordNameEl.style.color = chord.color;
    }

    // Render note pills
    if (chordNotesListEl) {
      chordNotesListEl.innerHTML = '';
      notes.forEach(n => {
        const pill = document.createElement('span');
        pill.className = 'note-pill';
        pill.textContent = n;
        pill.style.borderColor = chord.color;
        pill.style.color = chord.color;
        chordNotesListEl.appendChild(pill);
      });
    }

    if (trackingBadgeEl) {
      trackingBadgeEl.textContent = `${icons[fingerCount]} Active: ${rootName}`;
      trackingBadgeEl.className = 'tracking-badge badge-active';
    }
  }

  function updateHudRest(title, subtitle) {
    if (gestureIconEl) gestureIconEl.textContent = '✋';
    if (gestureNameEl) gestureNameEl.textContent = title;
    if (chordNameEl) {
      chordNameEl.textContent = subtitle;
      chordNameEl.style.color = '#94a3b8';
    }
    if (chordNotesListEl) {
      chordNotesListEl.innerHTML = '<span class="note-pill muted">None</span>';
    }
    if (trackingBadgeEl) {
      trackingBadgeEl.textContent = title;
      trackingBadgeEl.className = 'tracking-badge';
    }
  }

  // Transpose Chord Name label based on semitones (e.g. C Major + 2 semitones -> D Major)
  function getTransposedChordName(originalName, semitones) {
    if (semitones === 0) return originalName;
    const match = originalName.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return originalName;
    const [, root, suffix] = match;
    const midi = window.ChordsData.noteToMidi(`${root}4`) + semitones;
    const newRoot = window.ChordsData.NOTE_NAMES[midi % 12];
    return `${newRoot}${suffix}`;
  }

  // Render Chord Cards for Current Progression
  function renderChordCards() {
    chordsCardsContainer.innerHTML = '';
    const preset = window.ChordsData.CHORD_PRESETS[state.currentPreset];

    for (let f = 0; f <= 5; f++) {
      const chord = preset.chords[f];
      if (!chord) continue;

      const card = document.createElement('div');
      card.className = `chord-card ${f === state.currentFingers ? 'active' : ''}`;
      card.dataset.finger = f;
      card.style.setProperty('--chord-accent', chord.color);

      const fingerIcons = ['✊', '☝️', '✌️', '🤟', '🖖', '🖐️'];
      const chordDisplayName = getTransposedChordName(chord.name, state.keyOffsetSemitones);

      card.innerHTML = `
        <div class="card-finger-badge">
          <span class="finger-icon">${fingerIcons[f]}</span>
          <span class="finger-num">${f === 0 ? 'Fist' : `${f} ${f === 1 ? 'Finger' : 'Fingers'}`}</span>
        </div>
        <div class="card-chord-name" style="color: ${chord.color}">${chordDisplayName}</div>
        <div class="card-roman">${chord.roman || 'Mute'}</div>
      `;

      // Allow clicking card directly to play/test!
      card.addEventListener('click', () => {
        audio.resume();
        handleGestureDetected({ fingerCount: f });
      });

      chordsCardsContainer.appendChild(card);
    }
  }

  function highlightActiveCard(fingerCount) {
    const cards = chordsCardsContainer.querySelectorAll('.chord-card');
    cards.forEach(card => {
      if (parseInt(card.dataset.finger, 10) === fingerCount) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  // Camera Controls
  startCameraBtn.addEventListener('click', async () => {
    audio.resume();
    startCameraBtn.disabled = true;
    startCameraBtn.textContent = 'Starting Camera...';

    try {
      await tracker.init();
      state.isCameraRunning = true;
      startCameraBtn.style.display = 'none';
      stopCameraBtn.style.display = 'inline-flex';
    } catch (err) {
      startCameraBtn.disabled = false;
      startCameraBtn.textContent = 'Start Camera Tracking';
      alert('Unable to access camera: ' + (err.message || err));
    }
  });

  stopCameraBtn.addEventListener('click', () => {
    tracker.stop();
    state.isCameraRunning = false;
    stopCameraBtn.style.display = 'none';
    startCameraBtn.style.display = 'inline-flex';
    startCameraBtn.disabled = false;
    startCameraBtn.textContent = 'Start Camera Tracking';
    updateHudRest('Camera Paused', 'Click Start Camera to resume');
  });

  // Preset Selection
  presetSelect.addEventListener('change', (e) => {
    state.currentPreset = e.target.value;
    renderChordCards();
    if (state.currentFingers >= 0) {
      handleGestureDetected({ fingerCount: state.currentFingers });
    }
  });

  // Key Selection
  keySelect.addEventListener('change', (e) => {
    state.keyRoot = e.target.value;
    const rootIndex = window.ChordsData.NOTE_NAMES.indexOf(state.keyRoot);
    state.keyOffsetSemitones = rootIndex >= 0 ? rootIndex : 0;
    renderChordCards();
    if (state.currentFingers >= 0) {
      handleGestureDetected({ fingerCount: state.currentFingers });
    }
  });

  // Octave Shift
  octaveDownBtn.addEventListener('click', () => {
    if (state.octaveShift > -2) {
      state.octaveShift--;
      octaveDisplay.textContent = state.octaveShift > 0 ? `+${state.octaveShift}` : state.octaveShift;
      if (state.currentFingers >= 0) {
        handleGestureDetected({ fingerCount: state.currentFingers });
      }
    }
  });

  octaveUpBtn.addEventListener('click', () => {
    if (state.octaveShift < 2) {
      state.octaveShift++;
      octaveDisplay.textContent = state.octaveShift > 0 ? `+${state.octaveShift}` : state.octaveShift;
      if (state.currentFingers >= 0) {
        handleGestureDetected({ fingerCount: state.currentFingers });
      }
    }
  });

  // Instrument Selection
  instrumentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      audio.resume();
      instrumentBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      audio.setInstrument(btn.dataset.instrument);
    });
  });

  // Play Mode Selection (Strum, Strike, Arp, Sustain)
  playModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      audio.resume();
      playModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      audio.setPlayMode(btn.dataset.mode);
    });
  });

  // Master Volume
  volumeSlider.addEventListener('input', (e) => {
    audio.setVolume(parseFloat(e.target.value));
  });

  // Audio Recording (.webm / .wav download)
  recordBtn.addEventListener('click', () => {
    audio.resume();
    if (!audio.isRecording) {
      const ok = audio.startRecording();
      if (ok) {
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '<span class="rec-dot"></span> Stop & Save Jam';
        state.recSeconds = 0;
        recTimerEl.textContent = '00:00';
        recTimerEl.style.display = 'inline-block';
        state.recordTimerInterval = setInterval(() => {
          state.recSeconds++;
          const mins = String(Math.floor(state.recSeconds / 60)).padStart(2, '0');
          const secs = String(state.recSeconds % 60).padStart(2, '0');
          recTimerEl.textContent = `${mins}:${secs}`;
        }, 1000);
      }
    } else {
      audio.stopRecording();
      recordBtn.classList.remove('recording');
      recordBtn.innerHTML = '<span class="rec-dot"></span> Record Jam';
      clearInterval(state.recordTimerInterval);
      recTimerEl.style.display = 'none';
    }
  });

  // Keyboard Fallback (0 to 5, Space to strum)
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (['0', '1', '2', '3', '4', '5'].includes(e.key)) {
      audio.resume();
      const count = parseInt(e.key, 10);
      handleGestureDetected({ fingerCount: count });
    } else if (e.code === 'Space') {
      e.preventDefault();
      audio.resume();
      if (audio.currentChordNotes.length > 0) {
        audio.playChord(audio.currentChordNotes, 1.0);
      }
    }
  });

  // Initial render
  renderChordCards();
  updateHudRest('Ready to Jam', 'Start camera or press keys 1-5');
});
