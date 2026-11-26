# Living city: architecture for a dense crowd and traffic

*24 November 2026. Written against `2e98753`. An architect's document: decisions, an audit and a
spec. No production code was changed. The numbers marked **measured** come from two throwaway
probes run for this document (not committed); how they were taken is in §9.*

## 1. The short version

1. **The frame is already spent, and mostly on things nobody sees.** At 8 pm on the `mac` preset the
   game issues **1,430 to 2,480 draw calls a frame** (measured). About three quarters of them are
   pieces of skinned people, drawn twice (main pass and shadow pass), most of them out of sight, and
   hotel interiors drawn from the promenade. Adding density before fixing this makes the game slower
   without making it fuller. Phase 0 reclaims the frame and changes nothing on screen.
2. **Raising the two caps is the wrong lever.** The 380 cap and the 8–40 animated people are not the
   limit. The limits are: full steering for every walker (31 ms a step at 3,000 people, measured), 11
   draw calls per animated person per pass, and a quality cliff between a full person and a 48×96
   pixel card. At a real density of 0.3 people per m², the 16 nearest people all stand within 4 m of
   you; everyone beyond is a card.
3. **Three drawing tiers and three simulation tiers**, all on the main thread: about 12 hero people,
   150 GPU-instanced skinned people with baked animation, and 1,300 or more cards whose walking is
   computed in the vertex shader. Only people within 25 m steer. No worker.
4. **Half the real crowd stands still.** The Bund at dusk is a line of backs along the railing with
   phones up. The current crowd is 91% walkers and puts 75 people on the whole promenade. Standing
   people cost almost nothing to simulate and are the largest single gain in how full it looks.
5. **Traffic needs instancing before it needs numbers.** A car costs 8–11 draw calls and a bus 49. The
   target is about 80 vehicles on Zhongshan Road for about 30 draw calls, with far traffic drawn as
   its lights.
6. **E-bikes belong on the side streets**, not on the Bund road or the pedestrian street (to be
   checked against the footage, §5.2).
7. **Memory is the hidden risk.** Scene textures come to about 1 GB uncompressed (measured). Each
   crowd body costs about 28 MB. Doubling the bodies at that price invites Safari to reload the tab.
   New bodies must cost under 3 MB each, and the plan ends about 250 MB below today.

Target for the `mac` preset on the benchmark route at 8 pm: 1,500 people and 110 vehicles drawn, at
most 600 draw calls, at most 10 ms of JavaScript a frame, 60 fps average.

## 2. What the audit found

### 2.1 Measured

| What | Value | Where it comes from |
|---|---|---|
| Draw calls per frame, `mac` values, 8 pm | 2,480 promenade looking north; 1,675 at the crossing; 1,430 Nanjing Road looking west; 1,658 Hankou Road | browser probe |
| Triangles per frame | 1.73–1.90 million | browser probe |
| Share of draw calls that are skinned-mesh pieces | Nanjing Road view: 1,011 of 1,318 (77%). Promenade view: 1,215 of 2,488 | browser probe |
| Draw calls for interiors seen from the promenade | 956 (`interiors` 419, `jazz-bar` 343, `peace-6f` 194) | browser probe |
| Draw calls for the 16 animated crowd people | 174–178 per pass, so 11 per person, in both the main and the shadow pass | browser probe |
| Primitives per avatar | 7 to 20, for only 2 to 4 materials (p2: 20 primitives, 3 materials; some are 4 triangles) | GLB headers |
| Avatar mesh | 6,700–9,000 triangles, 80–88 bones, 4–7 textures of 1024² | GLB headers |
| Scene textures | 372 textures, about 1,005 MB as uncompressed RGBA with mipmaps; 101 of them over 3 MB; two of 4096² in `huracan.glb` | browser probe |
| Crowd simulation, one step | 378 people 2.0 ms (5.2 µs each); 906 people 5.4 ms; 1,880 people 15.0 ms; 3,019 people 31.4 ms (10.4 µs each) | node probe |
| Where the 378 are at density 1 | promenade 75, Nanjing Road 181, the two Zhongshan pavements 107, elsewhere 15 | node probe |
| Who they are | 344 of 378 walking; 138 (37%) in a couple, family or tour group | node probe |
| One route search | 0.126 ms (Dijkstra over 284 nodes with a linear scan of the open set) | node probe |
| `crowd.update` and `crowdView.update` in the browser run | 1.9–2.8 ms and 3.0–4.4 ms | browser probe; inflated, see §9 |

Two corrections to the brief. The repository has 20 avatars, of which the crowd uses 15 (13 adults
and 2 children), not 30. And the road as built has four running lanes (`crossing.lanes`), not ten,
so "22 cars" is 6.6 vehicles per lane-kilometre.

### 2.2 What limits scale

- **Draw calls, not the GPU.** three.js spends roughly 3–10 µs of JavaScript per draw call (an
  estimate; the benchmark overlay should replace it with a measured figure on the Mac). At 1,400 to
  2,500 calls that is 5–20 ms, which is the whole frame.
- **Fragmented avatars.** The FBX-to-GLB conversion kept every material group as its own primitive.
  `GLTFLoader` turns each into a separate `SkinnedMesh`, so a person is 7–20 draw calls where 2–4
  would do.
- **Nothing skinned is ever culled.** `people.js` and 18 other places set `frustumCulled = false`.
  The cruise boat's passengers (91 calls), the baristas, the Jazz Bar's guests and the crossing's
  pedestrians are drawn and shadowed from 300 m away and from behind walls.
- **Everyone casts shadows.** The shadow pass is 553–697 calls, nearly all skinned people, whatever
  their distance from the one lamp that casts.
- **Interiors have no visibility rule that covers the outside.** `jazzBar.js` and `hotelUpper.js`
  gate on rough position; from the promenade those tests pass.
- **Every walker steers every frame.** Cost per person rises with density (5.2 to 10.4 µs) because
  the neighbour loop grows.
- **Hero people are expensive on the CPU too.** Each runs an `AnimationMixer` with 23 actions, three
  `updateMatrixWorld(true)` calls, head look, springs and arm IK. In the browser run, setting up
  the 16 of them and about 230 cards cost more than simulating all 378 walkers. Raising
  `nearPeople` to 40 would cost several milliseconds.
- **Texture memory.** Twenty avatars at about 28 MB each are 560 MB of the 1 GB.

### 2.3 What is wasteful

- `bakeImpostors` builds eight full people per avatar (120 `createPerson` calls at load) to
  photograph eight sides. One person turned eight times gives the same atlas.
