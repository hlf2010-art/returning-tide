# The year: the narrative spine and the working life

*Ji Bai (纪白), 27, back from the Bay Area, joins Marlowe Finch (迈芬咨询), an international
technology consulting firm on the 28th floor of IFC Tower 2 in Lujiazui. He has a year to make a
life of his own in Shanghai before the dinner with his father at the Peace Hotel. All firms, clients
and people here are invented.*

A new game is seventeen playable days in five acts (`engine/year.js`). A game begun before the year
existed keeps its six days and its old dinner; nothing in this document applies to it except the
journal's act labels and the watch-repairer's side story.

## Where the code is

| File | What |
|---|---|
| `src/world/careerScenes.js` | Acts I-III at the firm: ten working days, zh/en. The firm, client and names. |
| `src/world/careerRoads.js` | Act IV: four roads of four working days each (consulting, a new employer, a start-up, the family works). |
| `src/world/career.js` | The rules, pure: a day at work, a day skipped, `rollover` (absences, salary, rent, the start-up's month), the Act III decision, the flat, the watch-repairer afterwards, the messages, `careerEvent`. |
| `src/world/careerStory.js` | The act quests, the dinner a year on, the endings' texts and afterwords, what free conversation is told, colleagues' persona cards. |
| `src/world/yearWorld.js` | In the world: the firm's floor, the flat, days played over a card, the stall, the date chip, the new day's announcement, the routing of arrivals. |
| `src/ui/year.css`, `src/ui/journal.js` | The date chip and card; the journal's five acts, date, side story and "The year" page. |
| `src/world/story.js` | Acts renumbered; year-aware texts; `endingOf`, `afterword`; `storyContext` with the ledger of facts. |
| `tests/career.test.mjs`, `tools/yearwalk.mjs` | The year in node (every road to every ending); the year in the browser. |

State: everything is under `life.flags.year` (`year.work = { through, days, story, road, watch }`,
`year.career.startup`, `year.home`), plus plain flags (`handoff`, `rentNorthbund`, `goStartup`,
`goFamily`, `yuanLamp`, ...). The save format is still v1.

## The calendar in play

- The clock still runs real hours inside a playable day. The HUD carries the date and the act
  ("Tue 10 Nov · Act I · New Beginnings"); the phone's lock screen and calendar, the journal, the map
  and the save slots show the date too. A six-day game still says "Day N".
- Sleep (the bed in 612, or in the flat) from 18:30 in a year game. When the night crosses a gap the
  fade says so ("2 months later · Mon 11 Jan 2027"), and so does a wait from the journal.
- When the clock reaches a new day (however it got there) `career.rollover` closes the days gone by
  and `year.settle` pays: salary in, rent out, once per month that has passed. A toast says what
  moved ("salary +¥84,000 · rent −¥25,600"); a new act is announced.
- Working days are Monday to Friday: days 2-5, 7-12 and 13-16. A working day he doesn't go to
  costs him (standing −8, his name in the trade −3, his manager writes; −12 if it was the
  demonstration) and the day's decision is made without him.

## Act by act

**I · New Beginnings (9-14 November 2026).** The existing first night, Momo's set, the robot arm on
32F and Dad's offer run as before (they are numbered Act I now). New: `act1-work`, four days at the
firm (first day; the client's kick-off and its impossible date; a page of his presented under
someone else's name; six hundred duplicated rows in the evaluation set), and `act1-home`. The firm
is four floors under the robot-arm start-up: on days when Mingxuan expects him at three, the second
lift goes up to 32F.

*His skills at work* (`engine/skills.js`, `world/skillChoices.js`): answers can carry `sk`
(experience in Software & AI, Product or Hardware) and `needs` (offered only at a level, with an
`else` in its place below it). The firm's own AI work runs alongside Donglan: on the Thursday the
partner wants a click-through "agent" for Shenjiang Bank's reconciliations (申江银行, invented);
Ji Bai can build a real one on the bank's sandbox over the weekend (scored on fifty real breaks,
the misses shown), sit in their operations room first, mock it in Figma, or pass it to Shao Feng.
In January it comes back: a pilot signed (and whether the model runs in the bank's own machine
room or on a cloud API), or a delivery team finding nothing behind the clicks. In March the
remediation asks for an evaluation set before any number goes in a deck, or the redaction moved
into Donglan's machine room (a multimodal model that boxes names and IDs on photographs, his only
at Software & AI 5), or a new OCR vendor. The robot-arm review upstairs has its own versions
(`world/destScripts.js`): the bench, a kilohertz of logs, a slip sensor with a model on the
controller, a grasp-point model, or the product question; the investor demo follows what he wrote.

**II · Corporate Reality (January-March 2027).** `act2-project`: the number on page three (94 %
reported, 71-89 % real, depending on what he did in November); the live demonstration that fails in
front of the client's chairman (an invented policy clause, a real person's ID on the projector);
the remediation report (a flattering "validated sample", and automatic rejections with nobody
reading them: sign, refuse and write to the client's compliance department, sign with an appendix
and human review, or ask for a day and let his manager sign alone); and the hunt for a "root
cause" with a junior analyst's name on it.

