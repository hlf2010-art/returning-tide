// How a line is said: pure, node-tested. Browser speech synthesis reads a whole sentence at one
// flat rate and pitch, which is what makes TTS sound like TTS. Speaking it phrase by phrase, with
// the pauses people actually leave, lifts on questions, a slower tail when trailing off, a quicker
// clip on an exclamation, and a little drift so no two phrases match, gets much closer to talk.
// It also marks where a listener would naturally drop in a "嗯" / "对" (a back-channel).
export const PAUSE = {
  '，': [0.16, 0.3], ',': [0.16, 0.3], '、': [0.1, 0.18], '：': [0.22, 0.34],
  '。': [0.34, 0.55], '.': [0.34, 0.55], '？': [0.38, 0.6], '?': [0.38, 0.6], '！': [0.3, 0.45], '!': [0.3, 0.45],
  '……': [0.55, 0.9], '…': [0.45, 0.75], '——': [0.08, 0.16], '；': [0.26, 0.4],
};
const SPLIT = /(……|——|[，,、：。.？?！!…；])/;

// line: text; profile: { rate, pitch } of the speaker; mood: 'calm'|'warm'|'wry'|'annoyed'|'tired'
// returns [{ text, rate, pitch, pauseAfter (s), question, trailing, interrupted, backchannel }]
export function shape(text, profile = { rate: 1, pitch: 1 }, { mood = 'calm', rnd = Math.random } = {}) {
  const parts = text.split(SPLIT).filter((p) => p !== '');
  const phrases = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (SPLIT.test(p) && p.length <= 2 && PAUSE[p]) { if (phrases.length) phrases[phrases.length - 1].mark += p; continue; }
    phrases.push({ text: p, mark: '' });
  }
  const M = { calm: [1, 1], warm: [0.97, 1.03], wry: [1.02, 0.98], annoyed: [1.1, 1.06], tired: [0.9, 0.95] }[mood] || [1, 1];
  return phrases.map((ph, i) => {
    const mark = ph.mark, last = i === phrases.length - 1;
    const question = /[？?]/.test(mark), trailing = /…/.test(mark), interrupted = /——/.test(mark), exclaim = /[！!]/.test(mark);
    const [lo, hi] = PAUSE[mark.replace(/[。.]$/, '').slice(-2)] || PAUSE[mark.slice(-1)] || [0.12, 0.22];
    const drift = (rnd() - 0.5) * 0.08;
    // short phrases come out quicker; long ones settle; the last phrase of a statement falls a touch
    const lenK = ph.text.length <= 3 ? 1.06 : ph.text.length > 14 ? 0.97 : 1;
    const rate = profile.rate * M[0] * lenK * (trailing ? 0.88 : exclaim ? 1.08 : 1) * (1 + drift);
    const pitch = profile.pitch * M[1] * (question ? 1.1 : exclaim ? 1.06 : last && !question ? 0.96 : 1) * (1 - drift * 0.5);
    const pauseAfter = last ? 0 : lo + rnd() * (hi - lo);
    // a listener's "嗯" fits in a real pause after a statement-ish phrase, not after a question
    const backchannel = !last && !question && !interrupted && pauseAfter > 0.2 && ph.text.length >= 6;
    return { text: ph.text + mark.replace(/[，,、；：]$/, ''), rate, pitch, pauseAfter, question, trailing, interrupted, backchannel };
  });
}

// Pick a mood for a line from its words, when nobody has said otherwise.
export function moodOf(text) {
  if (/别说了|算了|烦|当心|看路|故意/.test(text)) return 'annoyed';
  if (/……/.test(text) && text.length < 18) return 'tired';
  if (/哈|嘛|呗|吧/.test(text)) return 'warm';
  return 'calm';
}