- `createPerson` builds 22 new `AnimationClip` objects per person (each clip split into body and
  arm). The split clips are the same for every person of a sex and can be made once.
- `lightAt` runs in JavaScript for every card every frame and loops over the promenade lamps.
- `obstacles()` (91 entries) is scanned in full by every walker every frame; it is not in the grid.
- `onCarriageway()`, `onHenan()`, `nearAgents()` and the `others` list in `main.js` scan or allocate
  over all agents every frame.
- A time skip (`setActive(..., { instant: true })`) re-plans every trip at once: 3,000 people at two
  route searches each would stall for about 0.75 s.
- The body pool creates people lazily while you walk (a clone plus 23 actions), which hitches.

### 2.4 What to keep

- **The steering in `engine/crowd.js`.** Look-ahead avoidance, keep-right, kerb waiting, flinches,
  groups and the stuck rescue are tuned and tested, and a dozen modules reach into the agent
  objects. Keep the code and the object model; run it on fewer people.
- **The module being pure.** No three.js in the engine means it stays testable in node and could
  move to a worker later.
- **The impostor idea and its single draw call.** Keep the atlas, the card shader and the umbrellas.
- **The walk network, `ENDS`, shop visits, bus boarding, tour groups.**
- **`engine/traffic.js`.** One signal controller, the Intelligent Driver Model, lane changes, tests.
- **`timeOfDay.js` as the one source of the hour**, and `gfx.js` as the one source of density by
  preset.
- **The wheel instancer** (`world/instancer.js`) and the `Batch` builders in `world/geo.js`: the
  static street is already cheap (about 250 draw calls).

## 3. Decisions

### D1. Reclaim the frame first (Phase 0)

No density is added until the same picture is drawn in at most 600 calls. Four changes do it:
merge each avatar's primitives by material at load; give every group of people and every interior a
visibility rule; cull skinned people by hand (a sphere test) instead of never; let only hero people
within 18 m cast shadows. Expected: 1,430–2,480 calls down to 400–600, and the per-frame animation
of about 30 people who are out of sight removed.

### D2. Three drawing tiers

| Tier | Who | How drawn | Range | Count on `mac` | Cost |
|---|---|---|---|---|---|
| T0 hero | People you can touch or talk to, anyone bumped, flinching or gesturing | Today's full person (`createPerson`): CPU skinning set-up, mixer, IK, springs, real shadow | 0–7 m | 12 | 2–4 draw calls per pass each; about 0.2 ms CPU each |
| T1 instanced | Everyone else nearby | One `InstancedMesh` per avatar. The vertex shader skins from a baked bone texture. No mixer, no per-person CPU beyond writing 12 floats | 7–30 m | 150 | 1–3 draw calls per avatar in view, whatever the count; about 8,000 triangles each until the meshes are simplified |
| T2 card | The far crowd | Today's impostor card, with position and stride computed in the vertex shader | 30–330 m | 1,300+ | 1 draw call; a few floats per person, uploaded only when a person changes edge |

Reasons:

- T1 exists because of the cliff. On a 1080-line frame a person 10 m away is about 200 pixels tall;
  the card's cell is 96. A T1 person holds up from 7 m to 30 m, where a card is 70 pixels and fine.
- T1 costs nothing new in browser support. three.js already skins from a float texture read with
  `texelFetch` in the vertex shader on WebGL2, and the game already runs that way in Safari 15. T1
  reads a bigger texture of the same kind. No probe was needed.
- Hero count goes **down** from 16 to 12 on `mac`. T1 carries the look; heroes carry interaction.
- Tier changes fade over 2 m with a screen-door dither (discard by a noise of `gl_FragCoord`), which
  needs no blending and works with SMAA.
- `BatchedMesh` is not used. It relies on `WEBGL_multi_draw` and falls back to one draw call per
  item without it. I did not verify which Safari versions have that extension, so the plan does not
  depend on it.

Counts by preset:

| Preset level | T0 | T1 | T2 cap | Density scale |
|---|---|---|---|---|
| low | 6 | 60 | 600 | 0.45 |
| medium (`mac`) | 12 | 150 | 1,400 | 1.0 |
| high | 16 | 250 | 2,000 | 1.3 |
| ultra | 24 | 350 | 3,000 | 1.6 |

### D3. Three simulation tiers, on the main thread

| Tier | Who | What runs | Cost |
|---|---|---|---|
| S0 steer | Within 25 m of you (leave at 32 m) | Today's `crowd.update` body, unchanged | 5–8 µs per walking person per step; standing people skip steering |
| S1 rail | Everyone else in a zone you can see | A person is a point on an edge of the walk network: start, direction, distance, speed, lateral offset, start time. The shader moves the card. JavaScript touches the person only when they reach a node | about 150 node arrivals a second for 2,500 people |
| S2 count | Zones you cannot see | A number per zone. People are created when a zone comes into view, out of sight | none |

Budget: 250 people in S0 of whom about 140 walk, at 7 µs, is 1.0 ms a step in node on the probe
machine. An Apple M-series core is faster than that machine, so 1.5 ms is a safe budget.

**No worker, and why:**

- With S1 and S2 the simulation is 1–1.5 ms. There is nothing left worth moving.
- `SharedArrayBuffer` needs cross-origin isolation headers. The game ships as a zip with a tiny
  static server and can load `web-llm` models from other origins; `COEP: require-corp` would break
  that, and Safari has no `credentialless` mode.
- Without shared memory the state would be copied each frame, a frame late.
- Twelve modules call into the crowd synchronously (`flinch`, `shove`, `gather`, `board`, `alight`,
  `setCars`, `onCarriageway`, talk targets, bumps, the road-incident reactions). All would become
  message protocols.
- Rendering cannot move either: Safari 15 has no WebGL in `OffscreenCanvas`.

Revisit only if the overlay shows `crowd.sim` above 2 ms on the Mac after Phase 1. The engine stays
pure so that door stays open.

Promotion and demotion must not show. An S1 person entering the 25 m ring becomes an S0 agent at the
exact position the shader was drawing. Leaving at 32 m, their current lateral offset becomes their
rail offset (clamped to the lane), so there is no jump; it eases to their preferred side over the
next edge.

### D4. Population by street and hour

Density is data, in one table, tuned against the footage. Starting values for a dry weekday at the
evening peak (18:30–21:30):

