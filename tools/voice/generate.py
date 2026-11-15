"""Voices for every scripted line, made offline with Kokoro-82M (Apache-2.0, hexgrad on Hugging Face):
the v1.1-zh model for Mandarin, the v1.0 model for English. Each character has their own voice
(tools/voice/cast.json); each line becomes a small MP3 in public/voice/, listed in manifest.json by
a key the game computes from the language and the text (src/engine/voice.js voiceKey).

  python tools/voice/generate.py --probe          # one test line per voice, with its pitch -> probe.json
  python tools/voice/generate.py                  # voice tools/voice/lines.json (skips what exists)

Needs: pip install "kokoro>=0.9.4" "misaki[zh,en]" soundfile torch, and ffmpeg.
"""
import json, os, subprocess, sys, tempfile, time
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'voice'
HERE = Path(__file__).resolve().parent
SR = 24000
ZH_REPO, EN_REPO = 'hexgrad/Kokoro-82M-v1.1-zh', 'hexgrad/Kokoro-82M'


def fnv1a(s):
    h = 0x811c9dc5
    for b in s.encode('utf-8'):
        h ^= b
        h = (h * 0x01000193) & 0xffffffff
    return f'{h:08x}'


def voice_key(lang, text):
    return fnv1a(f'{lang}|{text.strip()}')


_pipes = {}


def pipes():
    if _pipes:
        return _pipes
    from kokoro import KModel, KPipeline
    import torch
    torch.set_num_threads(max(1, os.cpu_count() or 1))
    en_g2p = KPipeline(lang_code='a', repo_id=ZH_REPO, model=False)

    def en_callable(text):
        try:
            return next(en_g2p(text)).phonemes
        except Exception:
            return text
    zm = KModel(repo_id=ZH_REPO).eval()
    _pipes['zh'] = KPipeline(lang_code='z', repo_id=ZH_REPO, model=zm, en_callable=en_callable)
    em = KModel(repo_id=EN_REPO).eval()
    _pipes['a'] = KPipeline(lang_code='a', repo_id=EN_REPO, model=em)
    _pipes['b'] = KPipeline(lang_code='b', repo_id=EN_REPO, model=em)
    return _pipes


def zh_speed(base):
    # the v1.1-zh model rushes long inputs (its training data is short); ease off as they grow
    def f(len_ps):
        s = 1.0 if len_ps <= 83 else (1 - (len_ps - 83) / 500 if len_ps < 183 else 0.8)
        return s * 1.08 * base
    return f


def synth(lang, text, voice, speed=1.0):
    p = pipes()
    if lang == 'zh':
        pipe, sp = p['zh'], zh_speed(speed)
    else:
        pipe, sp = p['b' if voice.startswith('b') else 'a'], speed
    parts = []
    for r in pipe(text, voice=voice, speed=sp):
        a = r.audio.numpy() if hasattr(r.audio, 'numpy') else np.asarray(r.audio)
        parts.append(a)
        parts.append(np.zeros(int(SR * 0.12), dtype=np.float32))     # a breath between sentences
    if not parts:
        return np.zeros(SR // 4, dtype=np.float32)
    a = np.concatenate(parts[:-1])
    # a little room: 60 ms of lead-in, a soft fade at both ends, level to about -16 dBFS RMS
    a = np.concatenate([np.zeros(int(SR * 0.06), dtype=np.float32), a])
    n = min(len(a) // 4, int(SR * 0.01))
    if n > 0:
        a[:n] *= np.linspace(0, 1, n)
        a[-n:] *= np.linspace(1, 0, n)
    rms = float(np.sqrt(np.mean(a ** 2))) or 1e-6
    a = np.clip(a * (10 ** (-16 / 20) / rms), -0.98, 0.98)
    return a.astype(np.float32)


def f0_median(a):
    # plain autocorrelation pitch per 40 ms frame over voiced frames (enough to rank voices)
    fr, hop, out = int(SR * 0.04), int(SR * 0.02), []
    for i in range(0, len(a) - fr, hop):
        x = a[i:i + fr] - np.mean(a[i:i + fr])
        if np.sqrt(np.mean(x ** 2)) < 0.02:
            continue
        c = np.correlate(x, x, 'full')[fr - 1:]
        lo, hi = int(SR / 400), int(SR / 60)
        k = lo + int(np.argmax(c[lo:hi]))
        if c[k] > 0.3 * c[0]:
            out.append(SR / k)
    return float(np.median(out)) if out else 0.0


def to_mp3(a, path):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t:
        sf.write(t.name, a, SR)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', t.name, '-ac', '1', '-ar', str(SR), '-b:a', '40k', str(path)], check=True)
    os.unlink(t.name)


def probe():
    zh_text, en_text = '你好，今天外滩的风有点大，我们去江边走走吧。', "Evening. The wind's picking up on the Bund, let's take a walk by the river."
    import urllib.request
    res = {}
    for repo, lang, text in [(ZH_REPO, 'zh', zh_text), (EN_REPO, 'en', en_text)]:
        meta = json.load(urllib.request.urlopen(f'https://huggingface.co/api/models/{repo}'))
        voices = [s['rfilename'][7:-3] for s in meta['siblings'] if s['rfilename'].startswith('voices/')]
        voices = [v for v in voices if (v[:2] in ('zf', 'zm') if lang == 'zh' else v[:2] in ('af', 'am', 'bf', 'bm'))]
        for v in voices:
            t0 = time.time()
            a = synth(lang, text, v)
            res[v] = {'lang': lang, 'f0': round(f0_median(a), 1), 'secs': round(len(a) / SR, 2), 'gen': round(time.time() - t0, 2)}
            print(v, res[v], flush=True)
    json.dump(res, open(HERE / 'probe.json', 'w'), indent=1)


def generate():
    lines = json.load(open(HERE / 'lines.json'))
    cast = json.load(open(HERE / 'cast.json'))
    OUT.mkdir(parents=True, exist_ok=True)
    man_path = OUT / 'manifest.json'
    man = json.load(open(man_path)) if man_path.exists() else {'v': 1, 'clips': {}}
    done = 0
    for i, l in enumerate(lines):
        c = cast.get(l['who']) or cast.get(l['who'].split(':')[0]) or cast['_default']
        for lang in ('zh', 'en'):
            text = l['zh'] if lang == 'zh' else l['en']
            if not text:
                continue
            key = voice_key(lang, text)
            f = OUT / f'{key}.mp3'
            if key in man['clips'] and f.exists():
                continue
            a = synth(lang, text, c[lang], c.get('speed', 1.0) * (c.get('speedEn', 1.0) if lang == 'en' else 1.0))
            to_mp3(a, f)
            man['clips'][key] = [f.name, round(len(a) / SR, 2)]
            done += 1
            if done % 20 == 0:
                json.dump(man, open(man_path, 'w'))
                print(f'{i + 1}/{len(lines)} lines, {done} clips', flush=True)
    json.dump(man, open(man_path, 'w'))
    print(f'done: {done} new clips, {len(man["clips"])} in all')


if __name__ == '__main__':
    probe() if '--probe' in sys.argv else generate()
