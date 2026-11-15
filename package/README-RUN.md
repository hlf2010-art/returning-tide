# 回潮 Returning Tide: how to play

1. Unzip this folder anywhere.
2. Double-click **Start (Mac).command** on the Mac, or **Start (Windows).bat** on Windows.
   The game opens in your browser at http://localhost:8000. Leave the small window open while you play.
   - It needs **Node.js** (https://nodejs.org) or **Python 3**. On a Mac without either, macOS offers to install Python the first time.
   - On the Mac, if it says the file can't be opened, right-click it, choose **Open**, then **Open** again (it's not from the App Store).
   - Use Chrome or Edge for the best results; Safari works.
3. Click **Begin**. Controls are in the pause menu and the main README.

## Optional: free conversation with a local AI (T to talk)
- Install Ollama (https://ollama.com), run `ollama pull qwen2.5:7b` once, and leave Ollama running.
- The game finds it the first time you talk to someone (Settings → Free conversation AI → Local server).
- Or choose **In the browser** in Settings (downloads about 1 GB once; Chrome or Edge).

## Optional: live voices for new lines
Every written line already has its own recorded voice. For lines an AI conversation makes up, you can run the
same voice model locally: see `source/tools/voice/server.py`, then Settings → Voices for new lines → Local voice server.

## Developing
`source/` is the full project. In it: `npm install`, then `npm run dev` (or `npx vite build` for a new `game/`).