| Zone | Area or length | Density | People |
|---|---|---|---|
| Promenade railing | 357 m of rail | 1.3 standing per metre | 460 |
| Promenade walk | 3,400 m² | 0.18 per m² | 610 |
| Nanjing Road pedestrian street | 10,300 m² | 0.20 per m² | 2,060 |
| West pavement of Zhongshan Road | 2,100 m² | 0.12 per m² | 250 |
| East pavement | 1,400 m² | 0.08 per m² | 110 |
| Hankou Road pavements | 300 m² | 0.08 per m² | 25 |
| Henan Road pavements and corners | — | — | 60 |
| **Whole map** | | | **about 3,600** |

Today the game has 378 at this hour: a tenth.

- The values sit in Fruin's level-of-service bands A and B for walking (under 0.43 people per m²)
  and C to D for standing at the rail. They describe a busy ordinary evening, not a holiday.
- Cross-check by flow: 0.20 per m² × 1.1 m/s × 22 m is 4.8 people a second past any line on Nanjing
  Road, about 17,000 an hour.
- The whole map is never live. The promenade and Nanjing Road cannot see each other, so the live
  set is the larger side plus the junction: about 2,100. Beyond 150 m the drawn count is thinned to
  60% (perspective packs a far crowd, so the thinning does not read). That gives about 1,500 drawn.
- Other hours scale by `todState().crowd` as now, with a per-zone shape on top: the railing peaks at
  the moment the floods come on; Nanjing Road holds until the shops shut at 22:00; the promenade at
  dawn is joggers and tai chi (already built).
- Weekend ×1.5 and rain ×0.6 are multipliers in the same table.

Composition, as shares of people (starting values):

| Property | Now | Target | Why |
|---|---|---|---|
| Standing or lingering | 9% | 45% on the promenade, 25% on Nanjing Road | The railing, shop fronts, benches, people waiting for someone |
| In a group | 37% | 65% (pairs 40%, threes 15%, four or more 10%) | Field studies of pedestrian streets find most people walk in groups (Moussaïd et al., 2010, report up to 70%) |
| Holding a phone up or looking at one | walking locals only | 35% of standing people, 20% of walkers | |

### D5. Bodies: variety by tint, not by count, and a memory ceiling

- Keep the 15 crowd avatars as the only hero bodies.
- Add up to 15 more Rocketbox avatars (MIT) for T1 and T2 only, at 512² colour textures with no
  normal map: under 3 MB each.
- Multiply the body material by a per-person coat colour from a November palette (black, navy,
  charcoal, camel, khaki, burgundy, cream). Because the body material covers the arms and legs,
  a dark multiply turns short sleeves into long sleeves and bare legs into tights. This fixes
  summer clothes in a 12 °C November evening with no new assets, and turns 30 bodies into a few
  hundred distinguishable people.
- No two people with the same body and tint within 6 m of each other in T0 and T1. Swap the tint,
  not the body.
- Height ±6% (already there).

Memory budget for textures, against about 1,005 MB now:

| Change | Saving |
|---|---|
| Drop normal maps on the 15 crowd avatars on `low` and `mac` (keep them on the named cast) | about 165 MB |
| The two 4096² textures in `huracan.glb` down to 2048² | about 130 MB |
| The crowd avatars' hair and opacity texture from 1024² to 512² | about 60 MB |
| Interiors' textures released while their sector is hidden for more than 60 s (optional) | up to 100 MB |
| New bodies, bone textures, light map, bigger atlas | +110 MB |
| **Target after Phase 3** | **about 760 MB; about 660 MB if the optional item is done** |

The first and third rows change the picture slightly (flatter cloth shading up close), so they belong
to Phase 2 and are judged in its screenshots, not to Phase 0.

KTX2 compressed textures would cut this by a further factor of four or more. They are deferred: they
need a transcoder and a build step, and the items above are enough to stay safe.

### D6. Traffic

- **Density.** A signalised city arterial in the evening carries about 25 vehicles per lane-kilometre
  averaged over moving stretches and queues (a demand near 550 vehicles an hour per lane at 40 km/h
  is 14 per kilometre moving; queues at 150 per kilometre raise the average). On the 3.3
  lane-kilometres of the loop that is about 80 vehicles, against 22. About half are within sight.
- **Drawing.** One `InstancedMesh` per body model, paint by instance colour, wheels through the
  existing instancer. Head lamps, tail lamps and brake lamps are one instanced draw of emissive
  quads, with a second for the pool of light each car throws on the road. Beyond 150 m only the
  lamps are drawn. Buses keep their own groups (their doors move) but are merged from 49 draw calls
  to at most 6.
- **Simulation.** `engine/traffic.js` as it is. It is linear in the number of vehicles and costs
  well under 0.3 ms at 110.
- **Mix.** A table by hour: taxis in several company liveries rather than one teal, ride-hail
  saloons with green plates, private cars with blue plates, buses 33, 55 and 65, vans. Night lines
  after 23:00 as `BUS_STOPS` already records.
- **E-bikes.** A separate small engine on their own lanes (§5.2). Each rider and bike is one rigid
  instanced mesh with no skinning: 60 e-bikes for about 4 draw calls.

### D7. Light for the crowd comes from a texture

A top-down light map of the playable area (512×256, RGBA8, about 1.2 m per texel) holds the ambient
colour at street level: façade floods, lamp pools, shop light, daylight. It is redrawn on a 2D canvas
when the hour state changes. T1 and T2 sample it in the vertex shader. This removes `lightAt` from
the per-frame loop, lights both tiers the same way, and gives shop-door light on passing people for
free.

### D8. Frame budget

For `mac` at 60 fps (16.7 ms), in Safari on an M-series Mac:

| Part | Budget |
|---|---|
| Game logic, UI, audio | 1.5 ms |
| Traffic and e-bikes | 0.4 ms |
| Crowd simulation | 1.5 ms |
| Crowd drawing set-up (12 heroes at about 0.2 ms; T1 and T2 buffers 0.4 ms) | 2.8 ms |
| three.js draw submission, at most 600 calls | 3.5 ms |
| **JavaScript total** | **at most 10 ms** |

| Draw calls | Budget |
|---|---|
| Static world | 250 |
| Heroes: 12 × 3 materials, plus 6 of them in the shadow pass | 54 |
| Named people, baristas, staff (those in view) | 40 |
| T1: up to 30 avatars × 1–3 | 60 |
| T2, blobs, card shadows, umbrellas, flashes | 6 |
| Vehicles, lamps, e-bikes | 40 |
| Props, parked bikes, river traffic | 20 |
| Post-processing | 20 |
| **Total** | **about 500; ceiling 600** |

