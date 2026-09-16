// Re-extract Aditya's samples WITHOUT pitch correction
// Keeps the original recorded tone exactly as-is
// Only: clean cut + DC removal + gentle high-pass + seamless loop + normalize
const fs = require("fs");
const path = require("path");

const srcFile = "/Users/adityanayak/Library/Containers/com.apple.garageband10/Data/Documents/C# - Saregama - Aditya.band/Media/Audio Files/Untitled 3#06.wav";
const outDir = path.join(__dirname, "audio", "samples");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const buf = fs.readFileSync(srcFile);
const rate = 44100;

// Parse WAV properly
let dataOffset = 44, dataLen = buf.length - 44;
let pos = 12;
while (pos < buf.length - 8) {
  const chunkId = buf.toString("ascii", pos, pos + 4);
  const chunkSize = buf.readUInt32LE(pos + 4);
  if (chunkId === "fmt ") {
    // just skip, we know it's 24-bit mono
  } else if (chunkId === "data") {
    dataOffset = pos + 8;
    dataLen = chunkSize;
    break;
  }
  pos += 8 + chunkSize;
}

const totalSamples = Math.floor(dataLen / 3);
const rawSamples = new Float32Array(totalSamples);
for (let i = 0; i < totalSamples; i++) {
  const o = dataOffset + i * 3;
  let val = (buf[o]) | (buf[o+1] << 8) | (buf[o+2] << 16);
  if (val & 0x800000) val |= ~0xffffff;
  rawSamples[i] = val / 8388608.0;
}

console.log(`Source: ${totalSamples} samples, ${(totalSamples/rate).toFixed(2)}s`);

// 15 notes — using the MEASURED frequency as basePitch (no correction)
const notes = [
  // Lower octave (Mandra) — user's actual recorded pitches
  { id: "bass_ma",  name: "Mandra Ma",  start: 3.16, end: 4.30, measuredFreq: 366.5 },
  { id: "bass_pa",  name: "Mandra Pa",  start: 4.92, end: 6.36, measuredFreq: 427.5 },
  { id: "bass_dha", name: "Mandra Da",  start: 7.00, end: 8.36, measuredFreq: 478.0 },
  { id: "bass_ni",  name: "Mandra Ni",  start: 8.82, end: 10.04, measuredFreq: 544.0 },

  // Mid octave (Madhya)
  { id: "sa",       name: "Madhya Sa",  start: 10.66, end: 11.94, measuredFreq: 566.0 },
  { id: "ri",       name: "Madhya Ri",  start: 12.44, end: 13.84, measuredFreq: 635.5 },
  { id: "ga",       name: "Madhya Ga",  start: 14.26, end: 15.66, measuredFreq: 716.0 },
  { id: "ma",       name: "Madhya Ma",  start: 16.14, end: 17.62, measuredFreq: 740.0 },
  { id: "pa",       name: "Madhya Pa",  start: 18.18, end: 19.56, measuredFreq: 841.5 },
  { id: "dha",      name: "Madhya Da",  start: 19.92, end: 21.32, measuredFreq: 949.0 },
  { id: "ni",       name: "Madhya Ni",  start: 21.64, end: 23.02, measuredFreq: 1077.5 },

  // Higher octave (Tara)
  { id: "sa_high",  name: "Tara Sa",    start: 23.32, end: 24.74, measuredFreq: 1133.5 },
  { id: "ri_high",  name: "Tara Ri",    start: 25.14, end: 26.46, measuredFreq: 1275.0 },
  { id: "ga_high",  name: "Tara Ga",    start: 26.74, end: 28.04, measuredFreq: 1445.0 },
  { id: "ma_high",  name: "Tara Ma",    start: 28.44, end: 29.88, measuredFreq: 1495.0 }
];

// Gentle high-pass at 50Hz to remove DC/sub-bass rumble only (less aggressive than 75Hz)
function highPass50(sig) {
  const rc = 1.0 / (2 * Math.PI * 50);
  const dt = 1.0 / rate;
  const alpha = rc / (rc + dt);
  const out = new Float32Array(sig.length);
  out[0] = sig[0];
  for (let i = 1; i < sig.length; i++) {
    out[i] = alpha * (out[i-1] + sig[i] - sig[i-1]);
  }
  return out;
}

