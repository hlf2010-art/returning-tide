"""The crowd's murmur: a seamless loop of many people talking at once on the promenade, made offline
from Kokoro voices (as tools/voice/generate.py makes the lines). Short everyday phrases (mostly
Mandarin, some English from visitors) in ~20 different voices, laid over each other as ~14 talkers at
different distances (farther = quieter and duller), so no single sentence stands out.

  python tools/voice/walla.py            -> public/ambience/murmur.mp3 (mono, 34 s loop)
"""
import random, subprocess, sys, tempfile, os
from pathlib import Path
import numpy as np
import soundfile as sf
sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate import synth, SR, ROOT

ZH = ['哇，好漂亮啊', '这边这边', '帮我拍一张', '你站过去一点', '东方明珠亮了', '等一下我', '我们去南京路吧', '人好多啊',
      '那个是上海中心吗', '拍好了没有', '再来一张', '妈妈你看', '风好大', '走了走了', '你饿不饿', '等会儿去吃小笼包',
      '这个角度好看', '你往左边一点', '灯好亮啊', '今天好冷啊', '我手机快没电了', '我们几点回去', '他们在那边', '你看那条船',
      '好看好看', '要不要买瓶水', '前面人太多了', '慢一点', '你帮我拍', '对对对', '没事没事', '就在这里吧', '明天去哪里',
      '真的假的', '我跟你说', '那边那边', '我看看', '可以可以', '太美了', '你看对面']
EN = ['Look at that!', 'Can you take one of us?', 'Over here!', "That's amazing.", 'Which way is the metro?', "Let's go this way."]
ZV = ['zf_001', 'zf_003', 'zf_005', 'zf_017', 'zf_022', 'zf_032', 'zf_044', 'zf_071', 'zf_085', 'zf_094',
      'zm_009', 'zm_012', 'zm_020', 'zm_031', 'zm_045', 'zm_052', 'zm_061', 'zm_080', 'zm_095', 'zm_100']
EV = ['af_bella', 'am_michael', 'bf_emma', 'bm_george']
LOOP, FADE = 34.0, 4.0


def lowpass(a, fc):
    k = np.exp(-2 * np.pi * fc / SR)
    out = np.empty_like(a); y = 0.0
    for i, x in enumerate(a):
        y = (1 - k) * x + k * y
        out[i] = y
    return out


def main():
    rnd = random.Random(1851)
    total = int((LOOP + FADE) * SR)
    mix = np.zeros(total, dtype=np.float32)
    cache = {}
    def phrase(text, voice, lang):
        key = (text, voice)
        if key not in cache:
            a = synth(lang, text, voice, speed=rnd.uniform(0.95, 1.12))
            loud = np.flatnonzero(np.abs(a) > 0.02)                 # trim the model's silent padding
            cache[key] = a[max(0, loud[0] - 240):loud[-1] + 480] if len(loud) else a
        return cache[key]
    talkers = 14
    zv, ev = rnd.sample(ZV, len(ZV)), rnd.sample(EV, len(EV))   # every talker a different voice
    for t in range(talkers):
        dist = rnd.uniform(5, 20)                         # metres away (the near ones are real people in the game)
        gain = 0.5 / (1 + dist / 5)
        fc = 5200 - dist * 190
        foreign = t in (3, 8, 12)
        voice = ev.pop() if foreign else zv.pop()
        track = np.zeros(total, dtype=np.float32)
        pos = int(rnd.uniform(0, 3) * SR)
        while pos < total:
            text = rnd.choice(EN if foreign else ZH)
            a = phrase(text, voice, 'en' if foreign else 'zh')
            n = min(len(a), total - pos)
            track[pos:pos + n] += a[:n] * rnd.uniform(0.7, 1.0)
            pos += n + int(rnd.uniform(0.3, 1.8) * SR)     # listening, walking on, a pause
        mix += lowpass(track, fc) * gain
        print(f'talker {t + 1}/{talkers}: {voice} at {dist:.0f} m', flush=True)
    # seamless: the tail fades into the head
    f = int(FADE * SR); body = mix[:int(LOOP * SR)].copy()
    w = np.linspace(0, 1, f, dtype=np.float32)
    body[:f] = body[:f] * w + mix[int(LOOP * SR):int(LOOP * SR) + f] * (1 - w)
    rms = float(np.sqrt(np.mean(body ** 2))) or 1e-6
    body = np.clip(body * (10 ** (-20 / 20) / rms), -0.95, 0.95)
    # no hole anywhere: the quietest quarter second within 9 dB of the median
    q = [float(np.sqrt(np.mean(body[i:i + SR // 4] ** 2))) for i in range(0, len(body) - SR // 4, SR // 4)]
    print('quietest / median quarter-second:', round(20 * np.log10(min(q) / sorted(q)[len(q) // 2]), 1), 'dB', flush=True)
    out = ROOT / 'public' / 'ambience'; out.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        sf.write(tmp.name, body, SR)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-ac', '1', '-ar', str(SR), '-b:a', '48k', str(out / 'murmur.mp3')], check=True)
    os.unlink(tmp.name)
    print('murmur.mp3', round(len(body) / SR, 1), 's')


if __name__ == '__main__':
    main()