**III · Turning Point (19-20 April 2027).** `act3-turning`: head office cuts thirty per cent. The
partner can protect one person, for a signature. On Tuesday he stays (if they will keep him),
resigns, takes the package (or, if he was safe, puts himself on the list in the analyst's place),
or leaves for Yushen Technology (only if Gu Lei offered, which he does only for someone who earned
it). `setTrack` records it. Not turning up settles it without him.

**IV · Building a Life (June-October 2027).** `act4-road`, by track:
- *consulting*: Donglan's second phase; a conflict of interest when the firm quotes for his
  father's works; forty jobs at the client; a year-end rating and bonus by standing.
- *switched*: Yushen Technology, an in-house scheduling product; Old Qin from the works at a trade
  fair; a night shift overloaded by "fully automatic" scheduling; options and three years.
- *startup*: offered by Mingxuan that evening, never forced. Two desks on IFC 32F beside the
  robot-arm team: a name (three), a product (three), ¥300,000 paid in from his own bank; a first
  customer (the arm team, his father's works as a pilot, or Donglan if his name is good); a hire;
  Mr Wang's money with or without a ratchet, or none, or his father's; the renewal. The company
  spends by the month; if its account empties, his bank covers it.
- *family*: offered by Dad that evening, never forced. The works in Nanjing: the new line's
  system, tape over a camera, a ninety-day audit, a nameplate in a drawer.
- *resigned / laidoff with neither accepted*: no employer, no road; a freelance job is offered
  once. The dinner and the endings know this state too.

**V · The Final Dinner (Saturday 13 November 2027).** The same table, the same four answers, the
same six endings chosen the same way. The dinner now knows the road he took and how it went, the
flat or the year in a hotel, and what he stood up for. "Together" is reachable through the
start-up (a customer and money in the account), the family road (two days in), or Yushen (the
planner's veto or the two weeks on a shop floor), as well as through the robot-arm demo. The ending
card tells the same six endings without the old week's furniture, and adds an afterword for the
road, joined to the gimbal's afterword from `world/work.js`.

## Housing and money

He starts in room 612 on the firm's allowance, which runs to 9 December; from January the hotel
is ¥36,000 a month through `settle`. From the Wednesday afternoon a letting agent writes on WeChat
with three flats (Tilanqiao ¥6,200, the North Bund ¥12,800, Dianchi Road ¥19,500): answering takes
a deposit, the first month and the fee from the bank, sets `home`, and adds "My flat" to DiDi. The
flat is one room at three heights (the North Bund one has the view): a bed, a desk that opens the
notebook, a door (a DiDi to the Bund, or straight to work). Once he has a flat the key card for 612
stops working. Yu'an sends a floor lamp if asked. Salary 42,000 (48,000 if promoted, 52,000 at
Yushen, 30,000 at the works); severance N+3; a year-end bonus on the consulting and Yushen roads.

**Not built:** furnishing or decorating the flat (beyond the lamp), utilities, food and daily
costs, buying property, a lifestyle that changes how people see him, a checkout scene at the hotel,
visiting Nanjing outside the family road. The three flats share one plan and differ in height,
palette and curtains.

## The missing watch-repairer

Mission One is untouched. When the pouch is handed over, its outcome is now kept in the save
(`flags.handoff`) and the journal shows it as a side story. From January to April his daughter is at
the stall on Hankou Road. If he broke the seal he can tell her the date he read (two days after her
father vanished); in June she writes that the forged transfer was undone and the stall saved. If
the seal was whole he can only say he carried it, and the stall is lost (Old Lin trusted him more
for it). If he says little, or never goes back, the stall changes hands.

## Free conversation

`storyContext` now gives every friend, colleague and client `lifeContext(L)` and
`careerContext(L, who)`: where his life stands and the last few entries of the ledger of facts that
this person would know (what he said in the rooms they were in, absences, the flat, the family).
The system prompt says they may treat only the listed facts as having happened and that nothing
they say changes anything. No model output is read back into the game.

## For the other systems

- `careerEvent(L, type, data)` (`world/career.js`): `'fight-seen' { by, where }`, `'hurt' { level }`,
  `'online' { delta, why }`, `'praise' { delta, why, from }`, `'absent' { why }`. Turning up hurt
  (`year.hurt`) is noticed at the office door without a call.
- `OFFICE`, `FLATS` (`world/yearWorld.js`): positions. `world.year.enter('firm' | 'flat')`,
  `world.year.arrive(id, info)`, `world.year.here`. Arrivals at `lujiazui` go through
  `world.dest.arrive`, which this module wraps: a district with its own IFC door should call
  `world.year.enter('firm')` there.
- `todaysWork(L)`, `shortDate(L, lang, day)`, `dayName(L, day)`, `passLine(L, toMinute, lang)`.
- Xu Zhiwei is written here only at work; her feelings move only through `hearts.feel` / `meet`.
  Her persona card and cast entry are not in this module; on the floor she uses the avatar `c4`
  unless the cast has a `zhiwei`.

## What is thin

- The Yushen and Nanjing days are played over a card (place, date, conversation): no interiors.
- The start-up's days use the existing 32F room and its three people; the hire is a name only.
- Colleagues have no recorded voices (subtitles only) and stand rather than sit.
- The consulting road's Act IV is on the same floor with the same cast.
- Only the first eligible answer to Mingxuan or Dad starts a road; there is no road change after June.
- `tests/career.test.mjs` is not in `npm test` (package.json was not to be edited): run it by name.
