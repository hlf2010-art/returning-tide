# Research: making the hero characters and their Mandarin voices

*25 November 2026, background research (web sources as linked). For Ji Bai and about ten important characters.
Crowds, buildings and props come from free assets.*

## Bottom line
- **AI 3D generators can't make close-up hero humans yet** (Hunyuan 3.1, Tripo 3.1, Meshy 7.1, Rodin Gen-2.5 and others: faces, hands and deforming topology are the weak spots). Use them for props, bags, shoes and blockouts.
- **What works:** a parametric base mesh (clean topology, rig and face shapes included), then likeness work, hand-made hair cards, and AI for references, textures and props.
- **The current Hunyuan Ji Bai (`public/people/player.glb`) can't be rescued for close-ups** (texture detail spread across thousands of UV islands); keep it as a silhouette reference.
- **The owner's Mac matters:** Character Creator 5 and MetaHuman Creator are Windows-only.

## Recommended pipeline (free first)
0. **One-time setup (1-2 weeks, mostly agent work):** headless Blender scripts from a JSON character sheet (build, export, compress, validate); a three.js review page (turntable and dialogue-camera shots in game light); one shared skeleton.
1. **Reference:** AI portraits (front, ¾, profile) and an outfit sheet; invented faces only; the owner picks.
2. **Base body and face: MPFB2** (free Blender add-on, runs on a Mac; output CC0, [licence](https://static.makehumancommunity.org/about/license.html)); 2.0.15 adds 54 ARKit face shapes and 15 visemes. An agent sets the sliders from the reference; a human judges. Optional: KeenTools FaceBuilder for likeness (~$18/month). Paid route if a Windows PC can be borrowed: CC5 ($299) + Headshot 3 ($199) for the best likeness per hour (check Reallusion's terms for a web game first). MetaHuman: licence now allows other engines, but far too heavy for three.js.
3. **Skin:** the head gets its own UVs and 2048 maps; CC0 MPFB skins; project the chosen portrait (Blender camera projection or StableGen), upscale (Real-ESRGAN), bake AO and cavity, a roughness map.
4. **Hair: cards, never AI meshes** (CC0 MPFB hair or a Blender card tool), `alphaHash`/alpha-to-coverage, anisotropic highlight. The biggest time sink; needs a human eye.
5. **Clothes:** CC0 MPFB garments retextured; Marvelous Designer for signature outfits (~$39/month).
6. **Rig and animation:** the MPFB rig; a shared animation library retargeted in Blender, shipped as shared GLBs (as anim-m/anim-f now). Mixamo still works (royalty-free in games; unmaintained: archive what's needed). Rokoko Vision for custom moves from video (30 s/month free).
7. **Lip sync:** offline per line: timestamps -> pinyin -> 15 visemes -> a small JSON track, plus blinks and eye darts. TalkingHead (MIT, three.js) fits MPFB's shapes and rig; needs a Chinese module.
8. **Export:** Blender glTF -> gltfpack or glTF-Transform; meshopt (not Draco: Draco leaves face shapes and animation uncompressed); KTX2 textures.

## Budgets per hero (Safari on a Mac)
25-40k triangles (head 8-12k, body and clothes 12-20k, hair 5-12k); ~65 bones; **the head as its own mesh** so face shapes don't multiply GPU memory (67 shapes on a 30k-vertex body ≈ 64 MB vs ≈ 17 MB on an 8k-vertex head); textures head 2048, body atlas 2048, hair 1024-2048, eyes 512, as KTX2; ≤ 5-8 MB per hero GLB.

## Quality and tricks
MPFB convincing at 1.5-3 m, a little plastic in tight close-ups; CC5 better. Frame dialogue as a medium close-up with a narrower field of view; soft key and rim light with an HDRI; get the eyes right (eyeball, cornea highlight, occlusion, tear line); keep faces moving (blinks, eye darts, breathing, look-at); hair cards over a scalp cap; loose modern clothes. Ji Bai is first person: mostly arms, plus a model for mirrors and cutscenes.

## Effort
After the pipeline exists: MPFB route 1.5-3 days elapsed per character (6-12 h of human attention); CC5 about 1 day (4-6 h). Agents: Blender scripting, slider fitting from screenshots, retargeting, viseme tracks, batch voices, validation. A human: facial appeal (especially the five romance leads), hair silhouette, skin and makeup, clothing clipping, uncanny expressions, listening to Mandarin.

## Mandarin voices
- **Recommended (free, commercial, local):** design each voice with [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) (Apache-2.0: voice from a text description; clone from ~3 s); produce lines with Qwen3-TTS or CosyVoice 3 (Apache-2.0; pinyin fixes, instructed emotion); [IndexTTS-2](https://github.com/index-tts/index-tts) for emotional scenes (custom bilibili licence: free under RMB 1bn revenue). All run on Apple Silicon via mlx-audio; CPU works for batches but slowly.
- **Paid where a native speaker hears the difference:** MiniMax Speech 2.8 HD (first in a 2026 listener test; ~$100 per million characters, voice design $3); Doubao Seed-TTS 2.0.
- **Fallback:** ElevenLabs v4 (Mandarin much improved); commercial rights from Starter ($6/month). **Free-plan output is non-commercial: every existing ElevenLabs line must be regenerated on a paid plan before release** (see `docs/sound.md`).
- Ship lines as AAC/m4a, one per file, generated with a fixed reference clip and seed.

## Red flags
F5-TTS and Fish S1-mini weights are non-commercial; the open Hunyuan3D licence excludes the EU, UK and South Korea; Meshy and Tripo free tiers need attribution; open video-to-mocap (GVHMR, WHAM) depends on SMPL, non-commercial unless licensed; Reallusion content licences may limit a web game (get written OK); Daz needs per-asset interactive licences; Ready Player Me closed (January 2026); Mixamo unmaintained. File-size traps: AI meshes at 0.5-1.5M faces, face shapes on a whole-body mesh, PNG textures in GPU memory, Draco not compressing face shapes, per-character animation copies, WAV dialogue.