// Catmull-Rom for octave-shift derived samples only (NOT for the 15 originals)
function resample(input, ratio) {
  if (Math.abs(ratio - 1.0) < 0.0002) return new Float32Array(input);
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const p = i * ratio;
    const idx = Math.floor(p);
    const frac = p - idx;
    const p0 = input[Math.max(0, idx - 1)];
    const p1 = input[idx];
    const p2 = input[Math.min(input.length - 1, idx + 1)];
    const p3 = input[Math.min(input.length - 1, idx + 2)];
    const a = -0.5*p0 + 1.5*p1 - 1.5*p2 + 0.5*p3;
    const b = p0 - 2.5*p1 + 2.0*p2 - 0.5*p3;
    const c = -0.5*p0 + 0.5*p2;
    const d = p1;
    out[i] = a*frac*frac*frac + b*frac*frac + c*frac + d;
  }
  return out;
}

// Build uniform-length sample with seamless loop, NO pitch change
function buildCleanSample(rawSlice, targetDuration = 2.50) {
  // Just high-pass and DC removal — NO resampling/pitch correction
  let cleaned = highPass50(rawSlice);

  // Remove DC offset
  let sum = 0;
  for (let i = 0; i < cleaned.length; i++) sum += cleaned[i];
  const dc = sum / cleaned.length;
  for (let i = 0; i < cleaned.length; i++) cleaned[i] -= dc;

  const totalLen = Math.floor(targetDuration * rate);
  const out = new Float32Array(totalLen);

  const loopStartIdx = Math.floor(0.30 * rate);  // 300ms attack
  const loopEndIdx = Math.floor(2.20 * rate);     // loop end at 2.2s

  // Attack: copy the natural onset directly from original
  const attackLen = Math.min(loopStartIdx, cleaned.length);
  for (let i = 0; i < attackLen; i++) {
    // gentle 3ms fade-in at the very start to avoid clicks
    const env = i < 132 ? (i / 132) : 1.0;
    out[i] = cleaned[i] * env;
  }

  // Sustain body: extract steady-state from the middle of the note
  const susStart = Math.floor(cleaned.length * 0.20);
  const susEnd = Math.floor(cleaned.length * 0.90);
  const susSlice = cleaned.subarray(susStart, susEnd);
  const susLen = susSlice.length;

  // Crossfade length for seamless looping: 120ms
  const xfadeLen = Math.floor(rate * 0.12);

  // Fill from loopStart to end with looped sustain
  for (let i = loopStartIdx; i < totalLen; i++) {
    const cyclePos = (i - loopStartIdx) % (susLen - xfadeLen);

    if (cyclePos >= (susLen - 2 * xfadeLen)) {
      const t = (cyclePos - (susLen - 2 * xfadeLen)) / xfadeLen;
      const gain1 = Math.cos(t * Math.PI * 0.5);
      const gain2 = Math.sin(t * Math.PI * 0.5);
      const s1 = susSlice[cyclePos] || 0;
      const s2 = susSlice[Math.max(0, cyclePos - (susLen - 2 * xfadeLen))] || 0;
      out[i] = s1 * gain1 + s2 * gain2;
    } else {
      out[i] = susSlice[cyclePos] || 0;
    }

    // Release fade after loopEnd (last 0.3s)
    if (i >= loopEndIdx) {
      const relPos = (i - loopEndIdx) / (totalLen - loopEndIdx);
      out[i] *= Math.cos(relPos * Math.PI * 0.5);
    }
  }

  // Peak normalize to 0.92 (-0.7 dBFS) — keep it loud and clean
  let maxAmp = 0;
  for (let i = 0; i < out.length; i++) {
    if (Math.abs(out[i]) > maxAmp) maxAmp = Math.abs(out[i]);
  }
  if (maxAmp > 0.001) {
    const scale = 0.92 / maxAmp;
    for (let i = 0; i < out.length; i++) out[i] *= scale;
  }

  return { samples: out, loopStart: 0.30, loopEnd: 2.20, duration: targetDuration };
}

function writeWav(filePath, samples, sampleRate) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(s < 0 ? s * 0x8000 : s * 0x7FFF), offset);
    offset += 2;
  }
  fs.writeFileSync(filePath, buffer);
}