Triangles: at most 3.0 million a frame. T1 adds 1.2 million at 150 people until the meshes are
simplified; Phase 0 removes about as much by hiding interiors.

## 4. Where the brief's plan should change

1. **Do not start with density.** Start with Phase 0. Otherwise each new person makes the frame
   slower than the one before.
2. **Do not raise the number of fully animated people.** Lower it and add the middle tier.
3. **Do not model 3,000 walkers.** Model 1,200 walkers and 900 standers, and steer 250.
4. **Do not buy variety with bodies.** Buy it with tint, groups, props in hands and standing poses.
5. **Do not add cars one mesh at a time.** Instance first; at night, draw lamps first.
6. **Do not put e-bikes on the Bund road** unless the footage shows them.
7. **Judge "alive" with counts, not by eye.** The benchmark overlay should report, at fixed
   viewpoints and hours, numbers that can be read off the footage too (§7.3).

## 5. Surprises and ideas, ranked

Impact is on how alive the street reads against footage. Effort is for one implementer.

### 5.1 Ranking

| # | Idea | Impact | Effort | Draw calls |
|---|---|---|---|---|
| 1 | Reclaim the frame (Phase 0) | Enables everything | 2–3 days | −900 to −1,900 |
| 2 | Standing people at the railing, in talking circles, at shop fronts, on benches | Very high | 2 days | 0 |
| 3 | Sim tiers and rail-walking cards, so the far crowd is ten times larger | Very high | 4 days | 0 |
| 4 | Instanced middle tier (T1) | Very high | 5 days | +60 |
| 5 | Traffic as lamps: instanced head and tail lamps, road glow, 80 vehicles | High | 3 days | −100 |
| 6 | Coat-colour tint and group shares | High | 1 day | 0 |
| 7 | Things that flash: phone-camera flashes along the rail, the white strobe of traffic cameras at the junction, the red and blue flasher on a police post | High for the cost | 1 day | +2 |
| 8 | River traffic: barges with running lights, lit cruise boats | High on the promenade | 1.5 days | +3 |
| 9 | E-bikes and courier riders on the side streets, bunching at the stop line | High | 3 days | +5 |
| 10 | Shop windows with depth (interior mapping) and moving silhouettes | High on Nanjing Road | 2 days | 0 |
| 11 | Parked shared bikes in rows, bins, bollards, cabinets, hydrants, signposts | Medium | 2 days | +12 |
| 12 | The crowd reacts to the city: phones up when the floods come on, heads turn at a ship's horn or a siren | Medium, memorable | 1 day | 0 |
| 13 | Daytime shadows for cards and T1 as flattened copies on the ground | Medium by day | 1 day | +2 |
| 14 | Small motion everywhere: leaves falling on Hankou Road, steam at the shengjian shop, flags | Medium | 1 day | +3 |

### 5.2 What a Shanghai local would notice

These come from knowledge of the city, not from the footage, which this session could not see. Each
should be confirmed in the footage before it is built.

- **The railing.** At dusk it is close to a continuous row of people facing Pudong, a second row
  behind in places, phones and selfie sticks up, and photographers working couples for wedding
  pictures. The game has 75 people on the whole deck.
- **E-bikes are everywhere except where the game would first put them.** Zhongshan East 1st Road
  along the Bund is closed to bicycles and e-bikes, and the Nanjing Road pedestrian street bans
  riding. The swarms are on Henan Road's side lanes, Hankou Road, Jiujiang Road and the cross
  streets (Sichuan and Jiangxi Middle Roads). Their signature: they filter past the queue and bunch
  ahead of the stop line, start a second before the green, ride two and three abreast at 15–25 km/h,
  silently. Riders wear helmets. In November many bikes carry a quilted windbreak over the
  handlebars.
- **Couriers on foot.** Delivery riders in yellow or blue jackets and helmets leave their bikes at
  the edge of the pedestrian street and jog in with a bag. One or two per 100 m of Nanjing Road.
- **Walls of shared bikes** in painted bays at street corners and metro exits, in three operator
  colours (the game has six bikes). Not on the Bund pavement itself, which is kept clear.
- **Whistles and wardens.** Traffic assistants in reflective vests at the kerb of every busy
  crossing, holding people back with a flag and a whistle. Two standing figures and a sound.
- **The strobe.** Enforcement cameras fire a white fill-flash at junctions at night. It is constant
  and unmistakable.
- **Police posts** with a slow red and blue flasher, and patrol carts on the promenade.
- **Clothes.** Mid-November evenings are about 12 °C: coats, down jackets, scarves, some masks.
  Summer avatars read as wrong at once (D5).
- **Hands are full.** Milk-tea cups, shopping bags on Nanjing Road, suitcases near the metro,
  children on shoulders at the railing.
- **Taxis are several colours**, by company. Half the saloons carry green new-energy plates.
- **No kerbside parking on the Bund road.** `layout.js` keeps parked cars in the kerb lanes; a
  local would expect barriers, a bus lane and stopping taxis there.
- **The river is never empty.** Low bulk barges pass day and night with running lights, and the
  cruise boats are wrapped in lit screens.
- **Plane-tree leaves.** Late November is leaf-fall on the side streets.

### 5.3 Perception tricks worth copying

- **Spend the population where the camera looks.** Keep full density in a 120° cone ahead and within
  25 m all round; thin behind. Create and remove people only out of sight, at doors, metro stairs
  and bus doors, or beyond 120 m.
- **Motion at every depth.** A scene reads as alive when something moves near, in the middle
  distance and far away at once. Far motion is the cheapest: lamps on the road, flashes on the rail,
  barges on the river.
- **Standing groups face each other.** Two people talking stand face to face; three or four form a
  ring. A row of people all facing their direction of travel reads as a queue of robots.
- **Break the clones in time.** Stride phase is already per person; add two more walk clips (a
  stroll and a brisk walk) and vary the playback rate by 8%.
- **Sound follows what is drawn.** Give the audio session one snapshot each half second (§6.9) so the
  murmur, footsteps and horns match the people and cars in view.
- **Night traffic is lamps.** Past 60 m nobody sees a car body at dusk.

## 6. Implementation spec

General rules for every phase:

- New work goes in new modules. `main.js` gains wiring only. The parallel session is editing
  `engine/bench.js`, `engine/audio.js` and the benchmark UI: do not edit those; use the interface in
  §6.9, and adopt theirs if it already exists when you start.
