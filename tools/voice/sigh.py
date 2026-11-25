#!/usr/bin/env python3
"""The Bund's 22:00 sigh: the crowd's "哇——" / "啊……" / "Oh…" as the lights go out, then a ripple of talk and
a laugh (engine/ambience.js plays it from the railing nearest you). Made offline from Kokoro voices (as
tools/voice/generate.py makes the lines): ~24 people in different voices, each starting a moment apart,
at different distances, in a wide open space, then tools/voice/walla.py's murmur rising under the tail.
  python3 tools/voice/sigh.py            -> public/ambience/lights-out.mp3
  KOKORO_ONNX=<dir> python3 tools/voice/sigh.py   (the ONNX exports; see generate.py)"""
import subprocess, sys, tempfile
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy import signal

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate import synth, SR

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ambience/lights-out.mp3'
SECS = 6.0
ZH_F, ZH_M = ['zf_017', 'zf_022', 'zf_032', 'zf_040', 'zf_006', 'zf_077'], ['zm_010', 'zm_034', 'zm_062', 'zm_096', 'zm_052', 'zm_013']
EN = ['af_bella', 'af_sky', 'af_nova', 'am_adam', 'am_liam', 'bm_daniel']
SAYS_ZH = ['哇——', '啊……', '哦——', '哎呀，关了。', '哇……', '诶——', '没了。', '啊——']
SAYS_EN = ['Oh…', 'Aww.', 'Ohh—', 'Oh no.']


def main():
    r = np.random.default_rng(22)
    mix = np.zeros((2, int(SR * SECS)))
    for i in range(24):
        if i < 18:
            v = r.choice(ZH_F + ZH_M); text = r.choice(SAYS_ZH); lang = 'zh'
        else:
            v = r.choice(EN); text = r.choice(SAYS_EN); lang = 'en'
        a = synth(lang, text, v, r.uniform(0.75, 0.95)).astype(np.float64)
        a = a[int(SR * 0.06):]
        a = signal.resample(a, int(len(a) / r.uniform(0.93, 1.07)))          # a little higher or lower
        far = r.uniform(0.1, 1.0)
        a = signal.sosfilt(signal.butter(2, 6500 - 4000 * far, 'lowpass', fs=SR, output='sos'), a) * (1.1 - 0.8 * far)
        start = int(SR * (0.05 + r.gamma(2.0, 0.18)))                      # most within half a second
        n = min(len(a), mix.shape[1] - start)
        if n <= 0: continue
        p = (r.uniform(-0.9, 0.9) + 1) * np.pi / 4
        mix[0, start:start + n] += a[:n] * np.cos(p); mix[1, start:start + n] += a[:n] * np.sin(p)
    # the talk coming back: the murmur, rising after the sigh
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(ROOT / 'public/ambience/murmur.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    m = np.frombuffer(raw, dtype=np.float32).astype(np.float64)[:mix.shape[1]]
    t = np.arange(len(m)) / SR
    rise = np.clip((t - 1.2) / 1.8, 0, 1) * np.clip((SECS - t) / 1.5, 0, 1)
    mix[:, :len(m)] += m * rise * 0.35 / (np.std(m) + 1e-9) * np.std(mix)
    # open air: a short, bright, quickly dying room of buildings across the road
    ir_n = int(SR * 0.9)
    for ch in range(2):
        ir = r.standard_normal(ir_n) * np.exp(-np.linspace(0, 7, ir_n)); ir[0] = 4
        mix[ch] = signal.fftconvolve(mix[ch], ir)[:mix.shape[1]]
    fade = int(SR * 1.2); mix[:, -fade:] *= np.linspace(1, 0, fade)
    mix /= np.max(np.abs(mix)) + 1e-9
    with tempfile.NamedTemporaryFile(suffix='.wav') as w:
        sf.write(w.name, (mix.T * 0.9).astype(np.float32), SR)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', w.name, '-af', 'loudnorm=I=-20:TP=-2', '-ar', '44100', '-ac', '2', '-b:a', '64k', str(OUT)], check=True)
    print(OUT.name, f'{SECS:.1f}s', OUT.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
