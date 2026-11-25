#!/usr/bin/env python3
"""The city's background beds, recorded (generated) instead of synthesised: crowds, traffic, the river at the
wall, boats out on the river, wind. Several takes of each, so the game can cross from one to another and you
never hear the same loop come round (engine/beds.js). Made with ElevenLabs' sound generator, folded into
seamless loops and brought to one loudness, into public/ambience/beds/<bed>-<n>.mp3 and beds.json.
  python3 tools/voice/ambience.py            # make what's missing
  python3 tools/voice/ambience.py --all      # make everything again
(wind-1 shipped here is wind-2 reversed and slowed by 10%: the free plan ran out of credits for a new take.)
The API key is injected by the session's network proxy."""
import json, subprocess, sys, tempfile, urllib.request
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ambience/beds'
SR, SECS, XF = 44100, 20, 1.2           # sample rate; seconds a take; seconds folded at the loop
NO = 'no music, no announcements, no sirens, no single voice standing out, no words you can make out'
BEDS = {
    'crowd': [
        f'Field recording on a busy riverside promenade in Shanghai in the evening: hundreds of tourists strolling and chatting in Mandarin and Shanghainese, indistinct overlapping conversation at a distance, footsteps on granite, a child laughing far off, open air, {NO}',
        f'Field recording on a crowded pedestrian shopping street in Shanghai at night: a dense murmur of many people talking in Mandarin, shuffling footsteps, distant laughter, shop doors, open air between tall buildings, {NO}',
        f'Field recording of a large relaxed crowd by a river at dusk: families and couples talking quietly in Chinese, a soft wash of voices from every side, footsteps, light breeze, open space, {NO}',
    ],
    'traffic': [
        'Field recording of steady city traffic on a wide waterfront boulevard at night heard from the pavement about twenty metres away: tyres rolling on asphalt, many quiet electric cars and taxis passing, a bus pulling away, no horns, no sirens, no music, no voices',
        'Field recording of a busy multi-lane city road in the evening from behind a low wall: a continuous soft roar of tyres, cars passing both ways, occasional heavier vehicle, distant city hum, no horns, no sirens, no music, no voices',
    ],
    'river': [
        'Close field recording of river water lapping against a stone embankment wall: small waves slapping and gurgling, the current moving, a little spray, steady, calm evening, no boats, no voices, no music',
        'Field recording at the edge of a wide river: gentle waves washing against a granite flood wall below, water sloshing in irregular rhythm, open air, no boats, no voices, no music',
    ],
    'boats': [
        'Distant field recording across a wide river at night: a slow diesel barge engine chugging past, deep low throb, the wash of its wake faintly reaching the bank, no horn, no voices, no music',
        'Field recording of a river cruise boat passing at a distance on a wide city river: soft engine hum, water churning behind it, gradual pass, no horn, no voices, no music',
    ],
    'wind': [
        'Raw outdoor field recording of wind only: broadband wind noise over open water, soft gusts rising and falling, air rushing past the microphone, no tones, no melody, no instruments, no music of any kind, no rain, no voices, no traffic',
        'Field recording of a cool breeze in an open city space at night: wind gusting softly, a flag or awning flapping faintly far off, no rain, no voices, no music',
    ],
}

def generate(text):
    req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation',
                                 data=json.dumps({'text': text, 'duration_seconds': SECS, 'prompt_influence': 0.6}).encode(),
                                 headers={'Content-Type': 'application/json', 'xi-api-key': 'injected-by-proxy'})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()

def pcm(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(path), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    again = '--all' in sys.argv
    tmp = Path(tempfile.gettempdir()) / 'rt-beds'; tmp.mkdir(exist_ok=True)
    manifest = {}
    for bed, prompts in BEDS.items():
        manifest[bed] = []
        for i, text in enumerate(prompts):
            name = f'{bed}-{i + 1}'; dst = OUT / f'{name}.mp3'
            if again or not dst.exists():
                raw = tmp / f'{name}-raw.mp3'
                if again or not raw.exists():
                    raw.write_bytes(generate(text))
                x = pcm(raw)
                # a seamless loop: the last XF seconds folded into the first (equal power), then dropped
                n = int(XF * SR); k = np.sqrt(np.linspace(0, 1, n, dtype=np.float32))[:, None]
                x[:n] = x[:n] * k + x[-n:] * np.sqrt(1 - k ** 2); x = x[:-n]
                wav = tmp / f'{name}.wav'
                subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(wav)], input=x.astype(np.float32).tobytes(), check=True)
                # one loudness for every take (the game sets each bed's level itself)
                subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-af', 'loudnorm=I=-23:TP=-2:LRA=11', '-ar', str(SR), '-ac', '2', '-b:a', '96k', str(dst)], check=True)
                print(name, dst.stat().st_size)
            dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(dst)], capture_output=True, text=True).stdout)
            manifest[bed].append({ 'file': f'{name}.mp3', 'seconds': round(dur, 2) })
    (OUT / 'beds.json').write_text(json.dumps(manifest, indent=1))

if __name__ == '__main__':
    main()