- Every new tier has a URL switch for tools and bisection: `?t1=0`, `?rail=0`, `?fleet=0`,
  `?ebikes=0`, `?dress=0`.
- All counts come from `engine/gfx.js` `LOD`. Extend each level with
  `{ heroes, mid, far, vehicles, ebikes }` and keep `crowd` as the density scale.
- Engine modules stay free of three.js and get a node test added to `npm test`.
- Free assets only: Rocketbox (MIT), Poly Haven and ambientCG (CC0), procedural geometry. No brand
  marks beyond the project's existing rule.

### 6.1 Phase 0: reclaim the frame

No visible change. Each item is its own commit with before and after counts in the message.

**0.1 Merge avatar primitives.** In `world/people.js` `loadPeople`, after each avatar loads:

- Group its `SkinnedMesh` children by material.
- All primitives of an avatar share one vertex buffer (same accessor), so build one geometry per
  material that reuses the attributes and concatenates the index arrays.
- Replace the children with one `SkinnedMesh` per material, bound to the same skeleton and bind
  matrix.
- Check `world/springs.js` and the cloth tools still find what they need (they work on bones).

**0.2 Sectors.** New `world/sectors.js`:

```js
createSectors({ zones, portals })
  .register(object3d, { zone, door?: [x, z], reach?: 35, also?: (eye) => boolean })
  .update(eye)            // sets object3d.visible; returns the set of visible zone ids
  .visible(zoneId)        // for the crowd (D3) and the audio snapshot
```

- Zones: `deck`, `road`, `hankou`, `jiujiang`, `nanjing-e` (x > −290), `nanjing-w`, `henan`, and one
  per interior (`peace-lobby`, `peace-6f`, `jazz`, `aia`, `manner`, `dumpling`, `metro`).
- A static table lists which street zones can see which. `deck` and `road` see each other; `nanjing-*`
  see `road` only within 40 m of the corner; and so on.
- An interior is visible when the eye is inside its footprint, or within `reach` of one of its doors.
- Register: `interiors`, `jazz-bar`, `peace-6f`, the cruise boat's passengers, baristas, the dumpling
  shop's people, `walkers`, `crossing-pedestrians`, the Henan Road vehicles.

**0.3 Cull people by hand.** New `world/personVis.js`:

```js
personVis.add(person, { maxDist = 120, shadowDist = 18 })
personVis.update(camera)    // per person: root.visible, castShadow on its meshes, person.asleep
```

- Test a 1.2 m sphere at the chest against the frustum, and the distance.
- Callers skip `person.update(dt)` when `person.asleep`, adding the skipped time to the mixer on
  waking.
- There are 19 `frustumCulled = false` sites in `src/world`. Replace those that are for people with
  registration here; leave the rest.

**0.4 Shadows.** Only people registered with `shadowDist` and inside it cast. Cruise passengers and
anything in an interior never cast outdoor shadows.

**0.5 Allocation and scans.**

- Cache `crowdView.nearAgents()` once per frame.
- Build the `others` list in `main.js` into a reused array.
- `onCarriageway()` and `onHenan()` iterate only S0 agents (after Phase 1; until then, a reused
  array).
- Share the split clips per sex in `people` instead of per person.
- Pre-create the hero body pool at load.
- `bakeImpostors`: one person per avatar, turned eight times.

**Acceptance.**

- At the four probe views (§9) draw calls are at most 600, and skinned draw calls per person equal
  that person's material count.
- From `[16, −30]` looking north, `interiors`, `jazz-bar` and `peace-6f` contribute 0 draw calls;
  walking into the Peace Hotel lobby shows them before the door is reached.
- `tools/shot.mjs` screenshots at the four views differ from before by no more than noise.
- `npm test` passes; `tools/crowdwalk.mjs`, `tools/inwalk.mjs` and `tools/jazzwalk.mjs` pass.

### 6.2 Phase 1: population, standing people, simulation tiers

**`engine/cityDensity.js`** (new, pure):

```js
export const ZONES = { deck: { area, railLength, nodes: /^(P|I|R|ST)/ }, ... }
export const DENSITY = { /* per zone: walking per m², standing per m or per m², by daypart */ }
export const MIX = { standing, groups: { 1: .35, 2: .40, 3: .15, 4: .10 }, phone, kinds }
export function targets(minute, { weekend = false, rain = 0, scale = 1 }) // -> { [zone]: { walk, stand } }
```

`targets` multiplies the table by `todState(minute).crowd` shaped per zone, then by the modifiers.
The table holds the §D4 values and is the only place density is tuned.

**`engine/standSpots.js`** (new, pure): where people stand, as slots.

```js
buildSpots(net) // -> [{ id, zone, x, z, face, kind: 'rail'|'rail2'|'bench'|'ledge'|'shop'|'circle'|'kerb', group? }]
```

- Rail slots every 0.65 m along the railing clear of lamps, the telescope and Old Lin's spot, with a
  second row 0.8 m behind every other slot.
- Circles: two to four slots facing a common centre, placed on the wide walks away from the lanes.
- Bench and planter-ledge seats; shop-front slots 1.2 m off the glass facing it.

**`engine/crowd.js`** (changed):

- `createCrowd({ ..., targets, spots, focus })`. `N` comes from `targets`, not `380 * density`.
- Each agent gains `lod` (0, 1 or 2) and, for S1, `rail = { ax, az, dx, dz, s, v, off, t0, len }`.
- `crowd.setFocus({ x, z, yaw, visible })` each frame, where `visible` is `sectors.visible`.
- The update loop:
  - `lod 2`: skipped. A zone that becomes visible gets its count created along edges, out of sight
    of the eye or beyond 60 m.
  - `lod 1`: if `s + v·(now − t0) ≥ len`, advance to the next edge (`arrive` logic for acts, shops,
    kerbs and bus stops still applies) and mark the agent dirty for the view. Nothing else.
  - `lod 0`: today's code.
  - Promote at 25 m, demote at 32 m, following §D3.
- The grid, `queued`, `touch` and the avoidance loops consider S0 agents only, plus S1 agents within
  6 m of an S0 agent (read from their rail position).
- Standers: a new kind with `state: 'stand'`, a slot, an act (`photo`, `selfie`, `look`, `phone`,
  `talk`, `sit`, `lean`) and a dwell of 40–400 s. On leaving they become walkers with a trip; walkers
  arriving at a `via` slot become standers. Standers never steer; they are obstacles for S0 walkers.
- Group sizes drawn from `MIX.groups`. A group of three or four walks as a leader with followers in
  `slot()` positions (the couple code generalised), and stands as a circle.
