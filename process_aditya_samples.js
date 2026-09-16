const fs = require("fs");
const path = require("path");

const srcFile = "/Users/adityanayak/Library/Containers/com.apple.garageband10/Data/Documents/C# - Saregama - Aditya.band/Media/Audio Files/Untitled 3#06.wav";
const outDir = path.join(__dirname, "audio", "samples");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const buf = fs.readFileSync(srcFile);
const rate = 44100;
const dataOffset = 44;
const totalSamples = Math.floor((buf.length - dataOffset) / 3);

const rawSamples = new Float32Array(totalSamples);
for (let i = 0; i < totalSamples; i++) {
  const o = dataOffset + i * 3;
  let val = (buf[o]) | (buf[o+1] << 8) | (buf[o+2] << 16);
  if (val & 0x800000) val |= ~0xffffff;
  rawSamples[i] = val / 8388608.0;
}

// 15 Note definitions from Aditya's recording
const notes = [
  // Lower octave (Mandra)
  { id: "bass_ma",  name: "Mandra Ma",  start: 3.16, end: 4.30, targetFreq: 369.99, measuredFreq: 366.5, type: "bass" },
  { id: "bass_pa",  name: "Mandra Pa",  start: 4.92, end: 6.36, targetFreq: 415.30, measuredFreq: 427.5, type: "bass" },
  { id: "bass_dha", name: "Mandra Da",  start: 7.00, end: 8.36, targetFreq: 466.16, measuredFreq: 478.0, type: "bass" },
  { id: "bass_ni",  name: "Mandra Ni",  start: 8.82, end: 10.04,targetFreq: 523.25, measuredFreq: 544.0, type: "bass" },

  // Mid octave (Madhya)
  { id: "sa",       name: "Madhya Sa",  start: 10.66, end: 11.94, targetFreq: 554.37, measuredFreq: 566.0, type: "mid" },
  { id: "ri",       name: "Madhya Ri",  start: 12.44, end: 13.84, targetFreq: 622.25, measuredFreq: 635.5, type: "mid" },
  { id: "ga",       name: "Madhya Ga",  start: 14.26, end: 15.66, targetFreq: 698.46, measuredFreq: 716.0, type: "mid" },
  { id: "ma",       name: "Madhya Ma",  start: 16.14, end: 17.62, targetFreq: 739.99, measuredFreq: 740.0, type: "mid" },
  { id: "pa",       name: "Madhya Pa",  start: 18.18, end: 19.56, targetFreq: 830.61, measuredFreq: 841.5, type: "mid" },
  { id: "dha",      name: "Madhya Da",  start: 19.92, end: 21.32, targetFreq: 932.33, measuredFreq: 949.0, type: "mid" },
  { id: "ni",       name: "Madhya Ni",  start: 21.64, end: 23.02, targetFreq: 1046.50, measuredFreq: 1077.5, type: "mid" },

  // Higher octave (Tara)
  { id: "sa_high",  name: "Tara Sa",    start: 23.32, end: 24.74, targetFreq: 1108.73, measuredFreq: 1133.5, type: "high" },
  { id: "ri_high",  name: "Tara Ri",    start: 25.14, end: 26.46, targetFreq: 1244.51, measuredFreq: 1275.0, type: "high" },
  { id: "ga_high",  name: "Tara Ga",    start: 26.74, end: 28.04, targetFreq: 1396.91, measuredFreq: 1445.0, type: "high" },
  { id: "ma_high",  name: "Tara Ma",    start: 28.44, end: 29.88, targetFreq: 1479.98, measuredFreq: 1495.0, type: "high" }
];

// Resample function with Catmull-Rom cubic interpolation
function resample(input, ratio) {
  if (Math.abs(ratio - 1.0) < 0.0002) return new Float32Array(input);
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const p0 = input[Math.max(0, idx - 1)];
    const p1 = input[idx];
    const p2 = input[Math.min(input.length - 1, idx + 1)];
    const p3 = input[Math.min(input.length - 1, idx + 2)];
    const a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
    const b = p0 - 2.5 * p1 + 2.0 * p2 - 0.5 * p3;
    const c = -0.5 * p0 + 0.5 * p2;
    const d = p1;
    out[i] = a * frac * frac * frac + b * frac * frac + c * frac + d;
  }
  return out;
}

