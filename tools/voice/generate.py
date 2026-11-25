"""Voices for every scripted line, made offline with Kokoro-82M (Apache-2.0, hexgrad on Hugging Face):
the v1.1-zh model for Mandarin, the v1.0 model for English. Each character has their own voice
(tools/voice/cast.json); each line becomes a small MP3 in public/voice/, listed in manifest.json by
a key the game computes from the language and the text (src/engine/voice.js voiceKey).

  python tools/voice/generate.py --probe          # one test line per voice, with its pitch -> probe.json
  python tools/voice/generate.py                  # voice tools/voice/lines.json (skips what exists)

  python tools/voice/generate.py --prune          # drop clips no current line uses

Needs: pip install "kokoro>=0.9.4" "misaki[zh,en]" soundfile torch, and ffmpeg.
Or, without torch or Hugging Face: KOKORO_ONNX=<dir> with kokoro-onnx and "misaki[zh]>=0.9.4" installed, and the
ONNX exports of the same two models in <dir> (kokoro-v1.0.onnx + voices-v1.0.bin, kokoro-v1.1-zh.onnx +
voices-v1.1-zh.bin, from the kokoro-onnx GitHub releases). Same voices, same output.
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


_onnx = {}


def onnx_parts(lang, text, voice, speed):
    """the same models through kokoro-onnx (KOKORO_ONNX=<dir>): one array per sentence"""
    import re
    from kokoro_onnx import Kokoro
    d = Path(os.environ['KOKORO_ONNX'])
    if not _onnx:
        from misaki import zh
        _onnx['en'] = Kokoro(str(d / 'kokoro-v1.0.onnx'), str(d / 'voices-v1.0.bin'))
        _onnx['zh'] = Kokoro(str(d / 'kokoro-v1.1-zh.onnx'), str(d / 'voices-v1.1-zh.bin'))
        # English words inside Mandarin lines go through espeak, as the torch pipeline's en_callable does
        en_ph = lambda t: _onnx['en'].tokenizer.phonemize(t, 'en-us')
        _onnx['g2p'] = zh.ZHG2P(version='1.1', en_callable=en_ph)
    parts = []
    if lang == 'zh':
        for sent in [x for x in re.split(r'(?<=[。！？!?…])', text) if x.strip()]:
            ph, _ = _onnx['g2p'](sent)
            a, _ = _onnx['zh'].create(ph, voice=voice, speed=zh_speed(speed)(len(ph)), is_phonemes=True)
            parts.append(np.asarray(a, dtype=np.float32))
    else:
        for sent in [x for x in re.split(r'(?<=[.!?])\s+', text) if x.strip()]:
            a, _ = _onnx['en'].create(sent, voice=voice, speed=speed, lang='en-gb' if voice.startswith('b') else 'en-us')
            parts.append(np.asarray(a, dtype=np.float32))
    return parts


def synth(lang, text, voice, speed=1.0):
    parts = []
    if os.environ.get('KOKORO_ONNX'):
        for a in onnx_parts(lang, text, voice, speed):
            parts += [a, np.zeros(int(SR * 0.12), dtype=np.float32)]
    else:
      p = pipes()
      if lang == 'zh':
          pipe, sp = p['zh'], zh_speed(speed)
      else:
          pipe, sp = p['b' if voice.startswith('b') else 'a'], speed
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


# Lines anyone in the street might say (a bump, a near miss, a guide, the 10 pm lights): the person saying
# it can be a man or a woman, so each is also voiced in both (keys 'zh-m|text', 'zh-f|text'; engine/voice.js
# clipUrl(lang, text, sex) takes the speaker's own first). who -> {sex: (zh voice, en voice)}
YOUNG = {'m': ('zm_010', 'am_adam'), 'f': ('zf_017', 'af_bella')}
OLDER = {'m': ('zm_034', 'bm_daniel'), 'f': ('zf_006', 'af_nicole')}
ADULT = {'m': ('zm_062', 'am_liam'), 'f': ('zf_032', 'af_nova')}
ANYONE = {
    'bump:office': ADULT, 'bump:young': YOUNG, 'bump:elder': OLDER, 'bump:auntie': OLDER,
    'bump:visitor': {'m': ('zm_096', 'am_puck'), 'f': ('zf_022', 'af_sky')},
    'passerby': ADULT, 'witness': ADULT, 'victim': ADULT, 'onlooker': YOUNG,
    'guide': {'m': ('zm_052', 'am_eric'), 'f': ('zf_077', 'af_nova')}, 'student': YOUNG, 'auntie': OLDER,
}


def generate_anyone():
    lines = json.load(open(HERE / 'lines.json'))
    man_path = OUT / 'manifest.json'
    man = json.load(open(man_path))
    done = 0
    for l in lines:
        vs = ANYONE.get(l['who'])
        if not vs:
            continue
        for lang in ('zh', 'en'):
            text = l['zh'] if lang == 'zh' else l['en']
            if not text:
                continue
            for sex, pair in vs.items():
                key = voice_key(f'{lang}-{sex}', text)
                f = OUT / f'{key}.mp3'
                if key in man['clips'] and f.exists():
                    continue
                a = synth(lang, text, pair[0 if lang == 'zh' else 1], 1.0)
                to_mp3(a, f)
                man['clips'][key] = [f.name, round(len(a) / SR, 2)]
                done += 1
                if done % 40 == 0:
                    json.dump(man, open(man_path, 'w'))
                    print(f'anyone: {done} clips', flush=True)
    json.dump(man, open(man_path, 'w'))
    print(f'anyone: {done} new clips, {len(man["clips"])} in all')


def prune():
    lines = json.load(open(HERE / 'lines.json'))
    man_path = OUT / 'manifest.json'
    man = json.load(open(man_path))
    want = set()
    for l in lines:
        for lang in ('zh', 'en'):
            text = l['zh'] if lang == 'zh' else l['en']
            if text:
                want.add(voice_key(lang, text))
                want.update(voice_key(f'{lang}-{sex}', text) for sex in (ANYONE.get(l['who']) or {}))
    gone = [k for k in man['clips'] if k not in want]
    for k in gone:
        (OUT / man['clips'].pop(k)[0]).unlink(missing_ok=True)
    json.dump(man, open(man_path, 'w'))
    print(f'pruned {len(gone)} clips, {len(man["clips"])} left')


if __name__ == '__main__':
    if '--probe' in sys.argv: probe()
    elif '--prune' in sys.argv: prune()
    else: generate(); generate_anyone()
