# Music in the world

There is no score laid over the game. The music you hear comes from a source in the world: Manner's playlist behind its window on Hankou Road, the doors of two stores on Nanjing Road East while they are open, and a DiDi driver's radio. Placement and loudness: `src/engine/speakers.js`. Playback: `src/world/music.js`. Off switch and credits: Settings, under "Music in shops and cars".

## The tracks and their licence

All nine are modern instrumentals that the artists themselves released on ccMixter under **Creative Commons Attribution 3.0** (https://creativecommons.org/licenses/by/3.0/). Each licence was checked on its own upload record on 18 November 2026. CC BY lets the game use them and ship them, provided it credits the artist, links the work and names and links the licence. The credits below appear in the game (Settings) and here. Nothing in the tracks was changed except the encoding (loudness levelled and re-encoded for the browser).

| Track | Artist | Plays at | File in public/music/ | Download from |
|---|---|---|---|---|
| nightWalk | airtone | cafe, radio | `airtone-nightwalk.mp3` | [ccmixter.org/files/airtone/56520](https://ccmixter.org/files/airtone/56520) (airtone_-_nightWalk.mp3) |
| Purple Nurple | Alex Beroza | cafe | `alexberoza-purple-nurple.mp3` | [ccmixter.org/files/AlexBeroza/27187](https://ccmixter.org/files/AlexBeroza/27187) (AlexBeroza_-_Purple_Nurple.mp3) |
| Shiro (Kirkoid Mix) | Kirkoid | cafe | `kirkoid-shiro.mp3` | [ccmixter.org/files/Kirkoid/43938](https://ccmixter.org/files/Kirkoid/43938) (Kirkoid_-_Shiro_(Kirkoid_Mix)_1.mp3) |
| Reflections in the Rain | Mana Junkie | cafe | `manajunkie-reflections-in-the-rain.mp3` | [ccmixter.org/files/mana_junkie/34419](https://ccmixter.org/files/mana_junkie/34419) (mana_junkie_-_Reflections_in_the_Rain.mp3) |
| Warm Vacuum Tube | Admiral Bob | shop | `admiralbob-warm-vacuum-tube.mp3` | [ccmixter.org/files/admiralbob77/59533](https://ccmixter.org/files/admiralbob77/59533) (admiralbob77_-_Warm_Vacuum_Tube_.mp3) |
| Emerge | Alex Beroza | shop, radio | `alexberoza-emerge.mp3` | [ccmixter.org/files/AlexBeroza/30132](https://ccmixter.org/files/AlexBeroza/30132) (AlexBeroza_-_Emerge.mp3) |
| Toronto Is My Beat | Whitewolf | shop | `whitewolf-toronto-is-my-beat.mp3` | [ccmixter.org/files/Whitewolf225/60181](https://ccmixter.org/files/Whitewolf225/60181) (Whitewolf225_-_Toronto_Is_My_Beat.mp3) |
| The night is calling | Kraftamt | radio | `kraftamt-the-night-is-calling.mp3` | [ccmixter.org/files/Karstenholymoly/62739](https://ccmixter.org/files/Karstenholymoly/62739) (Karstenholymoly_-_The_night_is_calling.mp3) |
| reNovation | airtone | radio | `airtone-renovation.mp3` | [ccmixter.org/files/airtone/60674](https://ccmixter.org/files/airtone/60674) (airtone_-_reNovation_1.mp3) |

Playlists: **cafe** (Manner Coffee, Hankou Road (all day; turned down 01:00-07:00)): nightWalk, Reflections in the Rain, Shiro (Kirkoid Mix), Purple Nurple; **shop** (Two store doors on Nanjing Road East (10:00-22:00)): Warm Vacuum Tube, Emerge, Toronto Is My Beat; **radio** (A DiDi driver's radio (while you ride)): The night is calling, reNovation, nightWalk, Emerge.

Credit lines (as the licence asks):

- “nightWalk” by airtone (https://ccmixter.org/files/airtone/56520), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)
- “Purple Nurple” by Alex Beroza (https://ccmixter.org/files/AlexBeroza/27187), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)
- “Shiro (Kirkoid Mix)” by Kirkoid (https://ccmixter.org/files/Kirkoid/43938), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)
- “Reflections in the Rain” by Mana Junkie (https://ccmixter.org/files/mana_junkie/34419), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)
- “Warm Vacuum Tube” by Admiral Bob (https://ccmixter.org/files/admiralbob77/59533), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)
- “Emerge” by Alex Beroza (https://ccmixter.org/files/AlexBeroza/30132), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)
- “Toronto Is My Beat” by Whitewolf (https://ccmixter.org/files/Whitewolf225/60181), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)
- “The night is calling” by Kraftamt (https://ccmixter.org/files/Karstenholymoly/62739), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)
- “reNovation” by airtone (https://ccmixter.org/files/airtone/60674), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)

## Adding the files

ccMixter does not allow automated downloads (it answers scripts with 403 Forbidden), and Free Music Archive requires a log-in, so the files were not fetched by a script. To add them:

1. On each track's ccMixter page (table above), use the download button. No account is needed.
2. Save the file in `public/music/` under the name in the table.
3. Optional, for size and even loudness: `ffmpeg -i in.mp3 -af loudnorm=I=-18:TP=-1.5 -ac 2 -b:a 112k public/music/<file>`.

A missing file is simply left out of its playlist. With none at all, the game is silent where the music would be and nothing breaks.

## Local artists

The owner wants local, contemporary Shanghai and Chinese music. Almost none of it is under a licence that allows a game to ship it, so local artists are being asked directly (the request letter is in Notion). A track joins a playlist with a line in `TRACKS` and `PLAYLISTS`, its credit, and the artist's written permission kept on file.