- Routing: build a next-hop table once per network (Floyd–Warshall over the 284 nodes, about 23
  million steps, tens of milliseconds, with the zebra penalty in the edge weight). `route()` becomes
  a table walk. Keep the function's signature.
- `obstacles()` go into the collider grid.
- Keep every public method and its meaning: `update`, `setActive`, `setSignal`, `flinch`, `shove`,
  `gather`, `board`, `alight`, `setCars`, `onCarriageway`, `onHenan`, `count`, `agents`, `tours`,
  `net`, `state`, `stats`.

**`world/crowdView.js`** (changed): T2 becomes rail-driven.

- Instance attributes: `iRail` (ax, az, dx, dz), `iMove` (s0, v, t0, off), `iCell` (block x, block y,
  pose or −1 for walking, scale), `iTint` (rgb, y).
- Vertex shader: position is `a + d·(s0 + v·(uTime − t0)) + right·off`; walk frame is
  `fract(phase0 + v·(uTime − t0)/1.35)·8`; heading is the edge direction; tint is the light map
  sample times `iTint`.
- S0 agents not drawn as T0 or T1 write `v = 0` and their real position each frame.
- Buffers are re-uploaded only for dirty ranges.
- Blobs and umbrellas take the same attributes (share the buffers; one shader chunk computes the
  position).
- Light map: `world/lightMap.js` `createLightMap()` returning `{ texture, redraw(hourState) }`. Port
  `lightAt` into the canvas drawing; delete the per-frame call.

**Acceptance** (`tests/crowdLod.test.mjs`, `tests/cityDensity.test.mjs`, in `npm test`):

- At scale 1, 20:00: live population within 5% of `targets`; after 120 simulated seconds each zone
  within 15% of its target; standing share within 5 points of `MIX.standing`; share in groups at
  least 60%.
- 3,000 agents with the focus on Nanjing Road: mean step at most 3 ms in node on the CI machine
  (31.4 ms today on the probe machine), and S0 count at most 300.
- Promotion moves a person by at most 0.05 m; demotion by at most 0.3 m.
- No S1 or S2 agent is ever on a carriageway outside a zebra on the green man.
- A time skip with 3,000 agents completes in under 50 ms.
- All existing `tests/crowd.test.mjs` cases pass unchanged.
- In the browser: `crowdView.stats.far` is at least 1,200 on the Nanjing Road leg of the benchmark at
  `mac`; turning round quickly never shows an empty street within 25 m.

### 6.3 Phase 2: the instanced middle tier

**`world/crowdBake.js`** (new):

```js
bakeBones(people, roles, CLIPS)
// -> { texture, width, layout: { [role]: { row0, bones } }, clips: { [name]: { f0, frames, fps, loop } } }
```

- For each role, pose one person through each clip with the existing actions (as `bakeImpostors`
  does) and write each bone's skinning matrix (`bone.matrixWorld × boneInverse`, relative to the
  root, 3×4, three texels) into a float texture: one row per frame, 3 × bones texels wide.
- Clip set and sampling: `walk` 36 frames, `walk-phone` 36, `walk-umbrella` 36, `jog` 24, `idle` 48
  at 15 fps, `look` 64 at 15 fps, `phone` 48 at 15 fps, `talk` 64 at 15 fps, `photo` 1, `selfie` 1,
  `sit` 1. About 360 frames.
- Size: 360 × 88 × 3 texels × 16 bytes is 1.5 MB a role; 30 roles is 46 MB. Use half floats if the
  loader allows, for 23 MB.
- Do the impostor photographs in the same pose loop, so each avatar is posed once.
- Budget at load: under 1.5 s for 30 roles. If it is over, move the bake to a `tools/` script that
  writes a binary file.

**`world/crowdMid.js`** (new):

```js
createCrowdMid({ scene, people, bake, lightMap, max })
  .begin()
  .push(agent, fade)   // fade 0..1 for the dither at the tier edges
  .end()               // sets counts, uploads
  .stats               // { drawn, roles }
```

- One `InstancedMesh` per role per material (after 0.1 that is 2–4), sharing instance buffers.
- A `ShaderMaterial`, not `onBeforeCompile`: skinning from the bake texture (four influences), the
  light map as ambient, one directional term from the sun or sky, fog, tone mapping and colour-space
  chunks as the card material uses.
- Attributes: `iPos` (x, y, z, heading), `iAnim` (clip row, phase, rate, scale), `iTint` (coat rgb,
  fade). The coat tint applies to the body material only.
- Which clip: from the agent's state and act, the mapping `crowdView` uses for heroes.
- No shadow-map casting. A blob underneath at night; the flattened shadow of 5.1 item 13 by day.

**`world/crowdView.js`**: becomes the tier manager. Every quarter second it ranks the agents in
view: the first `heroes` within 7 m, or anyone with `flinch`, `gesture`, `faceTo`, a talk hold or a
bump, are T0; the next `mid` within 30 m are T1; the rest are T2. Hysteresis of 1.5 m on both
boundaries. Tint and body are stable per agent across tiers. `nearAgents()` and `bodyOf()` keep
their meaning (T0 only), and a T1 person the player targets for talk is promoted first.

**Phase 2b** (after the look is approved): in `tools/rocketbox/convert.mjs`, write a second file per
crowd avatar, simplified to at most 2,500 triangles with the three textures packed into one 1024×512
image, so T1 is one draw call and a third of the triangles per avatar. Add the 15 new avatars in
this form only.

**Memory work in this phase** (§D5): when the preset level is `low` or `medium`, load the crowd
avatars without their normal maps and with the hair and opacity texture drawn down to 512² through a
canvas; re-export `huracan.glb` with its two 4096² textures at 2048².

**Acceptance.**

- With `?t1=0` and `?t1=1`, screenshots of a person at 8 m, 15 m and 28 m are compared side by side:
  at 8 m and 15 m the T1 person must be indistinguishable in silhouette and stride from a hero at
  the same distance; no bind-pose frames in 500 random samples (the earlier bug, §8 of
  `PROJECT.md`).
- A person walked from 40 m to 3 m shows no pop: record 120 frames and check the bounding box of the
  figure changes by less than 3% between consecutive frames.
- 150 T1 people cost at most 90 draw calls and at most 0.5 ms of JavaScript.
- Feet do not slide: at 1.0 and 1.4 m/s the stance foot moves less than 3 cm over a stance phase.

### 6.4 Phase 3: traffic

**`world/trafficMix.js`** (changed): `trafficSpecs(factor)` reads a table:

