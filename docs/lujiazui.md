# Lujiazui (陆家嘴): the district across the river

The second walkable district. You reach it the way you would in Shanghai: Line 2, one stop from East
Nanjing Road, or a DiDi through the Yan'an East Road tunnel. Both end at street level now; IFC's
32nd floor is reached through the lobby door.

## Code

| File | What it holds |
|---|---|
| `src/world/lujiazuiLayout.js` | Pure, node-tested. Reference coordinates and the game-frame transform (top comment), every position, the ground height, the collisions, the traffic routes, the signal, the exported `LJZ` positions. Registers itself with `layout.js` `movers` (ground + keep), so `layout.js`'s own ground code is untouched. |
| `src/world/lujiazuiGround.js` | The ground mesh (carriageways, pavements, lawns, paths, kerbs, guard rails, paint), sampled from the same functions the collisions use. |
| `src/world/lujiazuiBuild.js` | Structures: the ring bridge, Apple's court and cylinder, IFC, the metro stairwells, the Green's furniture, trees, the towers around, lamps, signals, signs. |
| `src/world/lujiazuiLife.js` | Traffic (route followers) and about eleven people. |
| `src/world/lujiazui.js` | `createLujiazui`: builds lazily, shows / hides, arriving and leaving, what E does, the map, per-frame update. |
| `tests/lujiazui.test.mjs` | Walks the ground in node (stairs, ring, court, spiral, store, kerbs, zebras, metro, lake). Not yet in `npm test` (package.json was off limits): run `node tests/lujiazui.test.mjs`. |
| `tools/ljzwalk.mjs`, `tools/ljzcheck.mjs`, `tools/ljzground.mjs` | The browser walkthrough and screenshots; layout sanity; ground mesh size. |

Small hooks elsewhere: `skyline.js` `setNear()`, `destinations.js` `exitTo`, `ride.js` (`walkIn` on
Lujiazui), `layout.js` (two rain covers), `ui/minimap.js` (`mapExtras`, a second sheet), `ui/worldMap.js`
(bounds, labels), `engine/minimapLogic.js` (`zoneAt`), `ui/i18n.js` (area names), `main.js` (8 new lines).

## `LJZ`: positions for other modules

`import { LJZ } from './world/lujiazui.js'` (or from `lujiazuiLayout.js`, which has no three.js):
`ifcLobbyDoor` (with its outward normal), `ifcLobbyStand`, `officeLift` (the existing lift on 32F),
`kerbPickup`, `appleEntrance`, `appleCylinderDoor`, `appleStore`, `metroExits[]` (exit number, street
point, landing), `metroArrive`, `greenGate`, `greenBenches[]`, `greenLawn`, `ringStairs[]`, `ring`,
`towers`. `world.ljz.build()` forces the build; `world.ljz.here(body)`, `.zone(body)`, `.stats`.

## What is there

- **The roundabout and the Mingzhu Ring (明珠环).** A planted island, about four lanes round it, five
  roads in. No zebra anywhere on the roundabout: kerb-side guard rails all round, and the ring bridge
  is the way across, as in life. The ring is walkable all the way round at 5.5 m, 9 m wide, glass
  balustrades; four stairs (each drawn with a pair of escalators beside it) down to the pavements
  between the roads, and a wide spur toward IFC with its own stair down beside the Apple court.
  Wayfinding signs at each stair head.
- **Shanghai IFC.** Two glass towers (259.9 m and 249.9 m) with faceted crowns, the mall's podium
  between them, shop windows along the street, the mall's name. The north tower's lobby on Century
  Avenue (canopy, revolving doors, address stone): **E** at the door takes the lift to the 32nd floor
  (the existing `dests.arrive`); the lift there now comes back down to the lobby.
