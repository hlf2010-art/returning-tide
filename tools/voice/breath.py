#!/usr/bin/env python3
"""Ji Bai catching his breath: two panting loops (heavy, right after running out; easing, as he recovers)
made with ElevenLabs' sound generator, made to loop, with each one's breathing envelope (how loud, 30
times a second) so the camera can rise and fall on the breaths you hear (engine/audio.js, headMotion.js).
  python3 tools/voice/breath.py           # generate, loop, write public/ambience/breath/{heavy,ease}.mp3 + .json
  python3 tools/voice/breath.py --keep    # reuse the raw takes already in the scratch folder
The API key is injected by the session's network proxy."""
import json, subprocess, sys, tempfile, urllib.request
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ambience/breath'
SR, FPS, XF = 32000, 30, 0.6            # sample rate; envelope frames a second; seconds folded at the loop
TAKES = {
    'heavy': ('Close-up first-person recording of a fit young man completely out of breath right after a long sprint, heavy fast panting through an open mouth, '
              'sharp inhales and strong exhales, steady rhythm about two breaths per second, no voice, no words, no music, quiet outdoor background', 8),
    'ease': ('Close-up first-person recording of a young man recovering his breath after running, slow deep breaths in through the nose and out through the mouth, '
             'about one breath every two seconds, calming down, no voice, no words, no music, quiet outdoor background', 10),
}

def generate(text, secs):
    req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation',
                                 data=json.dumps({'text': text, 'duration_seconds': secs, 'prompt_influence': 0.7}).encode(),
                                 headers={'Content-Type': 'application/json', 'xi-api-key': 'injected-by-proxy'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()

def pcm(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.gettempdir()) / 'rt-breath'; tmp.mkdir(exist_ok=True)
    for name, (text, secs) in TAKES.items():
        raw = tmp / f'{name}-raw.mp3'
        if '--keep' not in sys.argv or not raw.exists():
            raw.write_bytes(generate(text, secs))
        x = pcm(raw)
        x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
        # loop: fold the last XF seconds into the first (equal-power), drop them from the end
        n = int(XF * SR); k = np.linspace(0, 1, n, dtype=np.float32)
        x[:n] = x[:n] * np.sqrt(k) + x[-n:] * np.sqrt(1 - k); x = x[:-n]
        # the envelope: RMS in 1/FPS windows, smoothed, normalised 0..1 (the quiet between breaths at 0)
        hop = SR // FPS; frames = len(x) // hop
        rms = np.sqrt(np.mean(x[:frames * hop].reshape(frames, hop) ** 2, axis=1))
        rms = np.convolve(rms, np.ones(3) / 3, mode='same')
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
