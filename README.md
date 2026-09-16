# 🪈 Aer Bender V1 — Vision Flute Controller

Play a classical Indian flute in the air using the authentic **Carnatic finger-holding style** and your webcam! **Aer Bender V1** uses dual-hand AI vision to detect your finger positions across a virtual 7-hole flute, sounding authentic Swaras with multiple world flute timbres and an acoustic Tanpura drone.

---

## 🖐️ Authentic Carnatic Fingering Mapping

In the Carnatic 2-hole Sa Venu system:
- **Left Hand (Top/Embouchure end)**: Index (`L1`), Middle (`L2`), Ring (`L3`)
- **Right Hand (Distal end)**: Index (`R1`), Middle (`R2`), Ring (`R3`), Pinky (`R4`)

| Swara | Western Note (Key C) | Left Hand (L1, L2, L3) | Right Hand (R1, R2, R3, R4) | Pattern | Rule Description |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **Sa (S)** | C4 | **Index & Middle CLOSED**, Ring OPEN | **All OPEN** | `[●, ●, ○, ○, ○, ○, ○]` | **First 2 close** (Left Index & Middle closed) |
| **Ri (R)** | D4 | **Index CLOSED**, Middle & Ring OPEN | **All OPEN** | `[●, ○, ○, ○, ○, ○, ○]` | Left hand index only close |
| **Ga (G)** | E4 | **All OPEN** | **All OPEN** | `[○, ○, ○, ○, ○, ○, ○]` | All open |
| **Ma (M)** | F4 | **Index OPEN**, Middle & Ring CLOSED | **All CLOSED** | `[○, ●, ●, ●, ●, ●, ●]` | All close - index only open |
| **Pa (P)** | G4 | **All CLOSED** | **Index & Middle CLOSED**, Ring & Small OPEN | `[●, ●, ●, ●, ●, ○, ○]` | All close, right small & ring open |
| **Dha (D)** | A4 | **All CLOSED** | **Only Index CLOSED**, Middle, Ring & Small OPEN | `[●, ●, ●, ●, ○, ○, ○]` | Left all close, right only index close |
| **Ni (N)** | B4 | **All CLOSED** | **All OPEN** | `[●, ●, ●, ○, ○, ○, ○]` | Left all close |
| **Tara Sa (Ṡ)** | C5 | **Index & Middle CLOSED** | **All OPEN** | `[●, ●, ○, ○, ○, ○, ○]` | Overblown upper register of Sa |

*Note: `●` = Finger curled / covering hole (Closed) | `○` = Finger lifted (Open)*

---

## 🎋 Authentic Carnatic Bamboo Venu (புல்லாங்குழல்) Acoustic Engine

The audio engine is custom-engineered specifically for the classical **Carnatic Bamboo Venu**:
- **🎋 Assam Seasoned Bamboo Bore Formants**: Dual body cavity resonance (880 Hz wood chamber warmth + 2250 Hz tone hole radiation) with natural high-frequency acoustic absorption.
- **🌬️ Non-linear Embouchure Jet Saturation**: Models hydrodynamic air-jet splitting across the sharp bamboo labium edge via cubic/hyperbolic saturation curve.
- **💨 Coupled Breath Turbulence & Chiff**: Dynamic pink-filtered breath chiff and resonant bore air column that actively tracks the swara frequency in real-time.
- **🎶 Pure Swara Intonation & Fluid Jaaru**: Removed artificial synthesizer LFO vibratos, replacing them with organic human breath micro-fluctuations and authentic 60ms exponential *Jaaru* (Meend) glides.
- **🪕 Tanpura Drone**: Integrated classical Indian drone (Pa - Sa - Sa' strings) for immersive kutcheri practice.

---

## ✨ Expressive Air Controls

- **Gamaka (Pitch Bend)**: Gently rock or tilt your hands/wrists up and down while playing to bend pitch microtonally (*Kampita* vibrato and *Jaaru* slides)!
- **Breath Control**:
  - **Auto-Air Stream (Default)**: Plays continuously while your hands are in flute posture.
  - **Microphone Breath Blow**: Toggle on mic mode to blow into your laptop microphone to articulate notes with real breath velocity!

---

## 🚀 How to Launch

```bash
cd /Users/adityanayak/.gemini/antigravity/scratch/air-flute
./start.sh
```

Or run:
```bash
node server.js
```
Then open `http://localhost:8081` in your browser!
