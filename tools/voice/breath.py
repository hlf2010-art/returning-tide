#!/usr/bin/env python3
"""Ji Bai catching his breath: two panting loops (heavy, right after running out; easing, as he recovers),
synthesised from shaped noise (an open-mouthed exhale, a thinner inhale), with each one's breathing envelope
(how loud, 30 times a second) so the camera can rise and fall on the breaths you hear (engine/audio.js,
headMotion.js). Nothing recorded and no outside service, so the loops belong to the game.
  python3 tools/voice/breath.py      # write public/ambience/breath/{heavy,ease}.mp3 + .json  (needs numpy, scipy, ffmpeg)"""
import json, subprocess, tempfile
from pathlib import Path
import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ambience/breath'
SR, FPS = 32000, 30                     # sample rate; envelope frames a second
# name: (breaths, seconds per breath, share of it breathing out, exhale level, inhale level, gap between)
TAKES = {'heavy': (16, 0.5, 0.5, 1.0, 0.55, 0.04), 'ease': (5, 1.85, 0.55, 0.75, 0.35, 0.35)}


def formant(x, peaks):
    """noise through a few resonances (the mouth's shape)"""
    y = np.zeros_like(x)
    for f, q, g in peaks:
        b, a = signal.iirpeak(f, q, fs=SR); y += signal.lfilter(b, a, x) * g
    return y


def puff(r, secs, peaks, tilt, rise, fall):
    n = int(secs * SR)
    x = r.standard_normal(n)
    x = formant(x, peaks) + signal.sosfilt(signal.butter(2, tilt, 'highpass', fs=SR, output='sos'), x) * 0.15
    t = np.linspace(0, 1, n)
    e = np.minimum(1, t / rise) ** 1.5 * np.minimum(1, (1 - t) / fall) ** 2
    return x * e


def take(r, breaths, per, out_share, ex, inh, gap):
    parts = []
    for _ in range(breaths):
        p = per * r.uniform(0.9, 1.1)
        f1 = r.uniform(650, 850)                                   # an open "haa"
        parts.append(puff(r, p * out_share, [(f1, 4, 1.0), (f1 * 1.7, 5, 0.6), (2600, 3, 0.25)], 1500, 0.12, 0.55) * ex * r.uniform(0.85, 1.1))
        parts.append(np.zeros(int(p * gap * SR)))
        parts.append(puff(r, p * (1 - out_share - gap), [(1700, 3, 0.5), (3200, 3, 0.7), (5200, 4, 0.4)], 3000, 0.35, 0.3) * inh * r.uniform(0.85, 1.1))
    x = np.concatenate(parts)
    return x / (np.max(np.abs(x)) + 1e-9) * 0.9


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp())
    for name, spec in TAKES.items():
        r = np.random.default_rng([ord(c) for c in name])
        x = take(r, *spec)              # starts and ends between breaths, so it loops as it is
        # the envelope: RMS in 1/FPS windows, smoothed, normalised 0..1 (the quiet between breaths at 0)
        hop = SR // FPS; frames = len(x) // hop
        rms = np.sqrt(np.mean(x[:frames * hop].reshape(frames, hop) ** 2, axis=1))
        rms = np.convolve(rms, np.ones(7) / 7, mode="same")
        lo, hi = np.percentile(rms, 8), np.percentile(rms, 97)
        env = np.clip((rms - lo) / (hi - lo + 1e-9), 0, 1)
        wav = tmp / f'{name}.wav'
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', str(wav)], input=x.astype(np.float32).tobytes(), check=True)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-ac', '1', '-ar', str(SR), '-b:a', '64k', str(OUT / f'{name}.mp3')], check=True)
        (OUT / f'{name}.json').write_text(json.dumps({'fps': FPS, 'seconds': round(len(x) / SR, 3), 'env': [round(float(v), 3) for v in env]}))
        peaks = int(np.sum((env[1:-1] > 0.55) & (env[1:-1] >= env[:-2]) & (env[1:-1] > env[2:])))
        print(name, f'{len(x) / SR:.2f}s', f'{peaks / (len(x) / SR):.2f} peaks/s', (OUT / f'{name}.mp3').stat().st_size)


if __name__ == '__main__':
    main()
