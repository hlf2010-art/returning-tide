// Positional audio for recorded NPC dialogue clips (WebAudio PannerNode + distance attenuation),
// with a clearly labeled Mandarin Web Speech API (speechSynthesis) temporary fallback when
// recorded voice clips are unavailable.
import * as THREE from 'three';
import { computeDistanceGain } from './conversation.js';
import { shape, moodOf } from './delivery.js';

const SPEAKER_PROFILE = {
  lin: { pitch: 0.88, rate: 0.94, hints: ['yunxi', 'kangkang', 'yunjian', 'yunyang', 'danny', 'male', '男'] },
  su:  { pitch: 1.12, rate: 1.02, hints: ['tingting', 'xiaoxiao', 'xiaoyi', 'yaoyao', 'huihui', 'meijia', 'female', '女'] },
};

const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();

function isMandarinVoice(v) {
  const lang = (v.lang || '').toLowerCase();
  if (/^zh[-_]?cn/.test(lang) || /^cmn/.test(lang) || /^zh[-_]?sg/.test(lang)) return true;
  if (/^zh/.test(lang) && !/hk|mo|yue|hant/.test(lang)) return true;
  return false;
}

export function selectSpeakerVoices(voices) {
  const zh = voices.filter(isMandarinVoice);
  if (zh.length === 0) return { lin: null, su: null, zhCount: 0 };
  const match = (list, hints) => list.find((v) => hints.some((h) => v.name.toLowerCase().includes(h)));
  const lin = match(zh, SPEAKER_PROFILE.lin.hints) || zh[0];
  const remaining = zh.filter((v) => v !== lin);
  const su = match(remaining, SPEAKER_PROFILE.su.hints) || remaining[0] || match(zh, SPEAKER_PROFILE.su.hints) || zh[0];
  return { lin, su, zhCount: zh.length };
}