```js
export const FLEET = { perLaneKm: { peak: 25, day: 18, late: 8 }, mix: [ ['taxi', .22, liveries], ['ridehail', .25], ['private', .38], ['van', .07], ['suv', .08] ], buses: { ... } }
```

**`world/vehicleFleet.js`** (new): replaces per-vehicle groups for everything but buses, the DiDi
car in use and the Huracán.

```js
createFleet({ specs, wheels })   // -> { group, update(simVehicles, eye), stats }
```

- One merged geometry per model with vertex colours; vertices flagged as paint take the instance
  colour.
- Number plates from one atlas: blue and green.
- `world/vehicleLamps.js`: one instanced mesh of quads for head lamps, tail lamps (brighter while
  `braking`), indicators; one of ground glow. Beyond 150 m the body is not written and only the
  lamps are.
- A camera-flash hook: when a vehicle crosses a stop line at night, emit a `strobe` event at the
  signal gantry (§6.6).

**`engine/ebikes.js`** (new, pure) and **`world/ebikeView.js`** (new):

```js
createEbikes({ lanes, signals, rnd, count })
  .update(dt, { peds, vehicles })
  .riders   // [{ x, z, yaw, v, kind: 'commuter'|'courierY'|'courierB'|'shared', lean }]
```

- Lanes: Henan Road's two side lanes, Hankou Road, Jiujiang Road, the mouths of Sichuan and Jiangxi
  Middle Roads. None on Zhongshan East 1st Road or the pedestrian street unless the footage says
  otherwise; the lane list is data.
- Following: the same Intelligent Driver Model with a 0.6 m standstill gap and a 0.8 s headway, in
  up to three lateral slots per lane.
- At a red light: riders pass the car queue and fill slots ahead of the stop line. They start 0.5 to
  1.5 s before the vehicles. A right turn on red is allowed after yielding to people on the zebra.
- Couriers stop at kerb clusters for 20–90 s; the view parks the bike and hands a walking courier to
  the crowd as an ordinary agent with a `courier` tint.
- View: three or four rigid meshes (rider posed once at load from an avatar and baked to static
  geometry with `SkinnedMesh.applyBoneTransform`, on a procedural scooter), instanced, plus a head
  lamp in the shared lamp mesh.

**Acceptance.**

- `tests/traffic.test.mjs` passes unchanged. New `tests/ebikes.test.mjs`: no rider overlaps another
  or a vehicle; none enters a zebra while people are on it; none is ever on a lane not in the list;
  at a red light at least 70% of waiting riders are ahead of the first car.
- At `mac`: at least 80 vehicles active at 20:00 on Zhongshan Road for at most 40 draw calls
  including lamps; 60 e-bikes for at most 6.
- From the promenade at night, the road 200 m away shows a moving stream of white and red lamps.

### 6.5 Phase 4: street dressing and windows

**`world/dressing.js`** (new): props from a data file `world/dressingData.js`.

```js
export const PROPS = [{ kind: 'bikeBay', at: [x, z], yaw, n: 14, colours: [...] }, { kind: 'bin', ... }, ...]
createDressing({ scene, addCollider })   // one InstancedMesh per kind, one shared atlas material
```

Kinds: shared-bike bays, two-compartment bins, bollards at each cross-street mouth, utility cabinets,
hydrants, signposts and wayfinding totems, camera poles, a police post with a flasher, A-frame signs
at shop doors, planters, drain covers as decals. Static: matrices are written once. Each kind adds
a collider only where the crowd must walk round it, through `obstacles()`.

**`world/interiorMap.js`** (new): a material for shop glass and lit upper windows.

- Interior mapping: the fragment shader intersects the view ray with a virtual room behind each
  window bay and samples a room atlas. The back wall uses the eight shop looks `nanjingRoad.js`
  already paints; side walls, floor and ceiling are procedural.
- A second layer 1.5 m inside carries two or three silhouettes drifting slowly, from the card atlas.
- Night: brightness from `todState().shops`; per-bay variation by a hash; upper floors with a share
  of windows lit by `windows`.
- It replaces the material on the existing merged quads, so it adds no draw calls.

**Acceptance.** Walking past a shop front at 1.4 m/s, the back wall moves against the frame
(parallax) in a recorded clip; at most 14 added draw calls for all props; the crowd test's stuck
count does not rise with the props in place.

### 6.6 Phase 5: pulse

**`world/pulse.js`** (new): small events and ambient motion, each one draw call or none.

```js
createPulse({ scene, crowd, traffic, hour })
  .emit(kind, x, y, z)        // 'flash' | 'strobe'
  .update(dt, eye)
```

- Phone flashes: three to six a second at random standers with act `photo` in view (additive
  sprites, 80 ms).
- Enforcement-camera strobes from the fleet's stop-line events.
- Police flasher (two emissive quads, alternating).
- River traffic: 6–10 instanced barges and two lit cruise boats on rails across the river view.
- Leaves on the tree-lined side streets in November; steam at the shengjian shop.
- Crowd reactions through `crowd.gather` and act probabilities: when `floods` rises past 0.5, half
  the standers at the rail switch to `photo` for 90 s; a ship's horn turns nearby heads toward the
  river; the 22:00 lights-out thins the rail over five minutes.

### 6.7 Order and dependencies

| Phase | Depends on | Can be shown alone |
|---|---|---|
| 0 Reclaim | — | Yes (same picture, faster) |
| 1 Population and sim tiers | 0 | Yes: the far crowd fills, standers appear |
| 2 Middle tier | 0, 1 | Yes |
| 3 Traffic | 0 | Yes, in parallel with 1 and 2 |
| 4 Dressing and windows | 0 | Yes, in parallel |
| 5 Pulse | 1, 3 | Yes |

If time is short, stop after Phases 0, 1 and the lamps part of 3. That is most of the gain.

### 6.8 Settings

`engine/gfx.js` `LOD` after the change:

```js
low:    { crowd: 0.45, heroes: 6,  mid: 60,  far: 600,  vehicles: 0.5, ebikes: 20, ... }
medium: { crowd: 1.0,  heroes: 12, mid: 150, far: 1400, vehicles: 1.0, ebikes: 60, ... }
high:   { crowd: 1.3,  heroes: 16, mid: 250, far: 2000, vehicles: 1.2, ebikes: 80, ... }
ultra:  { crowd: 1.6,  heroes: 24, mid: 350, far: 3000, vehicles: 1.4, ebikes: 100, ... }
```

