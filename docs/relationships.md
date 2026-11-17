# 回潮 Returning Tide — the five people Ji Bai might come to love

Five people with lives of their own. They write first, ask him out, are busy, disagree with him,
and leave. None of them waits indefinitely. Romance moves only through things that actually
happen in the game: conversations he turns up to, answers he gives, invitations he keeps.

## Where it lives

| File | What |
|---|---|
| `src/engine/hearts.js` | The rules. Pure, tested. State in `life.flags.hearts` |
| `src/world/romance.js` | The framework: the tick, presence, scenes, events from other systems, what free conversation is told, the journal's and the ending's text |
| `src/world/romance/kit.js` | What the content is written with (bilingual text, messages, answers and their consequences) |
| `src/world/romance/{zhiwei,nanxing,gunian,yuan,kexin}.js` | One person each: card, arc, schedule, memories, lines, dates, message beats, scenes, ending |
| `src/world/romanceScenes.js` | Them in the street: `SPOTS`, lazy actors, standing and seated scenes, fades |
| `src/ui/romance.css` | The journal's and the phone's bits |
| `tests/hearts.test.mjs` | The rules, and all five years played in node |
| `tools/heartwalk.mjs` | The same in the game, in headless Chromium |

Touched elsewhere, each minimally: `world/cast.js` (five entries), `world/personas.js` (cards from
`CAST`; `addressOf` / `relationTo`), `world/agendaEn.js` (one import, one lookup line),
`ui/sceneTalk.js` (an answer may carry `run`; `addNames`), `ui/journal.js` (People tab section; the
ending card's extra paragraph), `ui/phone/phone.js` (free chat for the five, a stage tag, an
"ask to see her" chip), `main.js` (16 new lines, listed at the end).

## The five

Ages and jobs as briefed. All five are women; each has her own Rocketbox avatar (below).

| | Who | Wants | How he meets her | Nature |
|---|---|---|---|---|
| 许知微 Xu Zhiwei, 28 (`zhiwei`) | The project manager on his first engagement. From Hangzhou, six years at the firm. Sharp, dry, guarded, fair when it costs her | Senior manager before thirty, then partner | She writes at 18:10 on day 1, and brings his pass and laptop to the Peace Hotel lobby that evening (20:20 to 21:35) | Has it out with him if he sees someone else; two unanswered overtures and she stops asking |
| 沈南星 Shen Nanxing, 26 (`nanxing`) | Independent photographer from Kunming. Shoots the Bund after the lights drop at ten. Awake till four | A first solo show; a three-month residency in Lisbon | At the railing north of Nanjing Road, any night 20:40 to 23:40 through day 10: he walks into her eight-second exposure. She notices the gimbal if he has built it | Doesn't police him, but won't commit to a man who sees others; three unanswered and she stops |
| 顾念 Gu Nian, 29 (`gunian`) | Tech investor and strategist: a partner at a small early-stage fund upstairs in the AIA Building. Shanghai-born, MBA abroad. Rational across a table, reserved across a dinner. Not one of his friends | A fund of her own (Slow Tide Capital: roadshow in May, first close in June) backing consumer tech for the long run | In the AIA Building lobby after office hours (18:20 to 20:40, through day 8): a start-up's fall-detection camera calls everyone who sits down a fall; she asks him to sit on the sofa for it, and he tells her what's wrong | Leaves at once if he is seeing someone else. She is nobody's option. She will never invest in him while they're together |
| 林予安 Lin Yu'an, 27 (`yuan`) | Product designer in San Francisco; the two years there they never named | Her green card; a job that isn't finishing other people's work | She writes first, from California, at 01:20 on day 2 (her morning). In person from June (day 13) | Asks him straight; the most patient of the five |
| 唐可昕 Tang Kexin, 25 (`kexin`) | Lifestyle creator from Suzhou: 180K on Xiaohongshu, 90K on Douyin. Knows Momo | Half a million followers; a small label of her own | Filming in the Jazz Bar on days 1, 3, 5, 7, 9 (20:15 to 23:30): he walks through her shot | Learns things in public; if she learns of someone else from her own comments, she is gone |

