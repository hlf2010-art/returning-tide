# Fighting: one row outside the Peace Hotel

Returning Tide is a life simulation. Fighting in it is rare, ugly, short, and it follows you home.
There is exactly one confrontation in the game: late one evening on Nanjing Road East, by the Peace
Hotel, a man out of a long client dinner won't let a young woman go. Most ways through it end with
nobody hit.

| File | What it holds |
|---|---|
| `src/engine/fight.js` | The rules. Pure (no three.js, no DOM): the dispute, the blows, the consequences. |
| `src/world/fightText.js` | Every line, Chinese first and English, as `[who, zh, en]`. Pure. |
| `src/world/confrontation.js` (+ `.css`) | The scene: the people, the conversation, the first-person fight, the officers. |
| `tests/fight.test.mjs` | 81 checks of the rules and the words: `node tests/fight.test.mjs`. |
| `tools/fightwalk.mjs` | A Playwright walk through five roads and the morning after. |

## When it happens

- Once per game (`life.flags.fight.seen`), only in a game that has the year (`engine/year.js`); older
  six-day saves are left alone.
- From the second day on, between 21:40 and 00:40, when you are on Nanjing Road East between the
  hotel and about 60 m west of its door, at street level, and not in the middle of anything else
  (not on the phone, not talking, no street moment or gimbal test running).
- It is placed under a street lamp on the hotel's side, out of your view if it can be, 9 to 34 m away.
- Off for measurement tools (`?q=`) unless `?fight` is in the URL. Tools start it with
  `window.__bund.world.confront.debug.start()`.
- If you close the game in the middle of it, it counts as having walked past.

## How it plays

**Notice.** You hear them before you reach them. `E` on him steps in. Walking on (more than about
34 m away after having come near, or nearly three minutes) is the outcome `passed`.

**Talk** (mode `fight`, answers `1`-`4`). He turns on you. The tree (`NODES` in `engine/fight.js`):

| Where | What you can do |
|---|---|
| first | talk to him · step between them · get someone · walk away |
| he's talking | give him a way out · point at the cameras · threaten him · call 110 |
| he has shoved you | palms open, don't hit back · shove back · shout for security · call 110 |
| you squared up | hit first · hands up, let him come · step back |
| getting someone | the hotel's security · 110 |

Thirteen ways through; nine end without a blow, four come to one.

**Blows** (still mode `fight`). First person, him in front of you, your hands up. Your eyes stay on
him (the mouse or right stick still moves them; they come back).

| Do | Keyboard / mouse | Gamepad |
|---|---|---|
| Jab (quick, light) | `F` or left click | A |
| Cross (slower, heavy) | `R` or right click | Y |
| Guard (hold) | `Space` | X or LT |
| Slip to the side | `A` / `D` (tap) | left stick left / right |
| Step in / step out | `W` / `S` | left stick |
| Back off and get away (hold) | `Q` | B |

None of these does anything else while a fight is on (`Space` does not jump, `E`/`P`/`T` from the
gamepad are the punches and the guard). The fight cannot be paused; it lasts half a minute at most.

He telegraphs: an effort grunt and a scuff, then the arm goes back and wide (a haymaker, about 0.6 s),
both hands pull in to his chest (a shove, 0.4 s), or a fist cocks at his ear (a short straight one,
0.35 s). Then the blow, then a recovery in which he is open.

- **Slip** in the last third of a second of the wind-up and he hits air; too early and he has turned
  with you. A slip leaves him open longer and your next punch counts for more.