// Low-cut filter (High-pass at 75 Hz) to clean up sub-bass mic rumble
function highPass75(sig) {
  const rc = 1.0 / (2 * Math.PI * 75);
  const dt = 1.0 / rate;
  const alpha = rc / (rc + dt);
  const out = new Float32Array(sig.length);
  out[0] = sig[0];
  for (let i = 1; i < sig.length; i++) {
    out[i] = alpha * (out[i-1] + sig[i] - sig[i-1]);
  }
  return out;
}

// Seamless Looper & Uniform Length Builder
// Total duration = targetDuration (2.50s)
// loopStart = 0.35s, loopEnd = 2.15s
function buildSeamlessUniformSample(rawSlice, pitchRatio, targetDurationSec = 2.50) {
  // 1. Resample for minor pitch correction
  let corrected = resample(rawSlice, pitchRatio);
  corrected = highPass75(corrected);

  // Remove DC offset
  let sum = 0;
  for (let i = 0; i < corrected.length; i++) sum += corrected[i];
  const dc = sum / corrected.length;
  for (let i = 0; i < corrected.length; i++) corrected[i] -= dc;

  const totalLen = Math.floor(targetDurationSec * rate);
  const out = new Float32Array(totalLen);

  const loopStartIdx = Math.floor(0.35 * rate);
  const loopEndIdx = Math.floor(2.15 * rate);
  const loopLen = loopEndIdx - loopStartIdx;

  // Attack section (from 0 to loopStart)
  const attackLen = Math.min(loopStartIdx, corrected.length);
  for (let i = 0; i < attackLen; i++) {
    // gentle 5ms fade-in at the very start
    const env = i < 220 ? (i / 220) : 1.0;
    out[i] = corrected[i] * env;
  }

  // Sustain body section: extract steady-state slice
  // Steady state is between 25% and 85% of the raw note
  const susStart = Math.floor(corrected.length * 0.22);
  const susEnd = Math.floor(corrected.length * 0.88);
  const susSlice = corrected.subarray(susStart, susEnd);
  const susLen = susSlice.length;

  // Crossfade length for looping: 150ms
  const xfadeLen = Math.floor(rate * 0.15);

  // Fill loop section by looping susSlice with equal-power crossfading
  let srcPos = 0;
  for (let i = loopStartIdx; i < totalLen; i++) {
    const cyclePos = (i - loopStartIdx) % (susLen - xfadeLen);
    
    if (cyclePos >= (susLen - 2 * xfadeLen)) {
      // In crossfade zone
      const t = (cyclePos - (susLen - 2 * xfadeLen)) / xfadeLen;
      const gain1 = Math.cos(t * Math.PI * 0.5);
      const gain2 = Math.sin(t * Math.PI * 0.5);
      const s1 = susSlice[cyclePos];
      const s2 = susSlice[cyclePos - (susLen - 2 * xfadeLen)];
      out[i] = s1 * gain1 + s2 * gain2;
    } else {
      out[i] = susSlice[cyclePos];
    }

    // Gentle release fade-out at the very end (last 0.2s)
    if (i >= loopEndIdx) {
      const relPos = (i - loopEndIdx) / (totalLen - loopEndIdx);
      const relEnv = Math.cos(relPos * Math.PI * 0.5);
      out[i] *= relEnv;
    }
  }

  // Peak normalize to 0.89 (-1.0 dBFS)
  let maxAmp = 0;
  for (let i = 0; i < out.length; i++) {
    const a = Math.abs(out[i]);
    if (a > maxAmp) maxAmp = a;
  }
  if (maxAmp > 0.001) {
    const scale = 0.89 / maxAmp;
    for (let i = 0; i < out.length; i++) out[i] *= scale;
  }

  return {
    samples: out,
    loopStart: 0.35,
    loopEnd: 2.15,
    duration: targetDurationSec
  };
}

function writeWav(filePath, samples, sampleRate) {
  const numChannels = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitDepth, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intVal = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.floor(intVal), offset);
    offset += 2;
  }
  fs.writeFileSync(filePath, buffer);
}

// Execute processing for all notes
const manifest = {};
const processedSamples = {};

console.log("=== Extracting and Processing Aditya Flute Master Samples ===");

