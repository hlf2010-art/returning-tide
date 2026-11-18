#!/usr/bin/env python3
"""Voice chosen lines with ElevenLabs (eleven_v3: emotion from the text itself), into the same public/voice/ clips and
manifest.json the game already plays (keyed by lang|text), replacing those lines' Kokoro clips.
  python3 tools/voice/eleven.py            # the lines in PICKS (both languages) for the voices in VOICES
  python3 tools/voice/eleven.py --dry      # what it would voice, and the characters it would use
The API key is injected by the session's network proxy (no variable needed). Free accounts can only use ElevenLabs'
own premade voices (English speakers); with a paid plan, put native Mandarin library voices in VOICES and run again.
What was voiced here is kept in tools/voice/eleven.json (so a Kokoro run, which skips existing clips, leaves them)."""
import json, os, subprocess, sys, tempfile, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT, LINES, LEDGER = ROOT / 'public/voice', ROOT / 'tools/voice/lines.json', ROOT / 'tools/voice/eleven.json'
MODEL = 'eleven_v3'
# who -> ElevenLabs voice id (premade, usable on a free plan). One voice for both languages: the same person
VOICES = {
    'zhiwei': 'XrExE9yKIg1WjnnlVkGX',   # Matilda: professional
    'gunian': 'pFZP5JQG7iQjIQuC4Bku',   # Lily: velvety, poised
    'nanxing': 'EXAVITQu4vr4xnSDxMaL',  # Sarah: mature, reassuring
    'yuan': 'SAz9YHcvj6GT2YYXdXww',     # River: relaxed
    'kexin': 'cgSgspJ2msm6clMCkdW9',    # Jessica: playful, bright
    'ruoan': 'Xb7hH8MSUJpSbSDYk0k2',    # Alice: clear
    'zhixia': 'FGY2WhTYpPnrIDTdsKH5',   # Laura: enthusiastic
    'yinuo': 'hpp4J3VqNfWAUOO0d1Us',    # Bella: professional, warm
    'mum': 'XrExE9yKIg1WjnnlVkGX',      # Matilda
    'su': 'hpp4J3VqNfWAUOO0d1Us',       # Bella
    'vivian': 'FGY2WhTYpPnrIDTdsKH5',   # Laura
    'dad': 'pqHfZKP75CvOlQylNhV4',      # Bill: wise, mature
    'lin': 'JBFqnCBsd6RMkjVDRZzb',      # George: warm storyteller
    'momo': 'TX3LPaxmHKxFdv7VOQHJ',     # Liam: energetic creator
    'xuan': 'cjVigY5qzO86Huf0OWal',     # Eric: smooth
    'founder': 'iP95p4xoKVk53GoZ742B',  # Chris: down-to-earth
}
# Act I: a line or two for each of the main people (the Chinese text, exactly as in lines.json; or 'who:keyword')
PICKS = [
    '两周没有产出，Raymond 会问。我替你顶着。',
    '昨天谢谢你替我坐下。汉口路那家 Manner，我每天一点在。今天也在。',
    '没事。就是冲出来一张片子，想第一个给你看。',
    '所以你真的回去了。',
    '发了。小猫贴纸的点赞比我的脸还多，我有点受伤😂',
    '来啦。准时，难得。',
    '你还是这样，看东西先看毛病。',
    '嗯。你妈让你按时吃饭。挂了。',
    '……你自己的事，你自己想清楚。钱够不够？',
    '白白，妈妈看到你朋友圈了，那个车……你爸还不知道。你自己注意安全，按时吃饭。',
    '十一月就这样，白天看着还暖和，一过五点天就暗下来了。',
    '对岸东方明珠刚才亮灯那一下，江面上全倒映出来了。',
    '昨晚和平饭店门口那事，吧台的小妹说是你？可以啊纪白。',
    '我们的机械臂末端正好缺一双眼睛。',
    '怎么样？在外滩开这台车，整条路的人都在看您。',
    'xuan:机械臂', 'zhixia:数据记录仪',
]


