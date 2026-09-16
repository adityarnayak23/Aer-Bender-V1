// Chords Data & Music Theory Engine for GestureChords

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Map note name with octave (e.g. 'C4') to MIDI number
function noteToMidi(noteName) {
  const match = noteName.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return 60; // default C4
  let [, pitch, octaveStr] = match;
  let octave = parseInt(octaveStr, 10);
  
  // Normalize flats to sharps
  const flatMap = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
  if (flatMap[pitch]) pitch = flatMap[pitch];

  const noteIndex = NOTE_NAMES.indexOf(pitch);
  if (noteIndex === -1) return 60;
  return (octave + 1) * 12 + noteIndex;
}

// Map MIDI number to Hz frequency
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Map note string directly to Hz
function noteToFreq(noteName) {
  return midiToFreq(noteToMidi(noteName));
}

// Convert MIDI number to note name
function midiToNote(midi) {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

// Preset Chord Progressions mapped to finger counts (0 to 5)
// 0 is always Mute / Rest
const CHORD_PRESETS = {
  pop: {
    id: 'pop',
    name: 'Pop Anthem (I - IV - V - vi - ii)',
    key: 'C',
    description: 'Classic uplifting progression heard in hundreds of hit pop songs.',
    chords: {
      0: { name: 'Mute', shortName: 'Rest', notes: [], color: '#64748b' },
      1: { name: 'C Major', shortName: 'C', roman: 'I', notes: ['C3', 'G3', 'C4', 'E4'], color: '#38bdf8' },
      2: { name: 'F Major', shortName: 'F', roman: 'IV', notes: ['F3', 'C4', 'F4', 'A4'], color: '#4ade80' },
      3: { name: 'G Major', shortName: 'G', roman: 'V', notes: ['G3', 'D4', 'G4', 'B4'], color: '#fbbf24' },
      4: { name: 'A Minor', shortName: 'Am', roman: 'vi', notes: ['A2', 'E3', 'A3', 'C4'], color: '#f472b6' },
      5: { name: 'E Minor', shortName: 'Em', roman: 'iii', notes: ['E3', 'B3', 'E4', 'G4'], color: '#a78bfa' }
    }
  },
  lofi: {
    id: 'lofi',
    name: 'Lo-Fi Chill (Maj7 & Min7)',
    key: 'C',
    description: 'Warm, jazzy 7th chords perfect for relaxed, dreamy study beats.',
    chords: {
      0: { name: 'Mute', shortName: 'Rest', notes: [], color: '#64748b' },
      1: { name: 'Cmaj7', shortName: 'Cmaj7', roman: 'I7', notes: ['C3', 'G3', 'B3', 'E4'], color: '#38bdf8' },
      2: { name: 'Fmaj7', shortName: 'Fmaj7', roman: 'IV7', notes: ['F3', 'C4', 'E4', 'A4'], color: '#4ade80' },
      3: { name: 'G7', shortName: 'G7', roman: 'V7', notes: ['G3', 'D4', 'F4', 'B4'], color: '#fbbf24' },
      4: { name: 'Am7', shortName: 'Am7', roman: 'vi7', notes: ['A2', 'G3', 'C4', 'E4'], color: '#f472b6' },
      5: { name: 'Dm7', shortName: 'Dm7', roman: 'ii7', notes: ['D3', 'A3', 'C4', 'F4'], color: '#2dd4bf' }
    }
  },
  neoSoul: {
    id: 'neoSoul',
    name: 'Neo-Soul & Jazz (9ths & 11ths)',
    key: 'C',
    description: 'Lush, sophisticated extended chords with rich harmonic depth.',
    chords: {
      0: { name: 'Mute', shortName: 'Rest', notes: [], color: '#64748b' },
      1: { name: 'Cmaj9', shortName: 'Cmaj9', roman: 'I9', notes: ['C3', 'G3', 'B3', 'D4', 'E4'], color: '#38bdf8' },
      2: { name: 'Dm9', shortName: 'Dm9', roman: 'ii9', notes: ['D3', 'F3', 'C4', 'E4', 'A4'], color: '#2dd4bf' },
      3: { name: 'G13', shortName: 'G13', roman: 'V13', notes: ['G2', 'F3', 'B3', 'E4', 'A4'], color: '#fbbf24' },
      4: { name: 'Am9', shortName: 'Am9', roman: 'vi9', notes: ['A2', 'G3', 'C4', 'E4', 'B4'], color: '#f472b6' },
      5: { name: 'Fm9', shortName: 'Fm9', roman: 'iv9', notes: ['F2', 'Ab3', 'Eb4', 'G4', 'C5'], color: '#c084fc' }
    }
  },
  epic: {
    id: 'epic',
    name: 'Epic Cinematic (vi - IV - I - V in Am)',
    key: 'Am',
    description: 'Dramatic soundtrack chords inspired by film scores and Hans Zimmer.',
    chords: {
      0: { name: 'Mute', shortName: 'Rest', notes: [], color: '#64748b' },
      1: { name: 'A Minor', shortName: 'Am', roman: 'i', notes: ['A2', 'E3', 'A3', 'C4', 'E4'], color: '#f472b6' },
      2: { name: 'F Major', shortName: 'F', roman: 'VI', notes: ['F2', 'C3', 'F3', 'A3', 'C4'], color: '#4ade80' },
      3: { name: 'C Major', shortName: 'C', roman: 'III', notes: ['C3', 'G3', 'C4', 'E4', 'G4'], color: '#38bdf8' },
      4: { name: 'G Major', shortName: 'G', roman: 'VII', notes: ['G2', 'D3', 'G3', 'B3', 'D4'], color: '#fbbf24' },
      5: { name: 'D Minor', shortName: 'Dm', roman: 'iv', notes: ['D3', 'A3', 'D4', 'F4', 'A4'], color: '#2dd4bf' }
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Ambient (Dream Chords)',
    key: 'G',
    description: 'Warm, open atmospheric voicings with sparkling fifths and ninths.',
    chords: {
      0: { name: 'Mute', shortName: 'Rest', notes: [], color: '#64748b' },
      1: { name: 'Gmaj7', shortName: 'Gmaj7', roman: 'I', notes: ['G2', 'D3', 'F#3', 'B3', 'D4'], color: '#fbbf24' },
      2: { name: 'Cadd9', shortName: 'Cadd9', roman: 'IV', notes: ['C3', 'G3', 'D4', 'E4', 'G4'], color: '#38bdf8' },
      3: { name: 'Em9', shortName: 'Em9', roman: 'vi', notes: ['E2', 'B2', 'F#3', 'G3', 'D4'], color: '#a78bfa' },
      4: { name: 'Dsus4', shortName: 'Dsus4', roman: 'V', notes: ['D3', 'A3', 'D4', 'G4', 'A4'], color: '#4ade80' },
      5: { name: 'Bm7', shortName: 'Bm7', roman: 'iii', notes: ['B2', 'F#3', 'A3', 'D4', 'F#4'], color: '#f472b6' }
    }
  }
};

// Transpose chord notes by a semitone delta and octave shift
function transposeNotes(notesArray, semitones = 0, octaveShift = 0) {
  const totalOffset = semitones + (octaveShift * 12);
  if (totalOffset === 0) return [...notesArray];

  return notesArray.map(note => {
    const midi = noteToMidi(note);
    const transposedMidi = Math.max(21, Math.min(108, midi + totalOffset)); // Clamp to 88-key range
    return midiToNote(transposedMidi);
  });
}

// Export functions and presets for browser environment
window.ChordsData = {
  NOTE_NAMES,
  CHORD_PRESETS,
  noteToMidi,
  midiToFreq,
  noteToFreq,
  midiToNote,
  transposeNotes
};
