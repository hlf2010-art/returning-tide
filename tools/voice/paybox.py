#!/usr/bin/env python3
"""The counter's payment speaker ("支付宝到账二十五元"): the pieces a real box strings together, into
public/ambience/pay/<id>.mp3. engine/soundscape.js payTokens() picks the pieces for an amount;
engine/ambience.js plays them back to back through a small speaker.

All the pieces are said in one take, with a pause after each, so every syllable is spoken in context
(lone characters recorded one at a time came out garbled), then the take is cut at the pauses.
eleven_v3 is used because it is the model that says 支付宝 right (checked by transcribing the result).
  python3 tools/voice/paybox.py          # record and cut
  python3 tools/voice/paybox.py --check  # transcribe a few stitched amounts (ElevenLabs speech-to-text)
The API key is injected by the session's network proxy (no variable needed)."""
import json, subprocess, sys, tempfile, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ambience/pay'
VOICE = 'pFZP5JQG7iQjIQuC4Bku'          # Lily (premade): even, clear
MODEL = 'eleven_v3'
PIECES = [('alipay', '支付宝到账'), ('wechat', '微信收款'),
          ('d0', '零'), ('d1', '一'), ('d2', '二'), ('d3', '三'), ('d4', '四'), ('d5', '五'), ('d6', '六'), ('d7', '七'), ('d8', '八'), ('d9', '九'),
          ('shi', '十'), ('bai', '百'), ('qian', '千'), ('dian', '点'), ('yuan', '元')]

def tts(text):
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128',
                                 data=json.dumps({'text': text, 'model_id': MODEL, 'voice_settings': {'stability': 0.7, 'similarity_boost': 0.7}}).encode(),
                                 headers={'Content-Type': 'application/json', 'xi-api-key': 'injected-by-proxy', 'Accept': 'audio/mpeg'})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()

def silences(path, db=-38, dur=0.12):
    """[(start, end)] of the pauses in the take"""
    err = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(path), '-af', f'silencedetect=noise={db}dB:d={dur}', '-f', 'null', '-'], capture_output=True, text=True).stderr
    s, out = None, []
    for line in err.splitlines():
        if 'silence_start' in line: s = float(line.split('silence_start:')[1])
        elif 'silence_end' in line and s is not None: out.append((s, float(line.split('silence_end:')[1].split('|')[0]))); s = None
    return out

def cut(src, a, b, dst):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(src), '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-af', 'afade=t=in:d=0.01,areverse,afade=t=in:d=0.02,areverse',
                    '-ac', '1', '-ar', '22050', '-b:a', '48k', str(dst)], check=True)

def record():
    OUT.mkdir(parents=True, exist_ok=True)
    take = Path(tempfile.mkdtemp()) / 'take.mp3'
    for attempt in range(4):
        take.write_bytes(tts('。'.join(t for _, t in PIECES) + '。'))
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(take)], capture_output=True, text=True).stdout)
        gaps = [g for g in silences(take) if g[0] > 0.05 and g[1] < dur - 0.02]
        # speech runs between the pauses: there must be exactly one run per piece
        edges = [0.0] + [x for g in gaps for x in g] + [dur]
        runs = [(edges[i], edges[i + 1]) for i in range(0, len(edges) - 1, 2) if edges[i + 1] - edges[i] > 0.08]
        if len(runs) == len(PIECES):
            for (pid, text), (a, b) in zip(PIECES, runs):
                cut(take, max(0, a - 0.02), b + 0.03, OUT / f'{pid}.mp3'); print(pid, text, f'{b - a:.2f}s')
            return
        print(f'take {attempt + 1}: {len(runs)} runs for {len(PIECES)} pieces; again')
    sys.exit('could not cut the take into its pieces')

def check():
    for ids, want in [(['alipay', 'd2', 'shi', 'd5', 'yuan'], '支付宝到账二十五元'), (['wechat', 'shi', 'd8', 'yuan'], '微信收款十八元'),
                      (['alipay', 'd1', 'bai', 'd2', 'shi', 'd8', 'yuan'], '支付宝到账一百二十八元'), (['wechat', 'd3', 'shi', 'dian', 'd5', 'yuan'], '微信收款三十点五元')]:
        tmp = Path(tempfile.mkdtemp())
        (tmp / 'l.txt').write_text(''.join(f"file '{OUT / (i + '.mp3')}'\n" for i in ids))
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(tmp / 'l.txt'), str(tmp / 'a.mp3')], check=True)
        r = subprocess.run(['curl', '-s', 'https://api.elevenlabs.io/v1/speech-to-text', '-H', 'xi-api-key: injected-by-proxy', '-F', 'model_id=scribe_v1',
                            '-F', 'language_code=zh', '-F', f'file=@{tmp / "a.mp3"}'], capture_output=True, text=True).stdout
        print(want, '->', json.loads(r).get('text'))

if __name__ == '__main__':
    check() if '--check' in sys.argv else record()
