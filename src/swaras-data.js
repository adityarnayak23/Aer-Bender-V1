// Carnatic Music Theory & Swara Fingering Engine for Air Flute
// Implements 16 Carnatic Swarasthanas (12 semitone swarasthanas),
// authentic 72-Melakarta Raga Builder, and dynamic scale filtering.

const KATTAI_ROOTS = {
  '1': { name: '1 Kattai (C)', note: 'C4', freq: 261.63 },
  '1.5': { name: '1.5 Kattai (C#)', note: 'C#4', freq: 276.36 },
  '2': { name: '2 Kattai (D)', note: 'D4', freq: 293.66 },
  '2.5': { name: '2.5 Kattai (D#)', note: 'D#4', freq: 311.13 },
  '3': { name: '3 Kattai (E)', note: 'E4', freq: 329.63 },
  '4': { name: '4 Kattai (F)', note: 'F4', freq: 349.23 },
  '4.5': { name: '4.5 Kattai (F#)', note: 'F#4', freq: 369.99 },
  '5': { name: '5 Kattai (G)', note: 'G4', freq: 392.00 }
};

// -------------------------------------------------------------------------
// 🎶 THE 16 CARNATIC SWARASTHANAS
// -------------------------------------------------------------------------
// Every octave contains 12 pitch positions (swarasthanas) forming 16 swara names:
// 1. Shadjam (Sa) - Achala (Fixed)
// 2. Shuddha Rishabham (R1), Chathushruti Rishabham (R2), Shatshruti Rishabham (R3)
// 3. Shuddha Gandharam (G1=R2), Sadharana Gandharam (G2=R3), Antara Gandharam (G3)
// 4. Shuddha Madhyamam (M1), Prati Madhyamam (M2)
// 5. Panchamam (Pa) - Achala (Fixed)
// 6. Shuddha Dhaivatam (D1), Chathushruti Dhaivatam (D2), Shatshruti Dhaivatam (D3)
// 7. Shuddha Nishadham (N1=D2), Kaisiki Nishadham (N2=D3), Kakali Nishadham (N3)
const CARNATIC_16_SWARASTHANAS = [
  {
    id: 'sa',
    family: 'sa',
    varietyIndex: 0,
    swara: 'Sa',
    name: 'Shadjam',
    short: 'S',
    sanskrit: 'स',
    tamil: 'ஸ',
    western: 'C',
    freqRatio: 1.0, // 0 cents
    cents: 0,
    pattern: [true, true, false, false, false, false, false],
    ruleDescription: 'First 2 close (L1 & L2 closed)',
    color: '#38bdf8'
  },
  {
    id: 'ri1',
    family: 'ri',
    varietyIndex: 1,
    swara: 'Shuddha Ri',
    name: 'Shuddha Rishabham',
    short: 'R₁',
    sanskrit: 'शुद्ध रि',
    tamil: 'சுத்த ரி',
    western: 'C# / Db',
    freqRatio: 16 / 15, // 1.0667, +112 cents
    cents: 112,
    pattern: ['half', false, false, false, false, false, false],
    ruleDescription: 'L1 half-closed (or slight finger curl)',
    color: '#14b8a6'
  },
  {
    id: 'ri2',
    family: 'ri',
    varietyIndex: 2,
    swara: 'Chathushruti Ri',
    name: 'Chathushruti Rishabham',
    short: 'R₂',
    sanskrit: 'चतुःश्रुति रि',
    tamil: 'சதுஸ்ருதி ரி',
    western: 'D',
    freqRatio: 9 / 8, // 1.1250, +204 cents
    cents: 204,
    pattern: [true, false, false, false, false, false, false],
    ruleDescription: 'L1 fully closed (Index only closed)',
    color: '#2dd4bf'
  },
  {
    id: 'ri3',
    family: 'ri',
    varietyIndex: 3,
    swara: 'Shatshruti Ri',
    name: 'Shatshruti Rishabham',
    short: 'R₃',
    sanskrit: 'षट्श्रुति रि',
    tamil: 'ஷட்ஸ்ருதி ரி',
    western: 'D# / Eb',
    freqRatio: 6 / 5, // 1.2000, +316 cents
    cents: 316,
    pattern: [true, 'half', false, false, false, false, false],
    ruleDescription: 'L1 closed, L2 half-closed',
    color: '#0d9488'
  },
  {
    id: 'ga1',
    family: 'ga',
    varietyIndex: 1,
    swara: 'Shuddha Ga',
    name: 'Shuddha Gandharam',
    short: 'G₁',
    sanskrit: 'शुद्ध ग',
    tamil: 'சுத்த க',
    western: 'D',
    freqRatio: 9 / 8, // 1.1250, +204 cents (enharmonic with R2)
    cents: 204,
    pattern: [true, false, false, false, false, false, false],
    ruleDescription: 'L1 closed (enharmonic with R₂)',
    color: '#22c55e'
  },
  {
    id: 'ga2',
    family: 'ga',
    varietyIndex: 2,
    swara: 'Sadharana Ga',
    name: 'Sadharana Gandharam',
    short: 'G₂',
    sanskrit: 'साधारण ग',
    tamil: 'சாதாரண க',
    western: 'D# / Eb',
    freqRatio: 6 / 5, // 1.2000, +316 cents (enharmonic with R3)
    cents: 316,
    pattern: [false, 'half', false, false, false, false, false],
    ruleDescription: 'L2 half-closed (or slight curl)',
    color: '#10b981'
  },
  {
    id: 'ga3',
    family: 'ga',
    varietyIndex: 3,
    swara: 'Antara Ga',
    name: 'Antara Gandharam',
    short: 'G₃',
    sanskrit: 'अन्तर ग',
    tamil: 'அந்தர க',
    western: 'E',
    freqRatio: 5 / 4, // 1.2500, +386 cents
    cents: 386,
    pattern: [false, false, false, false, false, false, false],
    ruleDescription: 'All open',
    color: '#4ade80'
  },
  {
    id: 'ma1',
    family: 'ma',
    varietyIndex: 1,
    swara: 'Shuddha Ma',
    name: 'Shuddha Madhyamam',
    short: 'M₁',
    sanskrit: 'शुद्ध म',
    tamil: 'சுத்த ம',
    western: 'F',
    freqRatio: 4 / 3, // 1.3333, +498 cents
    cents: 498,
    pattern: [false, true, true, true, true, true, true],
    ruleDescription: 'All closed (or L1 open)',
    color: '#facc15'
  },
  {
    id: 'ma2',
    family: 'ma',
    varietyIndex: 2,
    swara: 'Prati Ma',
    name: 'Prati Madhyamam',
    short: 'M₂',
    sanskrit: 'प्रति म',
    tamil: 'பிரதி ம',
    western: 'F#',
    freqRatio: 45 / 32, // 1.4063, +590 cents
    cents: 590,
    pattern: [true, true, true, 'half', false, false, false],
    ruleDescription: 'Left all closed, R1 half-closed',
    color: '#eab308'
  },
  {
    id: 'pa',
    family: 'pa',
    varietyIndex: 0,
    swara: 'Pa',
    name: 'Panchamam',
    short: 'P',
    sanskrit: 'प',
    tamil: 'ப',
    western: 'G',
    freqRatio: 3 / 2, // 1.5000, +702 cents
    cents: 702,
    pattern: [true, true, true, true, true, false, false],
    ruleDescription: 'All close, right small & ring open',
    color: '#fb923c'
  },
  {
    id: 'dha1',
    family: 'dha',
    varietyIndex: 1,
    swara: 'Shuddha Dha',
    name: 'Shuddha Dhaivatam',
    short: 'D₁',
    sanskrit: 'शुद्ध ध',
    tamil: 'சுத்த த',
    western: 'G# / Ab',
    freqRatio: 8 / 5, // 1.6000, +814 cents
    cents: 814,
    pattern: [true, true, true, 'half', false, false, false],
    ruleDescription: 'Left all closed, R1 half-closed',
    color: '#f43f5e'
  },
  {
    id: 'dha2',
    family: 'dha',
    varietyIndex: 2,
    swara: 'Chathushruti Dha',
    name: 'Chathushruti Dhaivatam',
    short: 'D₂',
    sanskrit: 'चतुःश्रुति ध',
    tamil: 'சதுஸ்ருதி த',
    western: 'A',
    freqRatio: 5 / 3, // 1.6667, +906 cents
    cents: 906,
    pattern: [true, true, true, true, false, false, false],
    ruleDescription: 'Left all closed, R1 closed',
    color: '#f472b6'
  },
  {
    id: 'dha3',
    family: 'dha',
    varietyIndex: 3,
    swara: 'Shatshruti Dha',
    name: 'Shatshruti Dhaivatam',
    short: 'D₃',
    sanskrit: 'षट्श्रुति ध',
    tamil: 'ஷட்ஸ்ருதி த',
    western: 'A# / Bb',
    freqRatio: 9 / 5, // 1.8000, +996 cents
    cents: 996,
    pattern: [true, true, true, true, 'half', false, false],
    ruleDescription: 'Left all closed, R1 closed, R2 half-closed',
    color: '#e11d48'
  },
  {
    id: 'ni1',
    family: 'ni',
    varietyIndex: 1,
    swara: 'Shuddha Ni',
    name: 'Shuddha Nishadham',
    short: 'N₁',
    sanskrit: 'शुद्ध नि',
    tamil: 'சுத்த நி',
    western: 'A',
    freqRatio: 5 / 3, // 1.6667, +906 cents (enharmonic with D2)
    cents: 906,
    pattern: [true, true, true, true, false, false, false],
    ruleDescription: 'Left all closed, R1 closed (enharmonic with D₂)',
    color: '#a855f7'
  },
  {
    id: 'ni2',
    family: 'ni',
    varietyIndex: 2,
    swara: 'Kaisiki Ni',
    name: 'Kaisiki Nishadham',
    short: 'N₂',
    sanskrit: 'कैशिकी नि',
    tamil: 'கைசிகி நி',
    western: 'A# / Bb',
    freqRatio: 16 / 9, // 1.7778, +996 cents
    cents: 996,
    pattern: [true, true, 'half', false, false, false, false],
    ruleDescription: 'L1 & L2 closed, L3 half-closed',
    color: '#8b5cf6'
  },
  {
    id: 'ni3',
    family: 'ni',
    varietyIndex: 3,
    swara: 'Kakali Ni',
    name: 'Kakali Nishadham',
    short: 'N₃',
    sanskrit: 'काकली नि',
    tamil: 'காகலி நி',
    western: 'B',
    freqRatio: 15 / 8, // 1.8750, +1088 cents
    cents: 1088,
    pattern: [true, true, true, false, false, false, false],
    ruleDescription: 'Left all close (Right all open)',
    color: '#818cf8'
  }
];

