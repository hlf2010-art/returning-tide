# Time, energy and the year's branches

A day has twenty-four hours. During the playable days, what Ji Bai does with them is up to the player
moment by moment. Between the acts, weeks or months go by in a single night, and the player decides
how the evenings of those weeks were spent. Those choices push the year toward its endings. The aim:
**it has to make sense, the player has to feel it is up to them, and each decision has to matter.**

Code: `src/engine/allot.js` (pure, `tests/allot.test.mjs`), `src/world/allotEvents.js` (what happens
because of it), `src/ui/season.js` (the season plan), `src/world/profileView.js` + `src/ui/profile.js`
(the character page, I).

## The ledger

`life.flags.allot` keeps hours by use (`make`, `love`, `friends`, `business`, `rest`, `work`) and by person.
- **Playable days**: the bench (versions, training a model), the makerspace, field tests, dates and romance
  scenes, a friend's visit, a day's work and sleep all go into it (`logTime`, `slept`).
- **Seasons**: the planned evenings go into it (`applySeason`).

## Energy

0 to 100. Long days at the bench, business and overtime use it up. Rest and sleep restore it, and company
restores a little. Below 60, everything he makes or does yields less (half at empty). A season planned
too hard ends in **burnout**: a week in bed, a message from Momo, and the ending remembers.

In a season, energy changes **per week** (`weeklyEnergy`). A plan that is sustainable for a month is
sustainable for four; one that isn't burns out sooner over a long gap.

## The season plan

The plan appears on the night that crosses a gap of two weeks or more. In the year that is most nights
from January on (9 of the 16), since the playable days are spread across the months.
- **The budget**: the gap's days, less the overtime nights the job takes (one a week at the consultancy,
  two at the family works, none at his own start-up).
- **Five uses**: making things / one person (pick who) / friends and family / business / rest.
- **Quick presets**: all in on making, time for people, chase the business, even.
- **The preview**: before committing, it says what the plan comes to. Which person will feel neglected or
  may leave (by their patience), friends and Dad, the network's growth, the next project milestone,
  the energy he'll end with. Tests check that what the preview promises is what happens.
- **Declaring the side project**: while employed, he can declare it to the firm (standing −3 now). If the
  launch comes later, the HR complaint then comes to nothing.

## The project beyond the playable days

The project starts from a validated gimbal (field-tested, grade 3+) and has three milestones:
1. **Production-ready prototype**: 60 h of making and Product 3.
2. **Small batch**: 120 h, Hardware 3 and 4 people on the list. Mingxuan's fund takes notice.
3. **Launch**: 180 h, Product 4 and **network 30**. All making with no business evenings never launches.

## The launch, both ways

- **The good**: sales in the first month, scaled by exposure (network and hours). Revenue for the
  start-up, a promotion talk at the firm if declared, and reputation.
- **The bad**, scaled by exposure:
  - **A Taobao knock-off.** He chooses: open-source it (reputation +, margin −), patent it
    (¥30,000, six months), or out-ship them (more making next season).
  - **A colleague's complaint to HR about moonlighting.** Nothing comes of it if he declared the
    project; standing −12 if not.
  - **Mingxuan asks for 2%** (if they're close). Give it, or buy him dinner instead.
  - **A big company calls** (network 50+). Sell to them, join them with the product, or say no.

## The endings

The six endings stay. Two variants are told over whichever one is reached:
- **Built it, but alone**: launched, but not with anyone, and at most one friend still close.
- **Wanted everything**: burnt out twice or more.

The afterword adds a paragraph on where the year's evenings went, in percentages.

## Typical years (from the tests)

| Plan | Outcome |
|---|---|
| All making | Production-ready and a small batch, but no launch (no network). Nanxing's trust falls to 0. Burnt out. |
| All love | Nanxing's trust rises; the gimbal stays a prototype. Dad is closer. |
| Balanced | Launched, no burnout, Nanxing still there. |
| Hustler (no rest) | Biggest network, launched; burnt out three times; alone. |
