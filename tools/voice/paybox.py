#!/usr/bin/env python3
"""The counter's payment speaker ("易付到账二十五元"): the pieces a real box strings together, into
public/ambience/pay/<id>.mp3. engine/soundscape.js payTokens() picks the pieces for an amount;
engine/ambience.js plays them back to back through a small speaker.

Voiced offline with Kokoro (the v1.1-zh model, the same as the characters' voices; tools/voice/generate.py
synth()), each piece on its own, trimmed to the speech.
  python3 tools/voice/paybox.py                      # torch Kokoro
  KOKORO_ONNX=<dir> python3 tools/voice/paybox.py    # or the ONNX exports (see generate.py)"""
import subprocess, sys, tempfile
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate import synth, SR

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ambience/pay'
VOICE = 'zf_017'          # even, clear, a little bright: the voice these boxes have
PIECES = [('alipay', '易付到账。'), ('wechat', '信语收款。'),
          ('d0', '零。'), ('d1', '一。'), ('d2', '二。'), ('d3', '三。'), ('d4', '四。'), ('d5', '五。'), ('d6', '六。'), ('d7', '七。'), ('d8', '八。'), ('d9', '九。'),
          ('shi', '十。'), ('bai', '百。'), ('qian', '千。'), ('dian', '点。'), ('yuan', '元。')]


def trim(a, db=-40):
    """cut to the speech (frames louder than db below the peak), with a few ms either side"""
    fr = int(SR * 0.01)
    rms = np.array([np.sqrt(np.mean(a[i:i + fr] ** 2)) for i in range(0, len(a) - fr, fr)])
    on = np.where(rms > rms.max() * 10 ** (db / 20))[0]
    a = a[max(0, on[0] * fr - fr): min(len(a), (on[-1] + 2) * fr + fr)].copy()
    n = int(SR * 0.008); a[:n] *= np.linspace(0, 1, n); a[-2 * n:] *= np.linspace(1, 0, 2 * n)
    return a


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for pid, text in PIECES:
        a = trim(synth('zh', text, VOICE, 1.05 if len(text) > 2 else 1.0))
        with tempfile.NamedTemporaryFile(suffix='.wav') as t:
            sf.write(t.name, a, SR)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', t.name, '-ac', '1', '-ar', '22050', '-b:a', '48k', str(OUT / f'{pid}.mp3')], check=True)
        print(pid, text, f'{len(a) / SR:.2f}s')


if __name__ == '__main__':
    main()