### Their years (Acts I to V)

- **Zhiwei.** I: the lobby, the kickoff, a weekly report he can write for her (her mother has
  turned up in Shanghai), a drink she owes him at the Jazz Bar and her rule about colleagues.
  II: she let the partner think his model was hers, and tells him so; one senior-manager slot
  between them; ten minutes by the river; the ratings in March and what being his reviewer would
  mean. III: the staffing list. IV: Singapore wants her for two years. V: she goes with something
  agreed between them, stays, goes without him, or is simply a colleague who has left.
- **Nanxing.** I: the railing; ten o'clock, the lights (the scene opens at 21:56 so the Bund's
  switch to late-night lighting happens during it); the Jazz Bar, where she says she isn't good at
  "together". II: Chongming with no signal (unreachable: her phone says so); a picture at two in
  the morning; Lisbon comes through, and whether he asks her not to go. IV: the photograph of him
  she took without asking; postcards at his four a.m.; they ask her to stay on. V: Hongqiao
  arrivals, or "don't wait for me".
- **Gu Nian.** I: the camera in the AIA lobby (Mingxuan writes the next morning: she has asked
  him who Ji Bai is); one o'clock at Manner on Hankou Road; the river cruise she has never taken
  (half the reason is a ticketing start-up she's looking at; a fade, then sunset at the pier).
  II: Lujiazui from the railing, every lit window a bet; "don't show me what you build, not yet";
  her question: where will he be after November? She tells him she's leaving to raise her own
  fund and shows him the office, upstairs from his bench in Yangpu. III: the roadshow; she says
  she'll be slow, and why. IV: first close; a second key on the table at the Jazz Bar (to her flat,
  never to the office); if he is building a company, she asks for his deck to tell him the worst
  of it, and won't invest; her fund's first deal is the camera from the night they met. V: she asks
  the question a second time. Her ending reads `life.flags.dinnerChoice`. Between acts
  (`src/world/allotEvents.js`), a small batch or a launch brings a message from her: her fund wants
  a meeting, unless he is seeing her.
- **Yu'an.** I: "So you really went back." His mug; a voice call from Clement Street about what
  the two years were. II: she is laid off; a Shanghai company wants her to come and look. III: she
  books the flight. IV: three months in Shanghai: the octagon hall, the river, the Jazz Bar, and a
  ticket that can be made one-way. V: Jing'an, or San Francisco (warmly, or not).
- **Kexin.** I: two seconds of him in her vlog (keep, cover his face, or cut); shengjian on
  Nanjing Road with no phone and no make-up; would he mind being posted? II: four hundred followers
  lost for telling the truth; a gossip account, and six figures for a "couple" series; a live
  stream where she says yes before asking him. III: a Hangzhou agency. IV: her own label, or
  Hangzhou. V: on the day of his dinner she posts nothing.

## The rules (`engine/hearts.js`)

- **Stage**: stranger → known → close → dating → together, or over. Feelings alone move nothing.
  `shared(L, id, kind, key)` records a real event once (with its memory); `decide(L, id, what)`
  records what he said he wanted (`step`, `commit`, `slow`, `friends`, `end`); `advance` moves the
  stage when `nextStage` finds nothing missing.
  - close: 2 shared events, trust ≥ 26
  - dating: a date, attraction ≥ 32, trust ≥ 26, and he has said so (`step`)
  - together: 2 dates or nights, attraction ≥ 45, trust ≥ 50, `commit`, no open rift, and nobody
    else being seen