export function createDialogueAudio({
  audio,
  camera,
  getSpeakerPosition,
  refDistance = 2.5,
  maxDistance = 18.0,
  clips = {},
  clipFor = null,      // (line) => url of its recorded clip, or null (engine/voice.js)
  speakLive = null,    // (line, onEnd) => a live voice for lines with no clip (new, generated ones)
} = {}) {
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  let voices = { lin: null, su: null, zhCount: 0 };
  let voicesConfirmed = false;
  let ttsError = null;

  const bufferCache = new Map();
  let activeSource = null;
  let activePanner = null;
  let activeSpeakerId = null;
  let playToken = 0;
  let activeBackend = Object.keys(clips).length > 0 ? 'recorded' : (synth ? 'tts-fallback' : 'unavailable');
  let lastDist = Infinity;
  let lastGain = 0;
  let lastVolume = 0;
  let spokenCount = 0;
  let activeUtterance = null; // keep reference to avoid premature GC in Chromium/Safari

  function refreshVoices(fromEvent = false) {
    if (!synth) return;
    try {
      const list = synth.getVoices() || [];
      voices = selectSpeakerVoices(list);
      if (fromEvent || voices.zhCount > 0) voicesConfirmed = true;
    } catch {
      voices = { lin: null, su: null, zhCount: 0 };
    }
  }
  const onVoicesChanged = () => refreshVoices(true);
  if (synth) {
    refreshVoices(false);
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', onVoicesChanged);
  }

  function updateListener() {
    const ctx = audio.getContext();
    if (!ctx || !camera) return;
    const listener = ctx.listener;
    const t = ctx.currentTime;
    const p = camera.position;
    _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();

    if (listener.positionX) {
      listener.positionX.setValueAtTime(p.x, t);
      listener.positionY.setValueAtTime(p.y, t);
      listener.positionZ.setValueAtTime(p.z, t);
      listener.forwardX.setValueAtTime(_fwd.x, t);
      listener.forwardY.setValueAtTime(_fwd.y, t);
      listener.forwardZ.setValueAtTime(_fwd.z, t);
      listener.upX.setValueAtTime(_up.x, t);
      listener.upY.setValueAtTime(_up.y, t);
      listener.upZ.setValueAtTime(_up.z, t);
    } else if (listener.setPosition) {
      listener.setPosition(p.x, p.y, p.z);
      listener.setOrientation(_fwd.x, _fwd.y, _fwd.z, _up.x, _up.y, _up.z);
    }

    if (activePanner && activeSpeakerId) {
      const sp = getSpeakerPosition(activeSpeakerId);
      if (sp) {
        if (activePanner.positionX) {
          activePanner.positionX.setValueAtTime(sp.x, t);
          activePanner.positionY.setValueAtTime(sp.y, t);
          activePanner.positionZ.setValueAtTime(sp.z, t);
        } else if (activePanner.setPosition) {
          activePanner.setPosition(sp.x, sp.y, sp.z);
        }
      }
    }
  }

  function distanceToSpeaker(speakerId) {
    const sp = getSpeakerPosition(speakerId);
    if (!sp || !camera) return 0;
    return Math.hypot(sp.x - camera.position.x, sp.y - camera.position.y, sp.z - camera.position.z);
  }

  function stop() {
    playToken++;
    activeSpeakerId = null;
    if (activeSource) {
      try { activeSource.onended = null; activeSource.stop(); activeSource.disconnect(); } catch {}
      activeSource = null;
    }
    if (activePanner) {
      try { activePanner.disconnect(); } catch {}
      activePanner = null;
    }
    if (synth && (synth.speaking || synth.pending)) {
      try { synth.cancel(); } catch {}
    }
    activeUtterance = null;
  }

  const unsubMute = audio.onMute((muted) => {
    if (muted) stop();
  });

  async function loadClip(url, ctx) {
    if (bufferCache.has(url)) return bufferCache.get(url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Clip fetch failed: ${res.status}`);
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);
    bufferCache.set(url, buf);
    return buf;
  }

  function playWithSynthesis(line, dist, gain, myToken, onEnd) {
    if (!synth || typeof SpeechSynthesisUtterance !== 'function') {
      activeBackend = 'unavailable';
      return;
    }
    activeBackend = 'tts-fallback';
    if (audio.muted || gain <= 0.01) {
      lastVolume = 0;
      return;
    }
    if (voices.zhCount === 0) refreshVoices(false);
    voicesConfirmed = true;
    const prof = SPEAKER_PROFILE[line.speaker] || SPEAKER_PROFILE.lin;
    // Said phrase by phrase (engine/delivery.js): real pauses, a lift on questions, a slower tail
    // when trailing off, a little drift so no two phrases match. One utterance per phrase.
    const phrases = shape(line.text, prof, { mood: line.mood || moodOf(line.text) });
    spokenCount++;
    lastVolume = Math.max(0, Math.min(1, gain));
    let i = 0;
    const next = () => {
      if (playToken !== myToken) return;
      if (i >= phrases.length) { delivery.phrase = null; if (onEnd) onEnd(); return; }
      const ph = phrases[i++];
      delivery.phrase = ph; delivery.pause = false;
      const u = new SpeechSynthesisUtterance(ph.text);
      u.lang = 'zh-CN';
      const picked = voices[line.speaker];
      if (picked) u.voice = picked;
      u.pitch = Math.max(0.1, Math.min(2, ph.pitch)); u.rate = Math.max(0.5, Math.min(1.6, ph.rate));
      // Web Speech API supports scalar volume set at utterance start (no WebAudio PannerNode routing).
      u.volume = lastVolume;
      activeUtterance = u;
      const after = () => {
        if (activeUtterance === u) activeUtterance = null;
        if (playToken !== myToken) return;
        delivery.pause = true;
        if (ph.backchannel && delivery.onBackchannel) delivery.onBackchannel(line.speaker);
        setTimeout(next, ph.pauseAfter * 1000);
      };
      u.onend = after;
      u.onerror = (ev) => {
        if (ev && ev.error && ev.error !== 'interrupted' && ev.error !== 'canceled') ttsError = ev.error;
        if (ev && (ev.error === 'interrupted' || ev.error === 'canceled')) { if (activeUtterance === u) activeUtterance = null; return; }
        silent();
      };
      // no voice to speak it: the phrase still takes as long as it would to say (~4.5 chars/s), so
      // the line keeps its length, the face keeps talking and the room keeps yielding to it
      const silent = () => setTimeout(after, Math.max(0.35, ph.text.length / (4.5 * u.rate)) * 1000);
      try { synth.speak(u); } catch { activeUtterance = null; silent(); }
    };
    next();
  }
  // what the voice is doing right now, for faces and listeners: { phrase, pause, onBackchannel }
  const delivery = { phrase: null, pause: false, onBackchannel: null };

  async function playRecordedClip(url, line, myToken, onEnd) {
    const ctx = audio.getContext();
    const master = audio.getMaster();
    if (!ctx || !master) return false;
    try {
      const buf = await loadClip(url, ctx);
      if (playToken !== myToken) return true;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = refDistance;
      panner.maxDistance = maxDistance;
      panner.rolloffFactor = 1.35;

      const sp = getSpeakerPosition(line.speaker);
      if (sp) {
        if (panner.positionX) {
          panner.positionX.value = sp.x; panner.positionY.value = sp.y; panner.positionZ.value = sp.z;
        } else if (panner.setPosition) {
          panner.setPosition(sp.x, sp.y, sp.z);
        }
      }
      src.connect(panner).connect(master);
      activeSource = src;
      activePanner = panner;
      activeBackend = 'recorded';
      spokenCount++;
      src.onended = () => {
        if (activeSource === src) { activeSource = null; activePanner = null; }
        if (playToken === myToken && onEnd) onEnd();
      };
      src.start();
      return true;
    } catch {
      return false;
    }
  }

  function playLine(line, { isGreeting = false, onEnd } = {}) {
    stop();
    const myToken = playToken;
    activeSpeakerId = line.speaker;

    const dist = distanceToSpeaker(line.speaker);
    const gain = isGreeting ? Math.max(0.85, computeDistanceGain(dist, refDistance, maxDistance)) : computeDistanceGain(dist, refDistance, maxDistance);
    lastDist = dist;
    lastGain = gain;

    const clipUrl = (clipFor && clipFor(line)) || clips[line.id];
    if (clipUrl) {
      playRecordedClip(clipUrl, line, myToken, onEnd).then((ok) => {
        if (!ok && playToken === myToken) playWithSynthesis(line, dist, gain, myToken, onEnd);
      });
      return;
    }
    if (speakLive && !audio.muted) { activeBackend = 'live'; speakLive(line, () => { if (playToken === myToken && onEnd) onEnd(); }); return; }
    playWithSynthesis(line, dist, gain, myToken, onEnd);
  }

  function getStatus() {
    const mode = activeBackend;
    const noVoiceNote = mode === 'tts-fallback' && voicesConfirmed && voices.zhCount === 0;
    const liveDist = distanceToSpeaker(activeSpeakerId || 'lin');
    const liveGain = computeDistanceGain(liveDist, refDistance, maxDistance);
    return {
      mode,
      labelZh: mode === 'recorded'
        ? '实景录音'
        : mode === 'tts-fallback'
          ? (noVoiceNote ? '语音合成暂代（未检测到中文语音）' : '语音合成暂代')
          : '语音不可用（仅字幕）',
      labelEn: mode === 'recorded'
        ? 'Recorded audio'
        : mode === 'tts-fallback'
          ? (noVoiceNote ? 'Mandarin TTS fallback (no zh-CN voice)' : 'Mandarin TTS fallback')
          : 'TTS unavailable',
      zhVoices: voices.zhCount,
      voicesConfirmed,
      ttsError,
      currentDist: liveDist,
      currentGain: liveGain,
      lastDist,
      lastGain,
      lastVolume,
      spokenCount,
    };
  }

  function dispose() {
    stop();
    unsubMute();
    if (synth && typeof synth.removeEventListener === 'function') synth.removeEventListener('voiceschanged', onVoicesChanged);
  }

  return {
    playLine,
    delivery,
    stop,
    updateListener,
    getStatus,
    dispose,
  };
}