- **Guard** takes four fifths of a blow and costs wind; with no wind left the guard breaks.
- **Step out** of reach works as well.
- **A punch lands** only in reach and facing him. On a man who is set it is a glancing thing; in his
  recovery it is whole. A cross that lands clean staggers him and takes some of his nerve. A jab early
  in his wind-up stops it (he comes straight back with a short one you can't stop).
- **No button-mash.** Every punch costs wind; punches thrown one on top of another get weaker and from
  the third move nobody; a held key throws at most one extra. Hammering the jab gets you knocked down.
- The HUD is two thin bars at the bottom: how you are, and your wind. His state you read off him.

It ends in one of four ways:

| Outcome | How |
|---|---|
| `won` / `backed` | three clean crosses or so and he has had enough: hands up, "不打了" |
| `won` / `spent` | you never hit him; he swings at air until he can't breathe |
| `won` / `dropped` | you hit him after his hands went up. He goes down. That is on you. |
| `broke` | you held `Q` and got 3 m clear for a second |
| `down` | your health ran out |
| `separated` | ten exchanges or 32 seconds: the hotel's security pulls you apart |

## What follows (the point)

`settle()` works it all out and `applyOutcome()` applies it once; `onOutcome` listeners get the result.

- **Injury** (`engine/year.js` `injure`, a night per level to heal, in `lifeContext` so people see it):
  1 skinned knuckles and bruised forearms · 2 a black eye and a split lip (health at 55 or less) ·
  3 four stitches over an eyebrow (you went down). The next day: a line in the mirror, the doorman
  asks about your face, Yu'an messages.
- **Police.** They come if someone called 110, someone went down, you were pulled apart, you hit a
  man who had stopped, or it went on (blows given, heavy ones again, and blows taken add up to 7).
  They ask who started it; you can tell it straight, shade it ("he started it, I only defended
  myself"), or say little.

  | What happened | Verdict | Cost |
  |---|---|---|
  | you only called, nobody hit | statement | 20 min |
  | attacked and never hit back | statement | 25 min |
  | he swung first, you hit back | warning (an affray, mediated) | 100 min |
  | you swung first, or hit him when he'd stopped, or put him down with heavy blows | fine ¥500 (¥200 if you own up) | 160 min |
  | you shade it and the bystander's video says otherwise | fine ¥500, and the street hears | 160 min |
  | you shade it and nobody filmed | warning | 100 min |

  Saying little adds 30 minutes. Going down adds A&E: 150 minutes and a ¥420 bill. The time is taken
  off the clock through a fade; after blows you come out at the hotel door.
- **Reputation** (`rep(L, 'street' | 'online' | 'work')`). Street: +4 talked, +5 stood, +2 security or
  110, -2 walked away, and the verdict on top (+1 / -4 / -10). Online only if the bystander filmed (he
  does once it gets physical): +5 for taking a shove without giving one back, +3 or +4 for defending
  yourself, down to -9 for throwing the first punch. Work: -2 for a warning, -8 for a fine, -6 more if
  the clip shows it was your doing, -1 for turning up with a black eye.
- **Whoever was with you** (`engine/hearts.js` `feel`, and a `fight` memory): more if she was the one
  he was bothering than if she watched. Talking him down or standing your ground builds trust;
  walking away costs it badly; violence you started frightens her.
- **The morning after** (08:10): Momo has heard from the bar staff; if it was filmed the clip is in
  the group chat; Yu'an if your face shows it; a 110 receipt if the police were involved; a message
  from whoever was with you. All in Chinese, with English in `EN_FIGHT` (the phone finds it).
- **The ledger.** One `fact(L, 'fight', { outcome, how, where, against, blows, started, landed, took,
  hurt, police, fine, filmed, minutes }, [companion])`. `fightContext(L)` is a ready sentence for the
  characters' free conversation (not yet wired into `world/story.js`, which this work did not touch).

## Hooks for other systems

```js
const c = window.__bund.world.confront;        // in main.js: world.confront
c.setCompanion({ id: 'zhiwei', as: 'target' | 'witness', name: { zh, en },
                 avatar: 'c8',                 // a role in people.json, used if she has no body here
                 at: () => ({ x, z }) });      // if she is already in the world beside you
c.onOutcome((result, life) => { /* result.outcome, .how, .blows, .started, .level, .police, .rep,
                                    .feel, .companion, .minutes ...; set result.companionWrites = false
                                    to send her morning message yourself */ });
c.active;                                      // null | 'notice' | 'talk' | 'blows' | 'after' | 'gone' | 'end'
c.debug.start({ near: true });                 // tools: here and now (resets flags.fight)
```

State: `life.flags.fight` (`seen`, `applied`, `day`, `morningAt`, `result`, `morning`, `mirror`,
`doorman`), the fact in `life.flags.year.facts`, the injury in `life.flags.year.hurt`. Save format v1
is unchanged.

## What is procedural, honestly

The Rocketbox set has idle, look, talk, phone, walk, jog, wave, shrug and angry. There are no combat
clips. Everything below is posed on the bones every frame, over the idle / angry / walk clips:

- **His stance, wind-ups, blows, follow-through, flinch, stagger, hands-up and bent-over poses:**
  two-bone IK on each arm to hand-written targets in his own frame, turns of the spine (lean, twist,
  roll) and neck, eased between poses at a rate per state. The punch aims at your eye and stops at arm's
  length. His drunken sway is two sine waves on the spine.
- **Fists:** each finger turned about the line of the knuckles. Open hands are the clip's own.
- **Your hands:** the first-person body's arms by the same IK, in the camera's frame: fists, guard,
  the jab and cross going out to his head and back, open palms in the talk, hands up when backing off.
  Your legs do not step in the fight (you glide the short distances), and the body's shadow keeps the
  idle arms.
- **Going down:** his whole figure turned onto its back about his feet; yours is the camera dropping
  and rolling. No ragdoll, no get-up.
- **Walking backwards:** the walk clip run backwards.
- **The officers:** two of the ordinary cast tinted navy with a made cap and a fluorescent tube of a
  vest reading 警察 POLICE. The set has no uniforms.
- **A&E:** a dark card with a caption and the conversation over it. There is no hospital to stand in.
- **Sound:** small synthesized thuds, swishes, a grunt and a gasp through the game's audio context,
  plus the existing `bump` cue. No recorded voices for these lines (subtitles; the game's voice
  settings apply).
- **Light:** the scene uses the street's own lamps. At the lowest quality step it is dim.

## Not built

Boxing or martial-arts training (a pad or sparring session reusing these rules) was left out so the one
scene could be finished. `createFight({ him: { ... } })` already takes a different opponent's numbers.