// Quick index lookup
const SWARA_BY_ID = {};
CARNATIC_16_SWARASTHANAS.forEach(sw => {
  SWARA_BY_ID[sw.id] = sw;
});

// -------------------------------------------------------------------------
// 🎼 POPULAR CARNATIC RAGAMS
// -------------------------------------------------------------------------
const CARNATIC_RAGAS = [
  {
    id: 'mayamalavagowla',
    name: 'Mayamalavagowla',
    description: '15th Melakarta • Fundamental Carnatic Abhyasa Raga',
    swaras: ['sa', 'ri1', 'ga3', 'ma1', 'pa', 'dha1', 'ni3'],
    arohana: 'S R₁ G₃ M₁ P D₁ N₃ Ṡ',
    avarohana: 'Ṡ N₃ D₁ P M₁ G₃ R₁ S'
  },
  {
    id: 'shankarabharanam',
    name: 'Dheerasankarabharanam',
    description: '29th Melakarta • Major Scale (Bilawal)',
    swaras: ['sa', 'ri2', 'ga3', 'ma1', 'pa', 'dha2', 'ni3'],
    arohana: 'S R₂ G₃ M₁ P D₂ N₃ Ṡ',
    avarohana: 'Ṡ N₃ D₂ P M₁ G₃ R₂ S'
  },
  {
    id: 'kalyani',
    name: 'Mechakalyani',
    description: '65th Melakarta • Lydian mode with Prati Madhyamam (M₂)',
    swaras: ['sa', 'ri2', 'ga3', 'ma2', 'pa', 'dha2', 'ni3'],
    arohana: 'S R₂ G₃ M₂ P D₂ N₃ Ṡ',
    avarohana: 'Ṡ N₃ D₂ P M₂ G₃ R₂ S'
  },
  {
    id: 'kharaharapriya',
    name: 'Kharaharapriya',
    description: '22nd Melakarta • Dorian mode with Sadharana Ga & Kaisiki Ni',
    swaras: ['sa', 'ri2', 'ga2', 'ma1', 'pa', 'dha2', 'ni2'],
    arohana: 'S R₂ G₂ M₁ P D₂ N₂ Ṡ',
    avarohana: 'Ṡ N₂ D₂ P M₁ G₂ R₂ S'
  },
  {
    id: 'todi',
    name: 'Hanumatodi',
    description: '8th Melakarta • S R₁ G₂ M₁ P D₁ N₂',
    swaras: ['sa', 'ri1', 'ga2', 'ma1', 'pa', 'dha1', 'ni2'],
    arohana: 'S R₁ G₂ M₁ P D₁ N₂ Ṡ',
    avarohana: 'Ṡ N₂ D₁ P M₁ G₂ R₁ S'
  },
  {
    id: 'mohanam',
    name: 'Mohanam',
    description: 'Audava (Pentatonic) • S R₂ G₃ P D₂',
    swaras: ['sa', 'ri2', 'ga3', 'pa', 'dha2'],
    arohana: 'S R₂ G₃ P D₂ Ṡ',
    avarohana: 'Ṡ D₂ P G₃ R₂ S'
  },
  {
    id: 'hamsadhwani',
    name: 'Hamsadhwani',
    description: 'Audava (Pentatonic) • S R₂ G₃ P N₃',
    swaras: ['sa', 'ri2', 'ga3', 'pa', 'ni3'],
    arohana: 'S R₂ G₃ P N₃ Ṡ',
    avarohana: 'Ṡ N₃ P G₃ R₂ S'
  },
  {
    id: 'hindolam',
    name: 'Hindolam',
    description: 'Audava (Pentatonic) • S G₂ M₁ D₁ N₂',
    swaras: ['sa', 'ga2', 'ma1', 'dha1', 'ni2'],
    arohana: 'S G₂ M₁ D₁ N₂ Ṡ',
    avarohana: 'Ṡ N₂ D₁ M₁ G₂ S'
  },
  {
    id: 'custom',
    name: 'Custom Raga',
    description: 'User Selected Swarasthanas',
    swaras: ['sa', 'ri2', 'ga3', 'ma1', 'pa', 'dha2', 'ni3'],
    arohana: 'Custom',
    avarohana: 'Custom'
  }
];

