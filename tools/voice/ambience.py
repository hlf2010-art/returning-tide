#!/usr/bin/env python3
"""The city's background beds: crowds, traffic, the river at the wall, boats out on the river, wind. Several
takes of each, so the game can cross from one to another and you never hear the same loop come round
(engine/beds.js). Everything is synthesised here from noise and oscillators, except the crowd, which is
tools/voice/walla.py's Kokoro murmur laid over itself; nothing comes from a recording or an outside service,
so the beds belong to the game. Each take is folded into a seamless loop and brought to one loudness, into
public/ambience/beds/<bed>-<n>.mp3 and beds.json.
  python3 tools/voice/ambience.py            (needs numpy, scipy, and ffmpeg)"""
import json, subprocess, tempfile
from pathlib import Path
import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ambience/beds'
SR, SECS, XF = 44100, 20, 1.2           # sample rate; seconds a take; seconds folded at the loop
N = int(SR * (SECS + XF))


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)


def brown(r, n=N):
    x = np.cumsum(r.standard_normal(n)); x -= lp(x, 8); return x / (np.std(x) + 1e-9)


def lfo(r, rate, n=N, smooth=None):
    """a slow random curve, 0..1, changing about `rate` times a second"""
    k = max(4, int(n / SR * rate) + 4)
    pts = r.random(k)
    t = np.linspace(0, k - 3, n)
    return np.clip(np.interp(t, np.arange(k), pts), 0, 1)


def pan(m, p):
    """mono -> stereo at p in -1..1 (a float or a curve), equal power"""
    a = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([m * np.cos(a), m * np.sin(a)])


def wide(r, f):
    """two decorrelated copies of a mono maker, one per ear"""
    return np.stack([f(r), f(r)])


def river(r):
    # the river against the wall: a low churn, waves slapping in an uneven rhythm, gurgle and spray
    body = lp(brown(r), 380) * 0.5
    out = wide(r, lambda r: body + lp(brown(r), 500) * 0.25)
    t = 0.0
    while t < SECS + XF:
        t += r.uniform(0.7, 2.6)
        i, d = int(t * SR), r.uniform(0.5, 1.4)
        n = int(d * SR)
        if i + n >= N: break
        e = np.exp(-np.linspace(0, 6 / d, n) * d) * (1 - np.exp(-np.linspace(0, 40, n)))
        w = bp(r.standard_normal(n), r.uniform(250, 500), r.uniform(1200, 2600)) * e * r.uniform(0.6, 1.4)
        w += hp(r.standard_normal(n), 3000) * e ** 3 * r.uniform(0.05, 0.25)          # a little spray
        out[:, i:i + n] += pan(w, r.uniform(-0.8, 0.8))
    # gurgle: narrow resonances wandering in the low mids
    for _ in range(3):
        f0 = r.uniform(300, 700)
        g = bp(r.standard_normal(N), f0 * 0.92, f0 * 1.08) * lfo(r, 3) ** 2 * 0.6
        out += pan(g, r.uniform(-0.6, 0.6))
    return out


def boats(r):
    # a diesel barge going by out on the river: the engine's low throb, its wake, all far off
    rate = r.uniform(9, 13)                       # firing rate (Hz)
    t = np.arange(N) / SR
    jit = np.cumsum(r.standard_normal(N)) / SR * 0.6
    ph = 2 * np.pi * rate * (t + jit)
    throb = (0.5 + 0.5 * np.cos(ph)) ** 6        # one thump per firing
    eng = lp(throb * r.standard_normal(N) * 0.4 + throb, 160, 4)
    hum = sum(np.sin(ph * k + r.uniform(0, 6)) / k for k in (3, 4, 6, 8)) * 0.15
    passby = np.exp(-((t - r.uniform(0.35, 0.65) * SECS) / (SECS * 0.45)) ** 2)
    eng = (eng + lp(hum, 400)) * (0.25 + 0.75 * passby)
    x = np.linspace(-0.7, 0.7, N) * r.choice([-1, 1])
    out = pan(eng / (np.std(eng) + 1e-9), x)
    wake = wide(r, lambda r: bp(r.standard_normal(N), 200, 1400) * (0.15 + 0.5 * passby) * (0.6 + 0.4 * lfo(r, 1.5)))
    out = out + wake * 0.7 + wide(r, lambda r: lp(brown(r), 250)) * 0.3
    return out


