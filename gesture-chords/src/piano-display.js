// Interactive Virtual Piano Keyboard Display for GestureChords

class PianoDisplay {
  constructor(containerElement, onKeyClick = null) {
    this.container = containerElement;
    this.onKeyClick = onKeyClick;
    this.startMidi = 48; // C3
    this.endMidi = 72;   // C5 (25 keys total: 2 full octaves + 1)
    this.keyElements = new Map(); // midiNumber -> DOM element
    this.activeNotes = new Set();

    this.render();
  }

  // Check if a midi note is a black key (sharp/flat)
  isBlackKey(midi) {
    const pitch = midi % 12;
    return [1, 3, 6, 8, 10].includes(pitch); // C#, D#, F#, G#, A#
  }

  // Render HTML structure for the piano
  render() {
    this.container.innerHTML = '';
    this.keyElements.clear();

    const pianoWrapper = document.createElement('div');
    pianoWrapper.className = 'piano-keyboard';

    for (let midi = this.startMidi; midi <= this.endMidi; midi++) {
      const isBlack = this.isBlackKey(midi);
      const noteName = window.ChordsData.midiToNote(midi);

      const key = document.createElement('div');
      key.className = `piano-key ${isBlack ? 'black-key' : 'white-key'}`;
      key.dataset.midi = midi;
      key.dataset.note = noteName;

      // Note label
      const label = document.createElement('span');
      label.className = 'key-label';
      label.textContent = noteName;
      key.appendChild(label);

      // Click / touch interaction
      key.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.highlightKey(midi, '#38bdf8');
        if (this.onKeyClick) this.onKeyClick(noteName);
      });

      key.addEventListener('mouseup', () => {
        this.unhighlightKey(midi);
      });

      key.addEventListener('mouseleave', () => {
        this.unhighlightKey(midi);
      });

      pianoWrapper.appendChild(key);
      this.keyElements.set(midi, key);
    }

    this.container.appendChild(pianoWrapper);
  }

  // Highlight a specific key by MIDI number or note name
  highlightKey(midiOrNote, color = '#38bdf8') {
    const midi = typeof midiOrNote === 'number'
      ? midiOrNote
      : window.ChordsData.noteToMidi(midiOrNote);

    const keyEl = this.keyElements.get(midi);
    if (keyEl) {
      keyEl.classList.add('active');
      keyEl.style.setProperty('--accent-glow', color);
      this.activeNotes.add(midi);
    }
  }

  // Unhighlight a single key
  unhighlightKey(midiOrNote) {
    const midi = typeof midiOrNote === 'number'
      ? midiOrNote
      : window.ChordsData.noteToMidi(midiOrNote);

    const keyEl = this.keyElements.get(midi);
    if (keyEl) {
      keyEl.classList.remove('active');
      this.activeNotes.delete(midi);
    }
  }

  // Set the full active chord on the piano (unhighlights old notes, highlights new chord)
  setChordNotes(notesArray, chordColor = '#38bdf8') {
    // Clear previously highlighted keys
    this.keyElements.forEach((el, midi) => {
      el.classList.remove('active');
      el.classList.remove('chord-active');
    });
    this.activeNotes.clear();

    if (!notesArray || notesArray.length === 0) return;

    notesArray.forEach(noteName => {
      const midi = window.ChordsData.noteToMidi(noteName);
      const keyEl = this.keyElements.get(midi);
      if (keyEl) {
        keyEl.classList.add('active', 'chord-active');
        keyEl.style.setProperty('--accent-glow', chordColor);
        this.activeNotes.add(midi);
      }
    });
  }

  clearAll() {
    this.keyElements.forEach(el => {
      el.classList.remove('active', 'chord-active');
    });
    this.activeNotes.clear();
  }
}

// Export for browser
window.PianoDisplay = PianoDisplay;