- **Initiative**: `mayWrite` (she is free by her own schedule, not hurt, hasn't given up, and
  hasn't just written). `overture` counts what she sends; if it is always her (six in a row while
  they're seeing each other) she says so.
- **Availability**: `availability(L, id, slot)` from her schedule slot (busy, asleep, away) and her
  mood (hurt and unsure of him: not free).
- **Ignoring**: an unanswered message (−2/−2), a lapsed invitation (−4 trust, −3 attraction), a no
  (−1), a no-show (−12/−6, and she is hurt), a silence. After `NATURE.asks` of them she stops
  asking. He can still reach out (his own message or an "ask to see her"). If he doesn't within
  `NATURE.patience` playable days, she is gone: *faded* if they were only getting to know each
  other, *left* if they were seeing each other. Two no-shows: gone there and then.
  A silence counts against him only while something of hers is unanswered (every `patience` days);
  with nothing owed either way it takes three times as long to start counting.
- **Two at once**: noticed after `NATURE.sees` days (or at once if posted online). Gu Nian leaves;
  Zhiwei and Yu'an ask him, with two days to answer (choose her and the others are ended; refuse and
  she goes); Nanxing shrugs, never commits, and cools; Kexin asks, unless she learned it online.
- **Days**: `dayTick` once per playable day. The year is compressed (weeks pass between playable
  days), so patience is counted in playable days.
- **Memories**: `remember` (kept once per key, at most 40). Every key has a sentence in both
  languages in the person's file; that sentence is what the journal shows and what the model is told.

| | asks | patience | sees | on finding out |
|---|---|---|---|---|
| zhiwei | 2 | 2 | 2 | confront |
| nanxing | 3 | 3 | 3 | open |
| gunian | 2 | 3 | 2 | leave |
| yuan | 3 | 4 | 3 | confront |
| kexin | 2 | 2 | 1 | public |

## What is playable where