for (const n of notes) {
  const iS = Math.max(0, Math.floor((n.start - 0.04) * rate));
  const iE = Math.min(rawSamples.length, Math.floor((n.end + 0.04) * rate));
  const rawSlice = rawSamples.subarray(iS, iE);

  // Pitch centering ratio
  const ratio = n.targetFreq / n.measuredFreq;
  const cents = (1200 * Math.log2(ratio)).toFixed(1);

  const res = buildSeamlessUniformSample(rawSlice, ratio, 2.50);
  processedSamples[n.id] = res;

  const fileName = `${n.id}.wav`;
  const filePath = path.join(outDir, fileName);
  writeWav(filePath, res.samples, rate);

  manifest[n.id] = {
    file: `audio/samples/${fileName}`,
    name: n.name,
    basePitch: n.targetFreq,
    loopStart: res.loopStart,
    loopEnd: res.loopEnd,
    duration: res.duration,
    source: "Aditya Original GarageBand Master (C# Flute)"
  };

  console.log(`✅ Note [${n.id}]: ${n.name} -> ${fileName} (Pitch tuned ${cents > 0 ? "+" : ""}${cents}c to ${n.targetFreq.toFixed(1)}Hz, 2.50s uniform)`);
}

// Generate missing lower octave notes: bass_sa, bass_ri, bass_ga (from user Sa, Ri, Ga shifted down 1 octave)
const lowerMissing = [
  { id: "bass_sa", baseId: "sa", name: "Mandra Sa", targetFreq: 277.18 },
  { id: "bass_ri", baseId: "ri", name: "Mandra Ri", targetFreq: 311.13 },
  { id: "bass_ga", baseId: "ga", name: "Mandra Ga", targetFreq: 349.23 }
];

for (const m of lowerMissing) {
  const baseRes = processedSamples[m.baseId];
  // Shift down by 1 octave: resample with ratio 0.5
  const downSamples = resample(baseRes.samples, 0.5);
  // Cut to uniform 2.50s
  const uniformDown = new Float32Array(Math.floor(2.50 * rate));
  for (let i = 0; i < uniformDown.length; i++) uniformDown[i] = downSamples[i] || 0;

  const fileName = `${m.id}.wav`;
  const filePath = path.join(outDir, fileName);
  writeWav(filePath, uniformDown, rate);

  manifest[m.id] = {
    file: `audio/samples/${fileName}`,
    name: m.name,
    basePitch: m.targetFreq,
    loopStart: 0.35,
    loopEnd: 2.15,
    duration: 2.50,
    source: "Aditya Original GarageBand Master (Mandra Octave Shift)"
  };

  console.log(`✅ Note [${m.id}]: ${m.name} -> ${fileName} (Generated from Aditya ${m.baseId} down 1 octave, ${m.targetFreq.toFixed(1)}Hz)`);
}

// Generate missing higher octave notes: pa_high, dha_high, ni_high
const higherMissing = [
  { id: "pa_high",  baseId: "pa",  name: "Tara Pa",  targetFreq: 1661.22 },
  { id: "dha_high", baseId: "dha", name: "Tara Da",  targetFreq: 1864.66 },
  { id: "ni_high",  baseId: "ni",  name: "Tara Ni",  targetFreq: 2093.00 }
];

for (const m of higherMissing) {
  const baseRes = processedSamples[m.baseId];
  const upSamples = resample(baseRes.samples, 2.0);
  const uniformUp = new Float32Array(Math.floor(2.50 * rate));
  for (let i = 0; i < uniformUp.length; i++) uniformUp[i] = upSamples[i] || 0;

  const fileName = `${m.id}.wav`;
  const filePath = path.join(outDir, fileName);
  writeWav(filePath, uniformUp, rate);

  manifest[m.id] = {
    file: `audio/samples/${fileName}`,
    name: m.name,
    basePitch: m.targetFreq,
    loopStart: 0.35,
    loopEnd: 2.15,
    duration: 2.50,
    source: "Aditya Original GarageBand Master (Tara Octave Shift)"
  };

  console.log(`✅ Note [${m.id}]: ${m.name} -> ${fileName} (Generated from Aditya ${m.baseId} up 1 octave, ${m.targetFreq.toFixed(1)}Hz)`);
}

// Write manifest.json
const manifestPath = path.join(outDir, "manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
console.log(`\n🎉 Generated manifest.json with ${Object.keys(manifest).length} sample definitions.`);