- **Apple Pudong.** The sunken round court, two curved stairs down into it, the 12.5 m glass
  cylinder with the logo hung in it (Simple Icons' Apple mark: the real brand at its real place), a
  door, the spiral glass stair round the glass lift core down to a round store under the court (oak
  tables, a lit ceiling ring). All of it walked, not faded.
- **Lujiazui station.** Three stairwells (Exits 1, 2, 6) with Shanghai Metro's mark, the station's
  name, Line 2 and Line 14 badges, exit numbers. On a landing: **E** at the way in rides one stop back
  to East Nanjing Road (¥3); **E** at the side wall goes through to the next exit.
- **The Central Green.** Lawn, a lake, a loop path with benches and lamps, a white membrane canopy,
  a tree belt, the park's name on a boulder at the corner gate, a jogger and strollers.
- **The skyline up close.** The Pearl where it always was; Jin Mao, the World Financial Center and
  the Shanghai Tower moved to their real offsets from it while you are in Pudong; IFC; named and
  generic towers on the blocks around.
- **Traffic and street.** Taxis, private cars and the NEV lookalikes on routes through the roundabout
  (anticlockwise, giving way on entry), along Century Avenue and on Yincheng Road; a signalled
  junction with two zebras you can cross; lane paint, kerbs, white guard rails, street lamps, road-name
  plates, a ride-hailing point at IFC's kerb (**E**: a car back to the Bund).

## Fidelity notes

**No map data could be fetched.** The session's egress proxy refused every map and reference host
tried (overpass-api.de, overpass.kumi.systems, overpass.private.coffee, nominatim.openstreetmap.org,
api.openstreetmap.org, en.wikipedia.org, www.wikidata.org: HTTP 403 on CONNECT, a policy denial). So
there are no surveyed footprints here. What the layout rests on:

| Fact | Value used | Source |
|---|---|---|
| Ring bridge: ends, diameter, deck | 31°14′24.19″N 121°29′43.80″E and 31°14′23.99″N 121°29′48.05″E; ca. 110 m; deck 9 m | a web-search snippet of Structurae's entry (the page itself not opened) |
| Ring bridge height | about 5.5 m | web-search snippet (Komoot) |
| IFC position; tower heights | about 31.2385 N, 121.497 E; 259.9 m and 249.9 m | web-search snippets (Wikipedia infobox, CTBUH Skyscraper Center) |
| Apple cylinder height | 13 m (12.5 m built) | web-search snippet (Eckersley O'Callaghan) |
| Pearl, Jin Mao, SWFC, Shanghai Tower positions | see the layout file's header | recalled published coordinates, not re-checked online |
| Line colours | Line 2 `#82BF25` (as elsewhere in the game), Line 14 `#827A04` | recalled from Wikipedia's palette; not an official spec |

Everything else is from memory of the place and is **approximate**:

- The five roads' bearings and widths; Century Avenue is drawn at bearing 114.7° (derived from the
  ring's centre and Jin Mao's position), 32 m of carriageway with a planted median.
- Yincheng Middle Road is drawn square to the avenue; really it crosses at an angle.
- Where exactly IFC's two towers, the podium and the Apple court sit on their block, and which tower
  is which. No HSBC or Ritz-Carlton marks are shown because I could not confirm which tower carries
  them. The podium is a plain stone box with shop glass; the real one is curved glass and far richer.
  The mall has no interior and its doors do not open. The shop windows carry no brands.
- Metro exits: there are three, numbered 1, 2 and 6, placed plausibly (toward the Pearl, on the
  avenue's north side, at IFC). The real station has more exits and Exit 6 connects under ground into
  the mall; the numbering against real positions is unverified.
- The Central Green is about 6.3 ha here (really about 10 ha), set about 440 m east of the roundabout
  (really nearer 370 m), a rectangle in the avenue's frame with a simplified lake. The row of towers
  between it and the avenue, and Lujiazui Ring Road running round it, are simplified: the ring road's
  loop round the park is not drawn. The old Chen Guichun house is not there.
- Super Brand Mall and the "Bank of China Tower" are massing with a name, not likenesses. The
  Shangri-La, Aurora and Citigroup towers on the river side are not individually modelled.
- The ring's stairs: number, positions and the escalators are schematic. The escalators are drawn but
  do not move (you walk them as stairs). The real Oriental Floating Court deck and the long elevated
  walkways on to the three supertalls are reduced to one spur and its stair.
- The Pearl's park is a fenced lawn with trees round the existing tower model; its base buildings are
  not modelled. You cannot walk to the Pearl, Jin Mao, SWFC or the Shanghai Tower: the walkable area
  ends at hedges and a hoarding (Century Avenue is walkable to about 560 m from the roundabout).
- From the 32nd-floor office (which keeps its old position near the Pearl, where the far skyline put
  IFC) the view is the far skyline as before, not this district.
- The game's Bund runs due north-south; this district is laid out to true north from the Pearl, so the
  two halves of the map differ by the few degrees the real Bund is turned.

## Arriving and leaving

- Metro (`world/metro.js`, unchanged): `arriveAt('lujiazui', { method: 'metro' })` now lands you on
  Exit 6's landing. DiDi (`rideFlow.finish`): Lujiazui is `walkIn`, so every ride there ends at
  IFC's kerb (before, only a ride to an appointment walked in; otherwise a card and a ride back).
- Appointments: the invitation a ride arrived for is remembered, and the lobby door passes it (or one
  due within two hours) to `dests.arrive`, whose scene marks it kept when it ends, as before. Note the
  old card path marked an appointment kept on arrival; now you have to go up.
- `tools/destwalk.mjs` and `tools/p3walk.mjs` expect the old behaviour (straight to 32F); their
  Lujiazui steps need updating to go through the lobby door.
- The phone's DiDi app still sends its car to the Bund pick-up point; from Lujiazui use the
  ride-hailing point at IFC's kerb (a fade, the fare, the time), or the metro.

## Cost

Nothing is built, drawn or simulated while you are on the Bund; the fonts for the signs are
requested at boot, and the district is built the first time you arrive (0.7 to 1.8 s under software
GL, during the fade). While you are in Pudong the Bund's own groups (interiors, traffic, people,
trees: about 1,500 meshes) are hidden and restored when you leave; its façades, the promenade and the
river stay drawn. Measured under SwiftShader at quality step 4 (not on a Mac mini M4):

- District: about 380 meshes in the group including 12 cars and 11 people, 228,000 triangles of
  static geometry (ground 25,000; 15,800 leaf cards), 129 lamp sources feeding the shared pool of 6
  real lights.
- A frame looking down the west road at 1 pm: 148 draw calls, 207,000 triangles. At dusk from the
  Green: 153 draw calls, 144,000 triangles. (Before the Bund's groups were hidden: 1,800 draw calls.)
- Each visible person is a full Rocketbox avatar; they are drawn within 95 m only.