# how each line is played (eleven_v3 audio tags): (tag at the start, tag before the last sentence, tag after the first
# sentence) for both languages: the words on screen don't change, only the performance
DIRECTION = {
    '两周没有产出，Raymond 会问。我替你顶着。': ('[matter-of-fact]', '[lower, protective]', None),
    '昨天谢谢你替我坐下。汉口路那家 Manner，我每天一点在。今天也在。': ('[with a small smile]', '[softly, a little shy]', None),
    '没事。就是冲出来一张片子，想第一个给你看。': ('[casually]', '[a little shy]', None),
    '所以你真的回去了。': ('[pause] [quietly, wistful]', None, None),
    '发了。小猫贴纸的点赞比我的脸还多，我有点受伤😂': ('[laughs]', '[mock-hurt]', None),
    '来啦。准时，难得。': ('[teasing]', None, None),
    '你还是这样，看东西先看毛病。': ('[sighs] [with a wry laugh]', None, None),
    '嗯。你妈让你按时吃饭。挂了。': ('[gruffly]', '[abruptly]', '[pause]'),
    '……你自己的事，你自己想清楚。钱够不够？': ('[sighs]', '[pause] [gruff, awkward concern]', None),
    '白白，妈妈看到你朋友圈了，那个车……你爸还不知道。你自己注意安全，按时吃饭。': ('[worried, hushed]', '[gently]', None),
    '十一月就这样，白天看着还暖和，一过五点天就暗下来了。': ('[chatty, unhurried]', None, None),
    '对岸东方明珠刚才亮灯那一下，江面上全倒映出来了。': ('[delighted]', None, None),
    '昨晚和平饭店门口那事，吧台的小妹说是你？可以啊纪白。': ('[excited]', '[laughs] [teasing]', None),
    '我们的机械臂末端正好缺一双眼睛。': ('[eyes lighting up]', None, None),
    '怎么样？在外滩开这台车，整条路的人都在看您。': ('[warm salesy enthusiasm]', None, None),
}
DIRECTION_WHO = {'xuan': ('[warm, hearty]', None, None), 'zhixia': ('[rapid-fire, excited]', '[pleading, playful]', None)}


def directed(l, lang):
    """The line with its performance tags: before it, after its first sentence, before its last."""
    import re
    d = DIRECTION.get(l['zh']) or DIRECTION_WHO.get(l['who'])
    text = spoken(l[lang])
    if not d:
        return text
    start, last, after_first = d
    parts = re.split(r'(?<=[。？！?!.])\s*', text) if lang == 'zh' else re.split(r'(?<=[.?!])\s+', text)
    parts = [x for x in parts if x]
    if after_first and len(parts) > 1:
        parts[1] = f'{after_first} {parts[1]}'
    if last and len(parts) > 1:
        parts[-1] = f'{last} {parts[-1]}'
    out = ('' if lang == 'zh' else ' ').join(parts)
    return f'{start} {out}' if start else out


def fnv1a(s):
    h = 0x811c9dc5
    for b in s.encode('utf-8'):
        h ^= b
        h = (h * 0x01000193) & 0xffffffff
    return f'{h:08x}'


def voice_key(lang, text):
    return fnv1a(f'{lang}|{text.strip()}')


def spoken(text):
    """What the voice should say: no emoji, no [图片] / (电话) stage tags."""
    import re
    t = re.sub(r'^\s*[\[（(][^\]）)]{1,6}[\]）)]\s*', '', text)
    return re.sub('[\U0001F300-\U0001FAFF☀-➿]', '', t).strip()


def tts(voice, text):
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128',
                                 data=json.dumps({'text': text, 'model_id': MODEL, 'voice_settings': {'stability': 0.35, 'similarity_boost': 0.8}}).encode(), headers={'Content-Type': 'application/json'})
    return urllib.request.urlopen(req, timeout=180).read()


def main():
    lines = json.load(open(LINES))
    picked = []
    for p in PICKS:
        if ':' in p and not p.startswith('…'):
            who, kw = p.split(':', 1)
            hit = next((l for l in lines if l['who'] == who and kw in l['zh'] and l.get('en') and len(l['zh']) <= 90), None)
        else:
            hit = next((l for l in lines if l['zh'] == p and l.get('en')), None)
        if hit and hit['who'] in VOICES:
            picked.append(hit)
        else:
            print('not found / no voice:', p)
    chars = sum(len(spoken(l['zh'])) + len(spoken(l['en'])) for l in picked)
    print(f'{len(picked)} lines, {len(picked) * 2} clips, {chars} characters')
    if '--dry' in sys.argv:
        for l in picked:
            print(f"  {l['who']:8} {directed(l, 'zh')}\n           {directed(l, 'en')}")
        return
    man_path = OUT / 'manifest.json'
    man = json.load(open(man_path))
    ledger = json.load(open(LEDGER)) if LEDGER.exists() else {'model': MODEL, 'clips': {}}
    for l in picked:
        for lang in ('zh', 'en'):
            text = l[lang]
            key = voice_key(lang, text)
            data = tts(VOICES[l['who']], directed(l, lang))
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as t:
                t.write(data)
            f = OUT / f'{key}.mp3'
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', t.name, '-ac', '1', '-ar', '24000', '-b:a', '56k', str(f)], check=True)
            os.unlink(t.name)
            secs = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)], capture_output=True, text=True).stdout.strip())
            man['clips'][key] = [f.name, round(secs, 2)]
            ledger['clips'][key] = {'who': l['who'], 'lang': lang, 'voice': VOICES[l['who']], 'text': text}
            print(f"  {l['who']:8} {lang} {secs:4.1f}s  {text[:30]}", flush=True)
    json.dump(man, open(man_path, 'w'))
    json.dump(ledger, open(LEDGER, 'w'), ensure_ascii=False, indent=1)
    print('done')


if __name__ == '__main__':
    main()
