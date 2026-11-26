# Weather

The weather follows Shanghai's climate for the date the game stands on. Each date gets its own day, drawn at
random but seeded by the date, so a day replays as it was and the forecast on the hotel's television and turndown
card comes true (`engine/climate.js`, `tests/climate.test.mjs`).

## What a day can bring

From Shanghai's climate normals, rounded:
- **Rain** on 7 to 14 days a month. It comes in as a drizzle (about 45% of rainy days), steady rain (40%) or a
  downpour (15%), for two to nine hours at a time.
- **The plum rains (梅雨)**, from about mid-June to early July: rain on two days in three, often all day.
- **Thunderstorms** on summer afternoons (a third of July's and August's rainy days): an hour or two, heavy rain,
  a gale, lightning and thunder.
- **A typhoon's edge**, rarely, from July to September: rain and a gale all day.
- **Snow or sleet** once or twice most winters (December to February, mostly January), cold days. It wets the
  paving but doesn't settle, as Shanghai's snow rarely does.
- **Fog** on some winter mornings, gone by nine to eleven.
- **Clear, cloudy or overcast** dry days, the clearest in spring and autumn.
- **Wind**: calm, a breeze, windy, or a gale. Winter's blows from the north-west, summer's from the south-east, and
  otherwise it comes off the river.
- **Temperatures**: the month's usual high and low with a day's own swing, lower on rainy and snowy days.

Over a hundred simulated years, the month-by-month rainy days come out at:

| Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 9.7 | 11 | 12.9 | 12.7 | 11.3 | 18.7 | 14.6 | 12.6 | 10.9 | 7 | 8.5 | 6.4 |

There are about three snow days a year.

## What you see and hear

- **Rain**: drizzle and downpour in one shader (`world/rain.js`). Heavier rain falls faster, in longer streaks, with
  more drops; it slants with the wind and never falls under a roof. The ground darkens and puddles ripple, and the
  rain grows louder (and muffled under cover).
- **Snow**: soft flakes drifting and swaying on the wind (`world/snow.js`).
- **Cloud**: an overcast deck over the sky (`world/sky.js`), grey by day and holding the city's glow by night. The
  sun's light goes with it: hardly a shadow, a flat bright sky (`world/lighting.js`). The captured reflections follow.
- **Haze and fog**: haze thickens in rain; a morning fog closes the distance in grey.
- **Wind**: the trees move with the day's wind and its direction (`world/wind.js`).
- **Storms**: lightning flashes and thunder after it, sooner and louder the nearer the strike.
- People open their umbrellas when it's properly raining (as before).

## For tools

With `?q=`, the climate is off (the scenes stay as approved) unless `?climate=1`. `?weather=drizzle` sets a drizzle
by hand, and the dev key toggles it; either stops the day's weather for the session. `__bund.climate.plan(y, m, d)`
returns a day's plan, and `__bund.weatherDay` is today's.
