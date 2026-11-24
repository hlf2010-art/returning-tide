# 回潮 Returning Tide: how to play

1. Unzip this folder anywhere.
2. Double-click **Start (Mac).command** on the Mac, or **Start (Windows).bat** on Windows.
   The game opens in your browser at http://localhost:8000. Leave the small window open while you play.
   - It needs **Node.js** (https://nodejs.org) or **Python 3**. On a Mac without either, macOS offers to install Python the first time.
   - On the Mac, if it says the file can't be opened, right-click it, choose **Open**, then **Open** again (it's not from the App Store).
   - Use Chrome or Edge for the best results; Safari works.
3. Click **Begin**. WASD walk, mouse look, E act, **M map**, **J journal**, **P phone**, T talk, Shift+M mute,
   Esc pause. A gamepad works too (left stick walk, right stick look, A act, B back, Y phone, RB map).
   Short tips appear the first time you need them; the full list is in the main README.

## Saves
Your game saves itself. **Esc → Saves** has three slots: copy your game into another slot, load a slot,
and **export** a slot to a file (keep it safe, or move it to another computer) and import it back.

## How fast it runs on your machine
**Esc → Settings → Graphics → Benchmark** runs a 30-second route through the busiest hour and reports the
average frame rate and the 1% low. Try the presets (Mac M4 on a Mac mini M4; High or Ultra on an RTX
4080 SUPER) and keep the one that holds a steady frame rate.

For the hero-shot benchmark (four fixed views of the Bund and Nanjing Road), open
http://localhost:8000/?bench and click **Start the benchmark**. After about a minute and a half the result
appears on screen: **Copy the result** and send the text back. Nothing is saved to your game while it runs.

## Optional: free conversation with a local AI (T to talk)
- Install Ollama (https://ollama.com), run `ollama pull qwen2.5:7b` once, and leave Ollama running.
- The game finds it the first time you talk to someone (Settings → Free conversation AI → Local server).
- Or choose **In the browser** in Settings (downloads about 1 GB once; Chrome or Edge).

## Optional: live voices for new lines
Every written line already has its own recorded voice. For lines an AI conversation makes up, you can run the
same voice model locally: see `source/tools/voice/server.py`, then Settings → Voices for new lines → Local voice server.

## Developing
`source/` is the full project. The people, voices, models and textures ship once, in `game/`: run
`source/restore-assets.sh` (or copy `game/people`, `game/voice`, `game/models`, `game/textures`, `game/ambience` into
`source/public/`) first. Then in `source/`: `npm install`, then `npm run dev` (or `npx vite build` for a new `game/`).