const RAGA_BY_ID = {};
CARNATIC_RAGAS.forEach(r => {
  RAGA_BY_ID[r.id] = r;
  CARNATIC_RAGAS[r.id] = r;
});
if (RAGA_BY_ID['todi']) {
  RAGA_BY_ID['hanumatodi'] = RAGA_BY_ID['todi'];
  CARNATIC_RAGAS['hanumatodi'] = RAGA_BY_ID['todi'];
}

// Default 7 swaras for Shankarabharanam (Major Scale) & backward compatibility
const CARNATIC_SWARAS = [
  {
    ...SWARA_BY_ID['sa'],
    id: 'sa',
    variety: 'sa',
    swara: 'Sa'
  },
  {
    ...SWARA_BY_ID['ri2'],
    id: 'ri',
    variety: 'ri2',
    swara: 'Ri'
  },
  {
    ...SWARA_BY_ID['ga3'],
    id: 'ga',
    variety: 'ga3',
    swara: 'Ga'
  },
  {
    ...SWARA_BY_ID['ma1'],
    id: 'ma',
    variety: 'ma1',
    swara: 'Ma'
  },
  {
    ...SWARA_BY_ID['pa'],
    id: 'pa',
    variety: 'pa',
    swara: 'Pa'
  },
  {
    ...SWARA_BY_ID['dha2'],
    id: 'dha',
    variety: 'dha2',
    swara: 'Dha'
  },
  {
    ...SWARA_BY_ID['ni3'],
    id: 'ni',
    variety: 'ni3',
    swara: 'Ni'
  }
];

