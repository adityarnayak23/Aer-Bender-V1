# 🎵 GestureChords — Real-Time Finger Gesture Music Synthesizer

Play beautiful musical chords simply by pointing your fingers at the camera! **GestureChords** turns your webcam into an expressive musical instrument using client-side AI computer vision and a zero-latency Web Audio polyphonic synthesizer.

---

## 🌟 Key Features

- **☝️ Finger Gesture Recognition**:
  - `0 Fingers (Fist ✊)`: Mute / Rest (palm mute damping)
  - `1 Finger (Index ☝️)`: Chord 1 (e.g. C Major - Root)
  - `2 Fingers (Peace ✌️)`: Chord 2 (e.g. F Major - Subdominant)
  - `3 Fingers (Three 🤟)`: Chord 3 (e.g. G Major - Dominant)
  - `4 Fingers (Four 🖖)`: Chord 4 (e.g. A Minor - Relative minor)
  - `5 Fingers (Open Palm 🖐️)`: Chord 5 (e.g. E Minor / Dm7)
- **✨ Spatial Air Expression**:
  - **Hand Height (Vertical Y)**: Modulates low-pass filter cutoff in real-time. Raising your hand opens up brightness, high-frequency harmonics, and sizzle!
  - **Hand Horizontal Position (X)**: Modulates stereo panning across your headphones or speakers.
  - **Downwards Strum Motion**: Quick downward hand motion triggers a realistic acoustic strum roll.
- **🎹 5 Lush Synthesizer Timbres**:
  - **Warm Electric Piano**: Rhodes-style tine transient with harmonic decay and tremolo.
  - **Dream Ambient Pad**: Dual detuned saws with warm sub-bass, soft attack, and infinite tail.
  - **Grand Piano**: Realistic hammer percussive attack with multi-harmonic sustain.
  - **Acoustic Harp / Pluck**: Snappy pluck transient with resonant acoustic body.
  - **80s Retro Poly**: Vintage chorused brassy synth with punchy filter envelope.
- **🎸 4 Playback Styles**:
  - **Acoustic Strum**: Staggers chord notes with a 45ms roll for natural guitar/harp strumming.
  - **Instant Strike**: Simultaneous punchy chord impact.
  - **Arpeggiator**: Tempo-synced rhythmic 8th-note arp patterns.
  - **Lush Sustain**: Continuous drone while holding fingers up, fading when fist is made.
- **🎼 Music Theory & Progression Presets**:
  - *Pop Anthem*: Classic hit song progression (I - IV - V - vi - iii).
  - *Lo-Fi Chill*: Dreamy 7th chords (Cmaj7, Fmaj7, G7, Am7, Dm7).
  - *Neo-Soul & Jazz*: Extended 9ths and 13ths (Cmaj9, Dm9, G13, Am9, Fm9).
  - *Epic Cinematic*: Dramatic Hans Zimmer soundtrack progression (Am - F - C - G - Dm).
  - *Sunset Ambient*: Open voicings with 9ths and sus4 chords.
  - Transposable to all 12 key centers (C, D, E, F, G, A, B, etc.) and ±2 octaves.
- **🎹 Visualizers & HUD**:
  - Live mirrored camera feed with neon skeleton bones and glowing fingertip halos.
  - Interactive 25-key Virtual Piano lighting up every chord note in real time.
  - Real-time Audio Spectrum & Oscilloscope waveform visualizer.
  - Tap-to-play chord cards and keyboard shortcuts (`0`-`5`, `Space`).
- **🎙️ Direct Audio Recorder**:
  - Capture your air-gesture jam session with a single click and download high-fidelity `.webm` audio.

---

## 🚀 How to Run

You can launch a local static web server to run GestureChords:

```bash
# In this directory:
npx serve .
# or with Python:
python3 -m http.server 8080
```

Then open your browser to `http://localhost:8080` (or `http://localhost:3000`).

---

## 🖐️ Tips for Best Tracking Experience

1. **Camera Permissions**: Click **"Start Camera Tracking"** and allow your browser to access the camera.
2. **Lighting**: Ensure your hand is evenly lit against your background.
3. **Hand Framing**: Keep your hand comfortably inside the camera frame.
4. **Orientation**: Hold your hand naturally towards the webcam. The model uses distance-invariant geometry, so slight tilts are smoothly recognized.
5. **No Camera?**: You can still play! Press keys `0`, `1`, `2`, `3`, `4`, `5` on your keyboard, or click the chord cards or piano keys directly.