def traffic(r):
    # a road heard from the pavement: a constant soft roar, with cars (mostly electric: tyres, not engines)
    # passing one way or the other
    out = wide(r, lambda r: lp(brown(r), 300) * 0.6 + bp(r.standard_normal(N), 300, 1800) * 0.12)
    t = -2.0
    while t < SECS + XF:
        t += r.exponential(1.4) + 0.3
        d = r.uniform(2.5, 5.0); n = int(d * SR); i = int(t * SR)
        a, b = max(0, i), min(N, i + n)
        if b <= a: continue
        u = np.linspace(-1, 1, n)[a - i:b - i]
        e = 1 / (1 + (u * r.uniform(2.5, 4)) ** 2)                              # closest at the middle
        lo = r.uniform(250, 450); hi = r.uniform(2000, 4500) * (0.6 + 0.4 * e)
        car = bp(r.standard_normal(b - a), lo, hi.mean()) * e * r.uniform(0.4, 1.0)
        if r.random() < 0.25: car += lp(r.standard_normal(b - a), 120) * e * 1.5     # a heavier vehicle
        dirn = r.choice([-1, 1])
        out[:, a:b] += pan(car, np.clip(u * 0.9 * dirn, -1, 1))
    return out


def wind(r):
    # wind over open water: broadband air in a few bands that rise and fall on their own, and gusts
    gust = 0.25 + 0.75 * lfo(r, 0.25) ** 1.5
    out = np.zeros((2, N))
    for lo, hi, g in [(60, 300, 0.9), (200, 900, 0.6), (600, 2500, 0.25), (2000, 6000, 0.08)]:
        out += wide(r, lambda r: bp(r.standard_normal(N), lo, hi) * (0.4 + 0.6 * lfo(r, 0.6)) * g)
    f = r.uniform(500, 900)
    whistle = bp(r.standard_normal(N), f * 0.97, f * 1.03) * lfo(r, 0.4) ** 3 * 0.5
    out += pan(whistle, r.uniform(-0.5, 0.5))
    return out * gust


def crowd(r):
    # many people at once: the Kokoro murmur (public/ambience/murmur.mp3, tools/voice/walla.py) laid over
    # itself at different offsets, speeds and sides, plus footsteps on stone
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(ROOT / 'public/ambience/murmur.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    m = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    out = np.zeros((2, N))
    for k in range(6):
        sp = r.uniform(0.9, 1.1)
        src = signal.resample(m, int(len(m) / sp))
        src = np.tile(src, int(np.ceil((N + SR * 30) / len(src))))
        o = r.integers(0, len(src) - N)
        layer = src[o:o + N]
        far = r.uniform(0, 1)
        layer = lp(layer, 7000 - 4500 * far) * (1 - 0.6 * far)
        out += pan(layer, r.uniform(-0.9, 0.9))
    steps = np.zeros((2, N)); t = 0.0
    while t < SECS + XF:
        t += r.exponential(0.09); i = int(t * SR); n = int(0.05 * SR)
        if i + n >= N: break
        s = hp(r.standard_normal(n), r.uniform(800, 2000)) * np.exp(-np.linspace(0, 9, n)) * r.uniform(0.02, 0.12)
        steps[:, i:i + n] += pan(s, r.uniform(-1, 1))
    return out / (np.std(out) + 1e-9) + steps * 3


MAKERS = {'crowd': (crowd, 3), 'traffic': (traffic, 2), 'river': (river, 2), 'boats': (boats, 2), 'wind': (wind, 2)}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    tmp = Path(tempfile.mkdtemp())
    for bed, (make, takes) in MAKERS.items():
        manifest[bed] = []
        for i in range(takes):
            r = np.random.default_rng([ord(c) for c in bed] + [i])     # the same takes every run
            x = make(r).astype(np.float64)
            x /= np.max(np.abs(x)) + 1e-9
            # a seamless loop: the last XF seconds folded into the first (equal power), then dropped
            n = int(XF * SR); k = np.linspace(0, 1, n)
            x[:, :n] = x[:, :n] * np.sqrt(k) + x[:, -n:] * np.sqrt(1 - k); x = x[:, :-n]
            name = f'{bed}-{i + 1}'
            wav = tmp / f'{name}.wav'
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(wav)],
                           input=(x.T * 0.9).astype(np.float32).tobytes(), check=True)
            dst = OUT / f'{name}.mp3'
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-af', 'loudnorm=I=-23:TP=-2:LRA=11', '-ar', str(SR), '-ac', '2', '-b:a', '96k', str(dst)], check=True)
            manifest[bed].append({'file': f'{name}.mp3', 'seconds': round(x.shape[1] / SR, 2)})
            print(name, f'{x.shape[1] / SR:.2f}s', dst.stat().st_size // 1024, 'KB')
    (OUT / 'beds.json').write_text(json.dumps(manifest, indent=1))


if __name__ == '__main__':
    main()
