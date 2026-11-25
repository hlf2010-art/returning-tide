# The city's sound by place

Positional ambience by zone, with distance falloff, on top of the existing bed (`src/engine/audio.js`):

- The rules are in `src/engine/soundscape.js`: where each sound is, how loud, when. They are pure and checked by `tests/soundscape.test.mjs`.
- They are played by `src/engine/ambience.js`.
- Everything new is synthesised in the browser. It reuses three things already in the game:
  - the CC0 shop music (`public/music/`, `docs/music.md`)
  - the crowd's murmur (`public/ambience/murmur.mp3`)
  - three recorded metro announcements (`public/voice/`).
- **No new files are downloaded:** the added download is 0 bytes.

## By zone

| Zone | What you hear | How it falls off | Made from |
|---|---|---|---|
| The river | The Huangpu at the wall (the existing loop), plus water slapping at the wall near the railing. The wind. A boat's horn from one of the cruise boats on the river, minutes apart at the least. | Full at the railing. About 0.75 on the deck's inner walk, 0.3 on the road (the river wall is in the way), 0.1 at the mouth of Hankou Road, nothing halfway down Nanjing Road or behind the buildings. Wind is 1 on the promenade, 0.7 on the road and 0.3–0.5 down the side streets. | Filtered noise and oscillators |
| Nanjing Road | Music out of eight shop doors along the street, open 10:00–22:00. It was two doors; six were added, one of them a tea bar playing the café list, each at its own place in the playlist. A shop's door chime whenever someone in the crowd walks in or out. The metro's announcements rising out of Exits 7 and 2 at Henan Road, every 40–75 s while the metro runs. | The music is full at the door and fades to nothing at 30–40 m (`engine/speakers.js`). Chimes carry about 26 m. The announcements are loud on the stairs and at the top, and gone 55 m off. | The CC0 shop tracks; a synthesised two-note chime; the game's recorded Kokoro announcements, through a ceiling-speaker band and the stairwell's reverb |
| The road | A traffic bed made from the vehicles actually near you, placed where they are. Every vehicle within 160 m adds to it by speed, by distance and twice over for a bus; an idling car adds a little. The existing per-vehicle tyre and engine voices go on top. Now and then a horn: a short tap, most likely from someone held up. A bus's air brakes sighing as it comes to rest. | The bed's level and position follow the traffic. Horns, sighs and individual vehicles have inverse-distance falloff. | Filtered noise, square-wave reeds, a noise burst |
| The arcades | Reverb on your footsteps, and lightly on the street, in four kinds of place: under the Customs House portico (stone, open on one side), in the Peace Hotel's marble arcades, in the AIA lobby, and down the metro stairwells (more the lower you go). | It fades in over the last 1–2.5 m into each place. | One convolver with a generated stone-hall impulse (2.4 s), its brightness set per place |
| People | The murmur follows how many people are near you. It now counts everyone (the crowd, the crossing's walkers, Old Lin and Ms. Su, the tai chi group), each counting 1 at your shoulder and 0 at 24 m. On top of that, up to three voices are placed on the people standing or in company nearest you, 2–14 m off. | The murmur's level comes from the count. The placed voices fall off with distance (HRTF). | Grains of the crowd's murmur through a voice band |
| Counters | The payment speaker on the counter saying what it just got, the way every shop's box does: "支付宝到账二十五元" ("Alipay received 25 yuan") or "微信收款十八元". When you pay at the shengjian shop's counter, or for a Manner order while you're at the shop, it says your amount. A customer in the crowd leaving a shop has paid about half the time (¥12 to ¥2,000). | Carries about 22 m; a small plastic speaker's band. | Recorded pieces strung together, as real boxes do (`engine/soundscape.js` payTokens, `public/ambience/pay/`) |
| The Customs House clock | "The East Is Red" on the quarters, building up to the whole tune on the hour, then the hour struck. From 22:00 to 07:00 the hours are struck without the tune. | Clear on the promenade, fainter across the road behind the buildings, faint at Henan Road. | Synthesised bells: chime partials for the tune, a big bell's partials for the strokes, an echo off the façades across the road |

### Horns are rare, on purpose

- **On the road:** horns have been banned inside Shanghai's Outer Ring Road since 1 June 2007, and offenders have been caught by cameras since 2016 ([The Paper, 2016](https://www.thepaper.cn/newsDetail_forward_1455006)).
- **On the river:** between the Yangpu and Xupu bridges, ships may sound their horns only in an emergency ([Shanghai noise report, 2026](https://sthj.sh.gov.cn/cmsres/c6/c692c51cbeed428fa12ede2f6ebf56a1/3dfdcfd940cab0bce8fa57b709ac1be4.pdf)).

So a car horn is about one every few minutes near busy traffic, and a boat's horn at most one every four minutes. The old far-ship horn, once a minute or two, now sounds every 7–17 minutes.

### The Customs House clock: what the real one plays

Checked on 24 November 2026:

- **The tune.** It plays "The East Is Red" (东方红) on the quarters, building up through the hour: "一刻时是一节音乐，半点时是两节，三刻时是三节，整点便是一首完整曲子". So one section at a quarter past, two at half past, three at a quarter to, and the whole tune on the hour ([People's Daily via ifeng, 1 January 2017](https://news.ifeng.com/c/7fb7sYzPSbz)). Xinhua still describes the tune at the hour ([2025-10-01](https://www.news.cn/20251001/b3a3d636f61c47e4a23226b8f1680323/c.html)).
- **Electronic, not bells.**
  - From September 2018 the tune was played electronically while the hammer still struck the hour.
  - From March 2019 both were electronic ([Shanghai Observer, 2019-12-18](https://www.shobserver.com/ydzx/html/195259.html)).
  - Wikipedia agrees that the tune is a recording over loudspeakers ([Custom House, Shanghai](https://en.wikipedia.org/wiki/Custom_House,_Shanghai)).
- **The strokes.** "一点敲一下，十二点敲十二下": one stroke at one o'clock, twelve at twelve, as the clock's keeper put it in 2019 ([Kankan News, 2019-04-28](https://kankanews.com/detail/lm2XNzYraQr)).
- **The hours.** "晚上10时以后只敲钟没音乐，直到早上7时": after 22:00, strokes without the tune until 07:00. This is one resident's account in 2019 ([Sohu / 申江服务导报, 2019-12-13](https://www.sohu.com/a/360138113_391464)); no official schedule was found.
- **History.**
  - Westminster Quarters from 1928.
  - "The East Is Red" from 1966.
  - Westminster again from 1986.
  - "The East Is Red" again from 2003; one source says 1997 ([The Paper](https://www.thepaper.cn/newsDetail_forward_1767305)).
- **The bell.** The hour bell is a John Taylor bell, about 366 Hz ([bell historians' list, 2007](https://lists.ringingworld.co.uk/pipermail/bell-historians/2007-January/011566.html)). The game strikes at that pitch and plays the tune in the same key.

What is not certain:

- The exact notes of the tune's **third and fourth sections** (他为人民谋幸福 / 呼儿嗨哟，他是人民大救星) were written down from memory and **not checked against a score**. The first two sections are the opening everyone knows.
- The timbre of the real recording is not known. The game uses a tubular-chime sound.

### Not done

- **No new spoken shop announcements.** The game has no recorded line for one, and the Kokoro voice model was not run in this container, so no new lines were recorded. The street's announcements here are the metro's, rising out of the exits.
- Whether Nanjing Road's shops are allowed to use outdoor loudspeakers was not checked.

## Sources and licences

| Sound | Made by | Where | File | Licence |
|---|---|---|---|---|
| Water at the wall, wind, slaps, boat horns, far-ship horns | this game's code (Web Audio synthesis) | the river | none | made for this project |
| Traffic bed, car horns, bus air brakes, per-vehicle voices | this game's code | Zhongshan East 1st Road, Henan Road | none | made for this project |
| Door chimes | this game's code | Nanjing Road's shops | none | made for this project |
| Reverb (a generated impulse) | this game's code | the portico, the Peace Hotel arcade, the AIA lobby, the metro stairs | none | made for this project |
| The Customs House chimes and strokes | this game's code; the tune "The East Is Red" is a Shaanbei folk melody in the public domain | the Customs House tower | none | made for this project; the melody is public domain |
| Shop music (14 tracks) | see `docs/music.md` | eight Nanjing Road doors, Manner, the DiDi radio | `public/music/*.mp3` | CC0 1.0 |
| The payment speaker's pieces (支付宝到账, 微信收款, 零-九, 十, 百, 千, 点, 元) | ElevenLabs (eleven_v3, premade voice "Lily"), one take cut at the pauses by `tools/voice/paybox.py`; checked by transcribing stitched amounts | every counter | `public/ambience/pay/*.mp3` (17 files, about 40 KB) | made for this project (generated speech, used under the ElevenLabs terms) |
| Ji Bai catching his breath (two loops: heavy, easing) | ElevenLabs sound generation, looped with their breathing envelopes by `tools/voice/breath.py` | you, after running out of stamina | `public/ambience/breath/{heavy,ease}.mp3` + `.json` (about 140 KB) | made for this project (generated audio, used under the ElevenLabs terms) |
| The railing's sigh at 22:00 ("awww", then a laugh) | ElevenLabs sound generation | the promenade, at the late-night switch | `public/ambience/lights-out.mp3` (49 KB) | made for this project (generated audio, used under the ElevenLabs terms) |
| The crowd's murmur | made for this project with Kokoro-82M (Apache-2.0), `tools/voice/walla.py` | everywhere people are; the placed voices | `public/ambience/murmur.mp3` (already shipped) | made for this project |
| Metro announcements (3 lines) | made for this project with Kokoro-82M (Apache-2.0), `tools/voice/generate.py` | Exits 7 and 2 at Henan Road | `public/voice/*.mp3` (already shipped) | made for this project |

Credits:

- Synthesised sounds (water, wind, horns, traffic, chimes, bells, reverb): made for this project in Web Audio; no recordings.
- "The East Is Red" (东方红): traditional Shaanbei folk melody, public domain; played here as synthesised chimes.
- The shop music: the fourteen CC0 tracks credited in `docs/music.md`.
- Voices (the murmur, the metro announcements): generated for this project with **Kokoro-82M** by hexgrad (Apache-2.0), https://huggingface.co/hexgrad/Kokoro-82M.

## Checking it

- `npm test` runs `tests/soundscape.test.mjs`, which checks the zones, the falloff, the traffic bed, horn rates, reverb, chatter, the talkers and the clock's schedule.
- In the browser, these numbers were measured in headless Chromium on 24 November 2026:

| Check | Result |
|---|---|
| River level | 0.20 at the railing, 0.00004 halfway down Nanjing Road |
| Wind level | 0.15 at the railing, 0.046 halfway down Nanjing Road |
| Reverb wet | 0.42 in the Peace Hotel arcade, 0.18 halfway into the Customs House portico |
| The clock at 18:00 | Rang by itself as the minute crossed the hour, with six strokes. Output RMS on the promenade rose from 0.046 to 0.077 while it played. |
| Metro announcement | Played at the top of Exit 7 at level 0.10 (since raised to about 0.17) |
| Door chime | Fired |

- What was not judged: whether any of it *sounds* right. That needs ears, ideally against the reference footage's soundtrack.
