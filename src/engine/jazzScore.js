// A piano trio's book, written on the spot: pure (no Web Audio, no DOM), node-tested.
// Each tune is a set of chord changes (the trio's own: standard progressions, no one's melody),
// a key, a tempo and a form, and from those the three parts are generated:
//   bass   walking quarter notes: the root on one, chord tones through the bar, a chromatic step
//          into the next chord on four
//   drums  the swung ride pattern (ding, ding-a ding), the hi-hat foot on two and four, the kick
//          feathered, brushes comping on the snare, a small fill into each chorus
//   piano  the head: a two-bar motif fitted to each chord, played twice through; then a solo
//          chorus or two of swung eighths from the chord's scale, chord tones on the beat, phrases
//          that breathe; the left hand comps rootless voicings (Charleston, anticipations) under it
// Times are in beats from the start of the tune; the off-beat eighth is swung to two thirds.
export const SWING = 2 / 3;
const QUAL = {
  m7: { tones: [0, 3, 7, 10], scale: [0, 2, 3, 5, 7, 9, 10] },
  7: { tones: [0, 4, 7, 10], scale: [0, 2, 4, 5, 7, 9, 10] },
  maj7: { tones: [0, 4, 7, 11], scale: [0, 2, 4, 5, 7, 9, 11] },
  m7b5: { tones: [0, 3, 6, 10], scale: [0, 1, 3, 5, 6, 8, 10] },
  m6: { tones: [0, 3, 7, 9], scale: [0, 2, 3, 5, 7, 9, 11] },
};
// [root (semitones above the key's tonic), quality] per bar
export const BOOK = [
  { id: 'falling', title: 'Falling Leaves on Fuzhou Road', key: 7, bpm: [126, 150], changes: [[5, 'm7'], [10, '7'], [3, 'maj7'], [8, 'maj7'], [2, 'm7b5'], [7, '7'], [0, 'm6'], [0, 'm6']] },
  { id: 'blues', title: 'Bund Blues in F', key: 5, bpm: [132, 168], changes: [[0, '7'], [5, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [9, '7'], [2, 'm7'], [7, '7'], [0, '7'], [7, '7']] },
  { id: 'tide', title: 'Returning Tide', key: 0, bpm: [112, 136], changes: [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7'], [5, 'maj7'], [11, 'm7b5'], [4, '7'], [9, 'm7']] },
  { id: 'ferry', title: 'Last Ferry', key: 3, bpm: [150, 176], changes: [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7'], [4, 'm7'], [9, '7'], [2, 'm7'], [7, '7']] },
];

function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const swung = (beat, eighth) => beat + (eighth ? SWING : 0);
// nearest pitch to `near` among the pitch classes `pcs`, within [lo, hi]
function nearestPc(pcs, near, lo, hi) {
  let best = null, bd = 1e9;
  for (let m = lo; m <= hi; m++) if (pcs.includes(((m % 12) + 12) % 12)) { const d = Math.abs(m - near); if (d < bd) { bd = d; best = m; } }
  return best;
}

// -> { id, title, bpm, beats, bars, chorusBars, choruses, chordAt(beat), events: [{ t, part, midi?, notes?, vel, dur }] }
// parts: bass, ride, hat, kick, snare, comp (notes: a voicing), lead (the piano's right hand), end
export function makeTune(bookIndex, seed = 1, { choruses = 4 } = {}) {
  const r = rng(seed * 7919 + bookIndex * 104729), tune = BOOK[bookIndex % BOOK.length];
  const bpm = Math.round(tune.bpm[0] + r() * (tune.bpm[1] - tune.bpm[0]));
  const per = tune.changes.length <= 8 ? 2 : 1;                       // short changes go round twice a chorus
  const chorusBars = tune.changes.length * per, bars = chorusBars * choruses;
  const chordOfBar = (b) => { const [root, q] = tune.changes[b % tune.changes.length]; return { root: (tune.key + root) % 12, q, ...QUAL[q] }; };
  const ev = [];
  const push = (e) => ev.push(e);
  // ---- bass ----
  let prev = 36 + ((tune.key + tune.changes[0][0]) % 12);
  for (let b = 0; b < bars; b++) {
    const c = chordOfBar(b), n = chordOfBar(b + 1), t0 = b * 4;
    const root = nearestPc([c.root], prev, 33, 50);
    const pcs = c.tones.map((x) => (c.root + x) % 12);
    const second = nearestPc([pcs[pick(r, [1, 2])]], root + 4, 33, 55), third = nearestPc([pcs[pick(r, [2, 3, 1])]], second + (r() < 0.5 ? 3 : -3), 33, 55);
    const nextRoot = nearestPc([n.root], third, 34, 50), approach = nextRoot + (r() < 0.5 || nextRoot <= 34 ? 1 : -1);
    [root, second, third, approach].forEach((m, i) => push({ t: t0 + i, part: 'bass', midi: m, vel: i === 0 ? 0.9 : 0.75 + r() * 0.1, dur: 0.95 }));
    prev = approach;
  }
  // ---- drums ----
  const last = bars - 1;
  for (let b = 0; b < bars; b++) {
    const t0 = b * 4, fill = (b + 1) % chorusBars === 0 && b !== last;
    for (let i = 0; i < 4; i++) {
      push({ t: t0 + i, part: 'ride', vel: i % 2 ? 0.85 : 0.7, dur: 1 });
      if (i % 2 === 1) push({ t: swung(t0 + i, 1), part: 'ride', vel: 0.55, dur: 0.4 });          // the skip note
      if (i % 2 === 1) push({ t: t0 + i, part: 'hat', vel: 0.6, dur: 0.1 });
      push({ t: t0 + i, part: 'kick', vel: 0.22, dur: 0.2 });
      if (!fill && r() < 0.18) push({ t: swung(t0 + i, 1), part: 'snare', vel: 0.35 + r() * 0.2, dur: 0.2 });
    }
    if (fill) for (let i = 0; i < 6; i++) push({ t: t0 + 2 + i / 3, part: 'snare', vel: 0.45 + i * 0.07, dur: 0.15 });
  }
  // ---- piano: comping (left hand) under everything, the head, solos ----
  const voicing = (c, near = 60) => {
    const third = c.tones[1], seventh = c.tones[3], ninth = 14, fifth = c.tones[2];
    const top = [third, seventh, ninth].map((x) => (c.root + x) % 12);
    const lo = nearestPc([top[0]], near - 3, 52, 66);
    const notes = [lo]; for (const pc of [top[1], top[2], (c.root + fifth) % 12]) { let m = notes[notes.length - 1] + 1; while (((m % 12) + 12) % 12 !== pc) m++; notes.push(m); }
    return notes.slice(0, 3 + (r() < 0.5 ? 1 : 0));
  };
  for (let b = 0; b < bars; b++) {
    const c = chordOfBar(b), n = chordOfBar(b + 1), t0 = b * 4, pattern = r();
    if (pattern < 0.45) { push({ t: t0, part: 'comp', notes: voicing(c), vel: 0.55, dur: 0.6 }); push({ t: swung(t0 + 1, 1), part: 'comp', notes: voicing(c), vel: 0.5, dur: 0.5 }); }   // Charleston
    else if (pattern < 0.8) { push({ t: swung(t0 + 1, 1), part: 'comp', notes: voicing(c), vel: 0.5, dur: 0.8 }); if (b < last) push({ t: swung(t0 + 3, 1), part: 'comp', notes: voicing(n), vel: 0.55, dur: 1.2 }); }   // anticipating the next bar
    else push({ t: t0 + 2, part: 'comp', notes: voicing(c), vel: 0.45, dur: 1.4 });
  }
  // the head: a two-bar motif (rhythm + scale-degree contour), fitted to each chord
  const motif = [];
  { let deg = 4; for (let i = 0; i < 8; i++) { if (r() < 0.3 && i % 2) continue; motif.push({ at: i * 0.5 + (i % 2 ? SWING - 0.5 : 0), deg, len: r() < 0.3 ? 1 : 0.5 }); deg += pick(r, [-2, -1, 1, 2, 0, -1]); } }
  const headBars = new Set(), soloBars = new Set();
  for (let b = 0; b < bars; b++) { const ch = Math.floor(b / chorusBars); if (ch === 0 || ch === choruses - 1) headBars.add(b); else soloBars.add(b); }
  let lead = 72;
  for (let b = 0; b < bars; b += 2) {
    if (!headBars.has(b)) continue;
    for (const m of motif) {
      const bar = b + (m.at >= 4 ? 1 : 0), c = chordOfBar(bar), t = b * 4 + m.at;
      const pcs = c.scale.map((x) => (c.root + x) % 12), sorted = [...pcs].sort((a, b2) => a - b2);
      const pc = sorted[((m.deg % sorted.length) + sorted.length) % sorted.length];
      lead = nearestPc([pc], 70 + (m.deg % 7), 64, 82);
      push({ t, part: 'lead', midi: lead, vel: 0.7, dur: m.len * 0.95 });
    }
  }
  // solos: swung eighths in phrases of 2-4 bars with breaths between
  let phrase = 0, rest = 0;
  for (let b = 0; b < bars; b++) {
    if (!soloBars.has(b)) continue;
    const c = chordOfBar(b), pcs = c.scale.map((x) => (c.root + x) % 12), chordPcs = c.tones.map((x) => (c.root + x) % 12);
    for (let e = 0; e < 8; e++) {
      if (rest > 0) { rest -= 0.5; continue; }
      if (phrase <= 0) { phrase = 6 + Math.floor(r() * 10); rest = r() < 0.6 ? 1 + Math.floor(r() * 3) * 0.5 : 0; if (rest) continue; }
      phrase--;
      const strong = e % 2 === 0, set = strong && r() < 0.7 ? chordPcs : pcs;
      const step = pick(r, [-2, -1, -1, 1, 1, 2, 3, -3]), want = lead + step;
      lead = nearestPc(set, want, 62, 86);
      if (r() < 0.12) continue;                                                       // a ghosted note
      push({ t: swung(b * 4 + Math.floor(e / 2), e % 2), part: 'lead', midi: lead, vel: strong ? 0.75 : 0.55, dur: 0.45 });
    }
  }
  // the ending: everyone on the tonic chord, held
  const endT = bars * 4, home = { root: tune.key % 12, ...QUAL[tune.changes[0][1] === 'm7' ? 'm6' : 'maj7'] };
  push({ t: endT, part: 'bass', midi: nearestPc([home.root], 40, 33, 48), vel: 0.9, dur: 3 });
  push({ t: endT, part: 'comp', notes: voicing(home, 62), vel: 0.6, dur: 3.5 });
  push({ t: endT, part: 'lead', midi: nearestPc([home.root], 74, 70, 84), vel: 0.6, dur: 3.5 });
  push({ t: endT, part: 'ride', vel: 0.9, dur: 3 });
  push({ t: endT + 4, part: 'end', vel: 0, dur: 0 });
  ev.sort((a, b2) => a.t - b2.t);
  return {
    id: tune.id, title: tune.title, bpm, bars, chorusBars, choruses, beats: endT + 4, events: ev,
    chordAt: (beat) => chordOfBar(Math.min(bars - 1, Math.floor(beat / 4))),
  };
}
export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