Keep `nearPeople` as an alias of `heroes` until its readers are moved. The renderer's automatic
step-down gains one earlier step: halve `mid` before lowering resolution.

### 6.9 The interface to the benchmark and sound session

One provider, `engine/cityStats.js` (pure), filled by the modules above and read by the overlay and
the audio:

```js
cityStats.frame = {
  draws, triangles, textures, jsMs: { logic, traffic, crowdSim, crowdView, render },
  people: { t0, t1, t2, s0, s1, standing, walking, grouped },
  vehicles: { bodies, lampsOnly, buses, ebikes },
}
cityStats.near = {            // every 0.5 s, for sound
  peopleWithin: { 10: n, 30: n }, standingShare, vehiclesWithin: { 30: n, 100: n }, ebikesWithin30: n,
  zone, events: [{ kind: 'strobe'|'flash'|'whistle'|'busDoor', x, z, t }],
}
```

`audio.setCrowd(level)` keeps working; the sound session can move to `cityStats.near` when ready.

## 7. Acceptance for the whole

### 7.1 Performance, on the user's Mac in Safari

Run the built-in benchmark (30 s route, clock held at 20:00) at the `mac` preset:

| Measure | Pass |
|---|---|
| Average frame rate | at least 55 fps |
| 1% low | at least 40 fps |
| Draw calls, worst frame | at most 600 |
| JavaScript per frame, mean | at most 10 ms |
| People drawn on the Nanjing Road leg | at least 1,400 |
| Vehicles active | at least 100 across both roads |
| Texture memory (the estimate of §9) | at most 800 MB, against about 1,005 MB now |
| Twenty minutes of walking between the promenade and Henan Road | no tab reload, no hitch over 100 ms after the first minute |

### 7.2 Regression

`npm test` passes, with the new suites added. The Playwright walk-throughs that touch the crowd and
traffic pass: `crowdwalk`, `crowdstuck`, `streetwalk`, `traffictest`, `p3walk`, `drivewalk`,
`hailwalk`.

### 7.3 Against the footage

Choose four reference shots in the footage that match a place and an hour in the game (suggested:
the railing looking north; the Hankou Road crossing looking across the road; Nanjing Road looking
west from the Bund end; the Henan Road corner). For each, read these from the footage and from the
game at the same viewpoint and hour:

| Measure | How | Pass |
|---|---|---|
| Heads in frame | count in three stills | game within 25% |
| Share standing | count in the same stills | within 10 points |
| Share in groups | count | within 15 points |
| Vehicles passing a line per minute | count over one signal cycle | within 25% |
| E-bikes passing per minute | count | within 30%, and zero where the footage shows zero |
| Moving light sources at night | count in a still | within 30% |

Where the game misses, change `cityDensity.js`, `FLEET` or the lane list, not the code.

## 8. Risks

- **Safari could not be tested here.** The probes ran in headless Chromium on software GL. Draw
  call, triangle and texture counts carry over exactly; timings do not. Every millisecond figure for
  the Mac in this document is a budget to verify, not a measurement. Verify after Phase 0, before
  committing to the tier counts.
- **The 3–10 µs per draw call figure is an estimate.** If Safari's cost is lower, Phase 0 buys less
  and the tier counts can rise; if higher, the 600 ceiling should drop to 450.
- **Local knowledge without the footage.** §5.2 was written from knowledge of the city. The e-bike
  ban on the Bund road, the lane count, the leaf-fall timing and the absence of kerb parking should
  each be confirmed in the footage. All of them are data in the spec, so a wrong one is a table
  edit.
- **The two sessions collide in `main.js`, `bench.js` and `audio.js`.** Keep to new modules and the
  §6.9 interface; merge the other session's branch before Phase 0's last commit.
- **Custom shaders against three.js internals.** T1 and the cards use `ShaderMaterial` with the
  library's fog and tone-mapping chunks. A three.js upgrade can break them silently; the screenshot
  comparisons in 6.3 are the guard.
- **The earlier bind-pose bug can return** in the bone bake (zero-length fades, mixer time jumps).
  Pose by setting action time directly, as `bakeImpostors` does.
- **Load time.** Thirty avatars baked for bones and cards. Budget 1.5 s; fall back to an offline bake.
- **Interaction with T1 people.** Talk, bump and incident code assume a hero body. The tier manager
  must promote before any of them runs; `bodyOf()` returning null must stay a handled case.
- **Tinting can look wrong on some avatars** (patterned clothes, bare arms turning dark). Keep a
  per-avatar tint strength in `people.json`, and zero it where it fails.
- **Avatar mix.** Rocketbox has a limited number of East Asian adults. With about 78% of the crowd
  domestic, check the 15 new avatars against the footage; the far tiers hide faces, the heroes do
  not.
- **Standing crowds block paths.** 460 standers at the rail narrow the walk. Rail slots stay within
  1.6 m of the railing; rerun the stuck test at every density scale.
- **Memory is estimated from image sizes.** The driver's real figure may differ. The twenty-minute
  walk in 7.1 is the real test.
- **Saves.** The crowd is not saved; nothing here changes the save format. Keep it that way.

## 9. How the numbers were taken

Both probes were throwaway scripts under 60 lines, kept out of the repository.

- **Node probe.** `createCrowd` at densities 1, 2.4, 5 and 8 with a seeded generator, the full crowd
  awake, 300 warm-up steps and then 600 timed steps of 1/60 s, in node 22 on a cloud container.
- **Browser probe.** `vite build`, `vite preview`, headless Chromium with SwiftShader at 1280×720.
  Graphics set to the `mac` preset's values except resolution scale 0.5, mirror 512 and no frame cap,
  with automatic step-down off; `?hour=20`. Counts are per frame, summed over all passes, averaged
  over 12 frames. Views as `[x, z, yaw, pitch]`: promenade `[16, −30, 0, 0]`; crossing
  `[−20, 3.5, −π/2, 0.05]`; Nanjing Road `[−60, −201, π/2, 0]`; Hankou Road `[−60, 1.5, −π/2, 0.05]`.
  Draw calls were attributed by wrapping `renderer.renderBufferDirect` for one frame and naming each
  object by its top-level group. Timings of `crowd.update` and `crowdView.update` in that run share
  the CPU with the software rasteriser and are higher than on real hardware; only their order
  matters.
- **Assets.** Primitive, bone and texture counts were read from the GLB JSON headers.
- **Texture memory** is width × height × 4 bytes × 1.33 for each unique texture reachable from a
  scene material after walking the four views.
