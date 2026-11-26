# Round the Peace Hotel: shared bikes, street moments, people and plaques

What happens just outside the Peace Hotel (No.20, Nanjing Road East at the Bund), and why it is the way it is.

## Shared bikes (`src/world/sharedBikes.js`, `src/world/bikeModel.js`)

- **Operators.** The game's own three: Suiqi 随骑 (yellow), Yunqi 云骑 (blue) and Zhuqi 竹骑 (green, with a white basket). They are not the real Meituan, Hellobike or Qingju, so there are no trademarks, but the colours read the same way the city's do.
- **The bike** is modelled on the city's dockless bikes, not copied from any one of them:
  - a step-through aluminium frame with a single big curved down tube
  - 24-inch solid (airless) tyres on alloy rims with 24 spokes and spoke reflectors, drum-brake hubs
  - a plastic front basket with a grid of holes (alpha-tested), a solid rim, ribs, and the operator's name on a plate at the front, with a lamp underneath
  - swept-back city bars with grips, brake levers and their cables, and a bell on the left
  - a smart panel on the bars, tilted up at the rider. It carries a proper QR code about 6.5 cm across (25 × 25 modules, finder squares, timing rows, an alignment square), the name, 扫码用车, the bike's number and a battery gauge.
  - a padded saddle on a quick-release post with height marks
  - the smart lock over the rear wheel, with a solar panel on top and a second QR sticker on its back
  - an enclosed chain case on the right, mudguards and their stays, a red rear reflector, and a side stand
  - Parked bikes lean on the stand. Bikes within 26 m use the detailed model and the rest a lighter one, swapped as you move.
- **Fares.** 1.5 yuan for every 15 minutes started, paid with Xinyu Pay when you lock. Game time runs 4× faster than real time, so a typical ride costs 1.5 yuan, which matches what a ride costs in Shanghai. Leaving a bike outside a marked bay costs a 5-yuan dispatch fee (the operators charge one; the amount varies in reality). You have to confirm before you pay it, and the bike stays where you left it.
- **Bays** are found from the bike's position, not from where you stand, as the lock's GPS and the bay's beacon do. A locked bike is placed inside the lines.
- **Where you can ride.** You walk the bike, without riding, on the Nanjing Road pedestrian street, on the Bund and indoors. The bays are at Jiujiang Road, Hankou Road, and Henan Road by the metro.

## Street moments near the hotel (`src/world/moments.js`)

These are random, at most one at a time, each at most once a day, and only at the hours they would happen.

| Moment | Where, when | What you can do |
|---|---|---|
| **hotelshot** | outside the door on Nanjing Road, 08:00–21:30 | A family of three (with a child) asks for a photo with the bronze 和平饭店 over the door. You frame it yourself; they tell you if you've cut their heads off, are too far away, or missed the name. |
| **bikehelp** | the Jiujiang Road bay, 07:30–21:00 | A visitor from abroad can't unlock a bike because it keeps asking for a Chinese phone number, a common problem for foreign visitors. You can scan one for them on your phone (1.5 yuan, from your account), tell them to add a foreign card to Alipay, or say you don't know. They walk the bike down to the river, since riding isn't allowed on the Bund. |
| **keycard** | the pavement by the door, 07:00–23:30 | A guest's key card, which glints now and then. Pick it up and hand it to the security man at the revolving door. He knows you as a guest (Mr Ji): the front desk will cancel the card and issue a new one, as hotels do with lost cards. |
| **teascam** | Nanjing Road west of the hotel, 10:00–20:00 | Two friendly young women are taking a tourist to a "tea festival". This is the tea-house scam that travel guides warn about on Nanjing Road and at People's Square. You can warn him, send him to the Huxinting teahouse at Yu Garden (prices on the menu), or stay out of it. |

The photo check is shared with the couple at the railing: each shot names what must be in frame (the Pearl, or the hotel's name) and which lines go with it.

## People and things outside the door (`src/world/peaceStreet.js`)

- **Plaques** on the stone pier just west of the door, one above the other. Press E to read the card for each.
  - 全国重点文物保护单位 · 外滩建筑群: the State Council's fourth list of national heritage sites, announced 20 November 1996. The Bund's buildings are listed together, the Peace Hotel among them.
  - 上海市优秀历史建筑 · 和平饭店北楼（原沙逊大厦）: built in 1929 to designs by Palmer & Turner (公和洋行), with a steel frame and Art Deco styling, and the green copper pyramid of about 19 m on the corner tower. It was in Shanghai's first list of heritage architecture, 1989.
  - The plaques' wording is written for the game in the usual style of such plaques; it is not a transcription of the real ones.
- **A volunteer** (志愿者) in a red cap and a red armband at the Bund end of the street, 09:00–18:00. She answers four questions:
  - toilets: up on the flood-wall promenade
  - Lujiazui: one stop on Line 2, or the ferry from Jinling Road East
  - whether you can look round the hotel: the lobby yes, the rooms no
  - where you can ride a bike
- **A street sweeper** (环卫工人) in sanitation orange with reflective bands, an orange cap and a bamboo broom. He works the south pavement 05:30–10:00 and 17:30–21:00, stops for a few strokes, and steps round you. What he says depends on the time and the weather (rain, crowds, rubbish sorting).

## Not done yet / uncertain

- The volunteer's directions are deliberately general; the exact positions of the promenade's public toilets aren't modelled.
- Non-player characters wheel bikes but don't ride them yet.
- The dispatch fee is a single flat amount; real operators vary it by city and by how far outside a bay the bike was left.
