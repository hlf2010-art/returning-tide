"""A local voice for lines nobody could record ahead of time (what an AI-driven conversation says,
lines with numbers in them): the same Kokoro-82M model and the same cast as tools/voice/generate.py,
served on your own machine. The game finds it at http://localhost:8790 (engine/voice.js); without it
the game falls back to the browser's own speech.

  python3.12 -m venv .voice && .voice/bin/pip install torch "kokoro>=0.9.4" "misaki[zh,en]" soundfile
  .voice/bin/python tools/voice/server.py            # first run downloads the models (~0.7 GB)

POST /tts  {"text": "...", "lang": "zh"|"en", "who": "xuan", "voice": ""}  -> audio/wav
GET  /health
On an Apple-silicon Mac this runs well faster than real time on the CPU.
"""
import io, json, sys, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate import synth, SR  # noqa: E402

CAST = json.load(open(Path(__file__).resolve().parent / 'cast.json'))
LOCK = threading.Lock()
PORT = 8790


def pick(who, lang, voice):
    if voice:
        return voice, 1.0
    c = CAST.get(who) or CAST.get((who or '').split(':')[0]) or CAST['_default']
    return c[lang], c.get('speed', 1.0)


class H(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()

    def do_GET(self):
        self.send_response(200 if self.path.startswith('/health') else 404); self.cors(); self.end_headers()
        self.wfile.write(b'ok')

    def do_POST(self):
        if not self.path.startswith('/tts'):
            self.send_response(404); self.cors(); self.end_headers(); return
        try:
            body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
            text, lang = str(body.get('text', ''))[:600], 'zh' if body.get('lang') == 'zh' else 'en'
            voice, speed = pick(body.get('who', ''), lang, body.get('voice', ''))
            with LOCK:
                a = synth(lang, text, voice, speed)
            buf = io.BytesIO(); sf.write(buf, a, SR, format='WAV', subtype='PCM_16')
            data = buf.getvalue()
            self.send_response(200); self.cors(); self.send_header('Content-Type', 'audio/wav'); self.send_header('Content-Length', str(len(data))); self.end_headers()
            self.wfile.write(data)
        except Exception as e:  # keep serving
            self.send_response(500); self.cors(); self.end_headers(); self.wfile.write(str(e).encode())

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    print(f'voice server on http://localhost:{PORT} (warming up the models...)', flush=True)
    synth('zh', '你好。', CAST['_default']['zh'])
    synth('en', 'Hello.', CAST['_default']['en'])
    print('ready', flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