| | In the world | On the phone |
|---|---|---|
| Zhiwei | First meeting (Peace Hotel lobby); a seated drink at the Jazz Bar; a walk at the railing; a second seated evening (the ratings), which can end upstairs | 12 beats, 3 invitations, the Singapore decision |
| Nanxing | First meeting at the railing with her tripod; the lights at ten; a seated evening at the Jazz Bar (can end upstairs); the print at the railing. She is also simply there most nights | 12 beats, 3 invitations, postcards from Lisbon |
| Gu Nian | First meeting (AIA lobby); coffee at Manner; the cruise pier (tickets, a fade, sunset); the railing at night; the key at the Jazz Bar (seated; can end upstairs). She is at Manner at one every day | 11 beats (one in Mingxuan's chat), 3 invitations; between acts, a message on his small batch and on his launch |
| Yu'an | From day 13 only: the octagon hall, the river, a seated evening at the Jazz Bar (can end upstairs), the last night at the river | Acts I to III are phone only: messages, a voice call with answers |
| Kexin | First meeting in the Jazz Bar; shengjian outside the shop on Nanjing Road; a seated evening at the Jazz Bar after a launch (can end upstairs) | 9 beats, 2 invitations |

Intimacy is implied: the answer "I live upstairs" either gets a no, or the evening cuts through a
fade with one line to 07:20 the next morning in the hotel lobby. Nothing is shown.

Not built: her office scenes (the office is someone else's), anything in Lujiazui, walking
together (they stand where they are), her flat, his room as a place for scenes. Dates that would be
elsewhere (Suzhou Creek noodles, her studio in Hongkou, Lisbon) are told on the phone.

## For other systems

**Tell them things happened**: `romanceEvent(L, id, type, data)` from `world/romance.js`. `id` is
who hears (null: everyone in his life). They react in feelings, a memory, and a message.

| type | data | effect |
|---|---|---|
| `met` | | introduces her (use for Zhiwei when the office first shows her; harmless if already met) |
| `saw-fight`, `heard-fight` | | each takes it her own way (Gu Nian worst, Nanxing least) |
| `credit-taken` | | he took credit for her work: trust −12, she is hurt |
| `credit-shared` | | trust +8 |
| `covered-for` | | trust +8 |
| `stood-up` | | counts as one of her own no-shows |
| `career-change` | `{ track }` (`resigned`, `laidoff`, `startup`, `family`, `switched`) | each has a line; for Zhiwei, leaving the firm lifts her rule (`said.free`) |
| `posted-online` | `{ by, couple, bad }` | others hear; if Kexin posted them as a couple, anyone else he is seeing finds out |
| `promoted`, `hurt` | | Zhiwei on a promotion; all of them on an injury |

**Read state**: `heart(L, id)`, `stageOf`, `seeing(L)`, `standingOf` (engine); `presence(L, id)`
(where she is now and which scene is on), `datesAhead(L)`, `romanceStanding(L, id)`,
`romanceContext(L, id)`, `romanceEpilogue(L)` (world).

**Re-point places**: `SPOTS` in `world/romanceScenes.js`. Schedules and scenes name spots by id;
`office` and `lujiazui` are `null` (phone only) until they exist. Set them to `{ x, z, face }` and
give a schedule slot that spot to put her there. A scene's `spot` can be changed the same way.

**Free conversation**: `guardTalk(llm, getLife, getLang)` wraps `llm.chat`. When the persona is
one of the five it appends `romancePrompt` (her validated memories, the ledger's facts about them,
where things stand, where she is now, `lifeContext`) and the rule that she may refer only to what
is listed. With no model, or when she is unreachable or it is over, she says one of her own lines.
The reply is text only. What his own words do is bounded: writing or speaking to her counts as
him reaching out (`contact`), and nothing else.

**State**: `life.flags.hearts[id]` and `life.flags.hearts._` (fired beats, done scenes, news), plus
facts on the year's ledger (`fact(L, 'date' | 'night' | 'heart' | 'met' | 'stood-up' |
'covered-for' | 'credit-shared' | 'posted-online', …, [id])`). Save format v1. Messages,
invitations and the call log use `engine/life.js` as everything else does. Two side effects of
using it: `life.invite`/`answerInvite` create a `life.relations[id]` entry (unused), and
`talk.js`/`phone.js` keep their own `flags.spoke`/`flags.talked` logs.

A game begun before the year existed has none of this (`isYear(L)` is false).

## Honest notes

- **Faces.** Only the Rocketbox adults in `public/people/people.json` exist, and the crowd is cast
  from the same set. Zhiwei is `p5`, Nanxing `c8`, Gu Nian `c4`, Yu'an `c1`, Kexin `c3`. Each has
  her own, but the same faces walk past in the street, sit in the Jazz Bar (`p5` is also a guest
  there) and stand on the promenade.
- **Voices.** None of their lines is recorded. They are subtitles, the game's default for new
  lines (or the browser's or a local server's speech, if the player has chosen that).
- **Bodies.** They stand or sit. No walking, no gestures beyond the idle clip and a turned head;
  the camera Gu Nian is testing, and its beep when he sits down, are told by the narrator, not shown.
- **The calendar.** Invitations say "tomorrow" in a year where tomorrow can be two months on.
- **Measurement tools.** With `?q=` none of the five writes or appears unless `&hearts` is given,
  so the existing walk-throughs are unchanged.

## main.js: the lines added

```
import { runRomance, romanceCallChoice, guardTalk, ROMANCE_CALLS } from './world/romance.js';
import { createRomanceScenes } from './world/romanceScenes.js';
const HEARTS_ON = !params.has('q') || params.has('hearts');
guardTalk(llm, () => life, getLang);
world.hearts = createRomanceScenes({ … });            (3 lines, after `places = […]`)
places.push(world.hearts);
if (world.hearts) out.push(...world.hearts.talkables());             (talkables)
if (world.hearts.key(k)) { e.preventDefault(); return; }             (keydown, play)
if (ev.type === 'call-choice' && ev.choice) romanceCallChoice(life, ev.from, ev.choice);   (phone onEvent)
Object.assign(CALLS, ROMANCE_CALLS);
if (params.get('life') !== '0' && HEARTS_ON) runRomance(life);       (updateLife)
if (world.hearts) out.push(...world.hearts.mapBlips());              (mapBlips)
others.push(...world.hearts.others());                               (the crowd walks round them)
world.hearts.update(mode === 'pause' ? 0 : dt, player.body);         (frame)
```