// ============================================================
// Process all 15 notes: NO pitch correction, original tone
// ============================================================
const manifest = {};
const processedSamples = {};

console.log("=== Re-extracting Aditya Flute Samples (ORIGINAL TONE, no pitch correction) ===\n");

for (const n of notes) {
  const iS = Math.max(0, Math.floor((n.start - 0.03) * rate));
  const iE = Math.min(rawSamples.length, Math.floor((n.end + 0.03) * rate));
  const rawSlice = rawSamples.subarray(iS, iE);

  const res = buildCleanSample(rawSlice, 2.50);
  processedSamples[n.id] = res;

  const fileName = `${n.id}.wav`;
  writeWav(path.join(outDir, fileName), res.samples, rate);

  // Use MEASURED frequency as basePitch — this IS what the user played
  manifest[n.id] = {
    file: `audio/samples/${fileName}`,
    name: n.name,
    basePitch: n.measuredFreq,
    loopStart: res.loopStart,
    loopEnd: res.loopEnd,
    duration: res.duration,
    source: "Aditya Original GarageBand Master (C# Flute, unmodified tone)"
  };

  console.log(`✅ ${n.id}: ${n.name} → ${fileName} (${n.measuredFreq}Hz, original pitch preserved)`);
}

// Generate missing lower octave: bass_sa, bass_ri, bass_ga (from mid Sa, Ri, Ga shifted down 1 octave)
const lowerMissing = [
  { id: "bass_sa", baseId: "sa", name: "Mandra Sa", freq: 566.0 / 2 },
  { id: "bass_ri", baseId: "ri", name: "Mandra Ri", freq: 635.5 / 2 },
  { id: "bass_ga", baseId: "ga", name: "Mandra Ga", freq: 716.0 / 2 }
];

for (const m of lowerMissing) {
  const baseRes = processedSamples[m.baseId];
  const downSamples = resample(baseRes.samples, 0.5);
  const uniformDown = new Float32Array(Math.floor(2.50 * rate));
  for (let i = 0; i < uniformDown.length; i++) uniformDown[i] = downSamples[i] || 0;

  const fileName = `${m.id}.wav`;
  writeWav(path.join(outDir, fileName), uniformDown, rate);

  manifest[m.id] = {
    file: `audio/samples/${fileName}`,
    name: m.name,
    basePitch: m.freq,
    loopStart: 0.30,
    loopEnd: 2.20,
    duration: 2.50,
    source: "Aditya Original GarageBand Master (Mandra Octave Shift)"
  };
  console.log(`✅ ${m.id}: ${m.name} → ${fileName} (derived from ${m.baseId}, ${m.freq.toFixed(1)}Hz)`);
}

// Generate missing higher octave: pa_high, dha_high, ni_high (from mid Pa, Dha, Ni shifted up 1 octave)
const higherMissing = [
  { id: "pa_high",  baseId: "pa",  name: "Tara Pa",  freq: 841.5 * 2 },
  { id: "dha_high", baseId: "dha", name: "Tara Da",  freq: 949.0 * 2 },
  { id: "ni_high",  baseId: "ni",  name: "Tara Ni",  freq: 1077.5 * 2 }
];

for (const m of higherMissing) {
  const baseRes = processedSamples[m.baseId];
  const upSamples = resample(baseRes.samples, 2.0);
  const uniformUp = new Float32Array(Math.floor(2.50 * rate));
  for (let i = 0; i < uniformUp.length; i++) uniformUp[i] = upSamples[i] || 0;

  const fileName = `${m.id}.wav`;
  writeWav(path.join(outDir, fileName), uniformUp, rate);

  manifest[m.id] = {
    file: `audio/samples/${fileName}`,
    name: m.name,
    basePitch: m.freq,
    loopStart: 0.30,
    loopEnd: 2.20,
    duration: 2.50,
    source: "Aditya Original GarageBand Master (Tara Octave Shift)"
  };
  console.log(`✅ ${m.id}: ${m.name} → ${fileName} (derived from ${m.baseId}, ${m.freq.toFixed(1)}Hz)`);
}

// Write manifest
const manifestPath = path.join(outDir, "manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
console.log(`\n🎉 Manifest: ${Object.keys(manifest).length} samples. ALL using original recorded pitch — zero pitch correction.`);
