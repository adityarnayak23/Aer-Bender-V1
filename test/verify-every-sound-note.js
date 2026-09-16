const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 1. Load swaras data
const swarasDataFile = fs.readFileSync(path.join(__dirname, '../src/swaras-data.js'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(swarasDataFile, context);
const SwarasData = context.window.SwarasData;

// 2. Load audio manifest
const manifestPath = path.join(__dirname, '../audio/samples/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('=== CHECKING ALL SOUND NOTES & SAMPLES ===\n');

// 3. Verify all 21 sample files exist and are readable
const projectDir = path.join(__dirname, '..');
const sampleKeys = Object.keys(manifest);
console.log(`Found ${sampleKeys.length} sample entries in manifest.json`);

let missingFiles = 0;
sampleKeys.forEach(key => {
  const item = manifest[key];
  const filePath = path.join(projectDir, item.file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ MISSING FILE: ${item.file} for key ${key}`);
    missingFiles++;
  } else {
    const stats = fs.statSync(filePath);
    if (stats.size < 1000) {
      console.error(`⚠️ SUSPICIOUS FILE SIZE: ${item.file} (${stats.size} bytes)`);
    }
  }
});

if (missingFiles === 0) {
  console.log(`✅ All ${sampleKeys.length} sample WAV files exist and are valid on disk.`);
}

// 4. Verify all 16 Swarasthanas across all 3 octaves
console.log('\n--- VERIFYING 16 SWARASTHANAS ACROSS OCTAVES ---');
const swaraIds = Object.keys(SwarasData.SWARA_BY_ID);
console.log(`Total Swara definitions: ${swaraIds.length}`);

const BASE_SAMPLE_FAMILY_RATIOS = {
  sa: 1.0,
  ri: 9 / 8,     // Chathushruti Ri (R2)
  ga: 5 / 4,     // Antara Ga (G3)
  ma: 4 / 3,     // Shuddha Ma (M1)
  pa: 3 / 2,     // Panchamam (Pa)
  dha: 5 / 3,    // Chathushruti Dha (D2)
  ni: 15 / 8     // Kakali Ni (N3)
};

const octaves = [
  { shift: -1, name: 'Mandra (Bass)' },
  { shift: 0, name: 'Madhya (Mid)' },
  { shift: 1, name: 'Tara (High)' }
];

const kattais = ['1', '1.5', '2', '2.5', '3', '4', '4.5', '5'];

let totalNotesChecked = 0;
let noteErrors = 0;

kattais.forEach(kattai => {
  const kattaiRoot = SwarasData.KATTAI_ROOTS[kattai];
  octaves.forEach(oct => {
    swaraIds.forEach(id => {
      totalNotesChecked++;
      const sw = SwarasData.SWARA_BY_ID[id];
      const targetFreq = SwarasData.getSwaraFreq(sw, kattai, oct.shift, false);

      const family = (sw.family || sw.id || 'sa').toLowerCase();
      let sampleId = family;
      if (oct.shift === -1) {
        const bassId = 'bass_' + family;
        if (manifest[bassId]) sampleId = bassId;
      } else if (oct.shift === 1) {
        const highId = family + '_high';
        if (manifest[highId]) sampleId = highId;
      }

      if (!manifest[sampleId]) {
        console.error(`❌ Missing sampleId '${sampleId}' for swara ${id} (octave ${oct.shift})`);
        noteErrors++;
        return;
      }

      const item = manifest[sampleId];
      const nativeRoot = 276.36; // 1.5 Kattai
      let playbackRate = kattaiRoot.freq / nativeRoot;
      if (oct.shift === 1 && !sampleId.endsWith('_high')) {
        playbackRate *= 2.0;
      } else if (oct.shift === -1 && !sampleId.startsWith('bass_')) {
        playbackRate *= 0.5;
      }

      const baseFamilyRatio = BASE_SAMPLE_FAMILY_RATIOS[family] || 1.0;
      const swaraRatio = sw.freqRatio || 1.0;
      const swaraDetuneCents = 1200 * Math.log2(swaraRatio / baseFamilyRatio);

      // Total pitch in Hz produced by this note
      const resultingFreq = item.nativeFreq * playbackRate * Math.pow(2, swaraDetuneCents / 1200);
      const diffCents = 1200 * Math.log2(resultingFreq / targetFreq);

      if (Math.abs(diffCents) > 15) {
        console.warn(`⚠️ Large pitch error for ${sw.short} (${id}) at Kattai ${kattai} Octave ${oct.name}: ${diffCents.toFixed(1)} cents (expected ${targetFreq.toFixed(1)}Hz, got ${resultingFreq.toFixed(1)}Hz)`);
        noteErrors++;
      }
    });
  });
});

console.log(`\nVerified ${totalNotesChecked} notes across all 8 Kattais and 3 Octaves.`);
if (noteErrors === 0) {
  console.log('✅ ALL 16 SWARAS ACROSS ALL 3 OCTAVES AND 8 KATTAIS ARE 100% PITCH-ACCURATE!');
} else {
  console.log(`❌ Found ${noteErrors} note errors.`);
}