// Distance metric between 7-hole finger states (supports true, false, 'half')
function patternDistance(p1, p2) {
  let diff = 0;
  for (let i = 0; i < 7; i++) {
    const val1 = p1[i] === true ? 1.0 : (p1[i] === 'half' ? 0.5 : 0.0);
    const val2 = p2[i] === true ? 1.0 : (p2[i] === 'half' ? 0.5 : 0.0);
    diff += Math.abs(val1 - val2);
  }
  return diff;
}

// =========================================================================
// 🎯 SWARA MATCHING WITH ACTIVE RAGA CONSTRAINTS
// =========================================================================
// Matches 7 holes to the closest valid swara. If allowedSwaraIds is given,
// matching is strictly constrained to the user's selected Raga notes!
function matchSwara(fingerStates, previousSwaraId = null, allowedSwaraIds = null) {
  if (!fingerStates || fingerStates.length !== 7) return null;

  // Candidate pool: either the user's active Raga swaras, or default 7 swaras
  let candidates = CARNATIC_SWARAS;
  if (allowedSwaraIds && Array.isArray(allowedSwaraIds) && allowedSwaraIds.length > 0) {
    const filtered = allowedSwaraIds.map(id => SWARA_BY_ID[id]).filter(Boolean);
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }

  // 1. Exact Pattern Match within candidates
  for (const sw of candidates) {
    if (patternDistance(fingerStates, sw.pattern) === 0) {
      return { swara: sw, exact: true, distance: 0 };
    }
  }

  // 2. All-Closed is MA (Carnatic Venu rule: all closed is Ma)
  const closedCount = fingerStates.filter(v => v === true || v === 'half').length;
  if (closedCount === 7 || (fingerStates[0] && fingerStates[1] && fingerStates[2] && fingerStates[3] && fingerStates[4] && fingerStates[5])) {
    const maCandidate = candidates.find(s => s.family === 'ma') || SWARA_BY_ID['ma1'];
    if (maCandidate && candidates.includes(maCandidate)) {
      return { swara: maCandidate, exact: true, distance: 0 };
    }
  }

  // 3. Authentic Standing Wave Rules for Open Holes:
  // "when finger is not curled - or is open, then there is no role for that in the note playing - so remove any noise if it is coming from there"
  // - First hole (L1) open => Ga (all open)
  if (!fingerStates[0]) {
    const gaCandidate = candidates.find(s => s.family === 'ga') || SWARA_BY_ID['ga3'];
    if (gaCandidate && candidates.includes(gaCandidate)) {
      return { swara: gaCandidate, exact: true, distance: 0 };
    }
  }

  // - L1 closed, L2 open => Ri
  if (fingerStates[0] && !fingerStates[1]) {
    const riCandidate = candidates.find(s => s.family === 'ri') || SWARA_BY_ID['ri2'];
    if (riCandidate && candidates.includes(riCandidate)) {
      return { swara: riCandidate, exact: true, distance: 0 };
    }
  }

  // - L1 & L2 closed, L3 open => Sa
  if (fingerStates[0] && fingerStates[1] && !fingerStates[2]) {
    const saCandidate = candidates.find(s => s.id === 'sa') || SWARA_BY_ID['sa'];
    if (saCandidate && candidates.includes(saCandidate)) {
      return { swara: saCandidate, exact: true, distance: 0 };
    }
  }

  // - Left hand all closed: sound radiates from right hand
  if (Boolean(fingerStates[0]) && Boolean(fingerStates[1]) && Boolean(fingerStates[2])) {
    const wasNi = previousSwaraId && (previousSwaraId === 'ni' || previousSwaraId.startsWith('ni'));
    const r1Closed = Boolean(fingerStates[3]);
    if (!r1Closed) {
      const niCandidate = candidates.find(s => s.family === 'ni') || SWARA_BY_ID['ni3'];
      if (niCandidate && candidates.includes(niCandidate)) {
        return { swara: niCandidate, exact: true, distance: 0 };
      }
    } else if (!fingerStates[4]) {
      const dhaCandidate = candidates.find(s => s.family === 'dha') || SWARA_BY_ID['dha2'];
      if (dhaCandidate && candidates.includes(dhaCandidate)) {
        return { swara: dhaCandidate, exact: true, distance: 0 };
      }
    } else if (!fingerStates[5]) {
      const paCandidate = candidates.find(s => s.id === 'pa') || SWARA_BY_ID['pa'];
      if (paCandidate && candidates.includes(paCandidate)) {
        return { swara: paCandidate, exact: true, distance: 0 };
      }
    } else {
      const maCandidate = candidates.find(s => s.family === 'ma') || SWARA_BY_ID['ma1'];
      if (maCandidate && candidates.includes(maCandidate)) {
        return { swara: maCandidate, exact: true, distance: 0 };
      }
    }
  }

  // 4. Constrained Nearest Match with Hysteresis
  let bestSwara = candidates[0];
  let minDiff = 999;

  for (const sw of candidates) {
    let d = patternDistance(fingerStates, sw.pattern);

    // Hysteresis preference for previous note to prevent flutter
    if (previousSwaraId && (sw.id === previousSwaraId || sw.family === previousSwaraId)) {
      d -= 0.25;
    }

    if (d < minDiff) {
      minDiff = d;
      bestSwara = sw;
    }
  }

  return {
    swara: bestSwara,
    exact: false,
    distance: Math.ceil(minDiff)
  };
}

// Compute frequency in Hz
function getSwaraFreq(swaraObj, kattaiId = '1', octaveShift = 0, isOverblown = false) {
  const rootInfo = KATTAI_ROOTS[kattaiId] || KATTAI_ROOTS['1'];
  const baseFreq = rootInfo.freq;

  let multiplier = swaraObj.freqRatio || 1.0;
  if (isOverblown) {
    multiplier *= 2.0; // 1 octave up
  }
  if (octaveShift !== 0) {
    multiplier *= Math.pow(2, octaveShift);
  }

  return baseFreq * multiplier;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.SwarasData = {
    KATTAI_ROOTS,
    CARNATIC_16_SWARASTHANAS,
    CARNATIC_RAGAS,
    RAGA_BY_ID,
    CARNATIC_SWARAS,
    SWARA_BY_ID,
    patternDistance,
    matchSwara,
    getSwaraFreq
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    KATTAI_ROOTS,
    CARNATIC_16_SWARASTHANAS,
    CARNATIC_RAGAS,
    RAGA_BY_ID,
    CARNATIC_SWARAS,
    SWARA_BY_ID,
    patternDistance,
    matchSwara,
    getSwaraFreq
  };
}
