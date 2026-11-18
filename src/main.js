import '@fontsource/noto-serif-sc/500.css';
import '@fontsource/noto-serif-sc/900.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/ma-shan-zheng/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import * as THREE from 'three';
import { createRenderer } from './engine/renderer.js';
import { loadGfx, saveGfx, tweak as gfxTweak, detail as gfxDetail, shouldDraw, treeStep, resolve as gfxResolve } from './engine/gfx.js';
import { createPlayer } from './engine/player.js';
import { createAudio } from './engine/audio.js';
import { L, npcs as npcLayout } from './world/layout.js';
import { FONT, loadFonts } from './world/canvas.js';
import { T, ALL_TEXT } from './world/text.js';
import { createMaterials } from './world/materials.js';
import { createSky, FOG_COLOR, fogColorAt } from './world/sky.js';
import { createSkyline } from './world/skyline.js';
import { createRiver } from './world/river.js';
import { createBund } from './world/bund.js';
import { createPromenade } from './world/promenade.js';
import { createStreet } from './world/street.js';
import { createLighting, captureEnvironment } from './world/lighting.js';
import { createClue } from './world/clue.js';
import { createNpcs } from './world/npcs.js';
import { createDialogueAudio } from './engine/dialogueAudio.js';
import { createConversation, computeDistanceGain } from './engine/conversation.js';
import { createHud } from './ui/hud.js';
import { createTitleScreen } from './ui/titleScreen.js';
import { createWorldMusic } from './world/music.js';
import { TRACKS as MUSIC_TRACKS, LICENCE as MUSIC_LICENCE } from './engine/speakers.js';
import { createVoice } from './engine/voice.js';
import { createLLM } from './engine/llm.js';
import { createTalk } from './ui/talk.js';
import { createAmbient } from './world/ambient.js';
import { cannedReply, PERSONAS } from './world/personas.js';
import { PEACE as PEACE_R, AIA as AIA_R } from './world/interiors.js';
import { METRO as METRO_EXITS } from './world/layout.js';
import { JAZZ } from './world/jazzBar.js';
import { clockText as clockOf } from './engine/life.js';
import { createPouch, HELD_LAYER } from './world/pouch.js';
import { createMissionOne } from './missionOne.js';
import { pickTarget, segmentHitsBox, BLOCKING_TAGS } from './engine/targeting.js';
import { createWeather } from './engine/weather.js';
import { createRain, RAIN_LAYER } from './world/rain.js';
import { weatherUniforms, ssrMask, setArchLight } from './world/materials.js';
import { todState, passedLateNight } from './engine/timeOfDay.js';
import { applyDayNight, autoLights } from './world/dayNight.js';
import { setCrowdLight } from './world/crowdView.js';
import { createDawn } from './world/dawn.js';
import { createMoments, MOMENT_QUESTS, MOMENT_NAMES } from './world/moments.js';
import { createWorldMap } from './ui/worldMap.js';
import { createGamepad } from './engine/gamepad.js';
import { createSaves, currentSlot, slotKey } from './ui/saves.js';
import { createTips } from './ui/tips.js';
import { BENCH_SECONDS, BENCH_WARMUP, BENCH_HOUR, benchAt, benchStats } from './engine/bench.js';
import { createCruise } from './world/cruise.js';
import { createDumpling } from './world/dumpling.js';
import { createEntrances, entranceList } from './world/entrances.js';
import { underCover } from './world/layout.js';
import { colliders } from './world/layout.js';
import { crossing, addDynamicCollider } from './world/layout.js';
import { createTraffic } from './engine/traffic.js';
import { startFlinch } from './engine/flinch.js';
import { createVehicles } from './world/vehicles.js';
import { createSignals } from './world/signals.js';
import { createPedestrians } from './world/pedestrians.js';
import { loadPeople } from './world/people.js';
import { createRealNpcs } from './world/npcsReal.js';
import { createRealPedestrians } from './world/pedestriansReal.js';
import { createPlayerBody } from './world/playerBody.js';
import { WALK_SPEED, RUN_SPEED } from './engine/movement.js';
import { createTrees } from './world/trees.js';
import { createBumps } from './world/bumps.js';
import { createManner } from './world/shops.js';
import { createBaristas } from './world/baristas.js';
import { createBelongings } from './world/belongings.js';
import { createHuracan, HURACAN_SPOT } from './world/huracan.js';
import { createCarSale } from './world/carSale.js';
import { createInteriors, PEACE, AIA } from './world/interiors.js';
import { createHotelUpper } from './world/hotelUpper.js';
import { createJazzBar } from './world/jazzBar.js';
import { createHailers } from './world/hailers.js';
import { createDestinations } from './world/destinations.js';
import { createDriving } from './world/driving.js';
import { createRoadReactions } from './world/roadReactions.js';
import { createMakerspace, MAKERS } from './world/makerspace.js';
import { createPhotoMode } from './world/photoMode.js';
import { createFriendScenes } from './world/friendScenes.js';
import { createVeil } from './ui/veil.js';
import { createWalkers } from './world/walkers.js';
import { createCrowd } from './engine/crowd.js';
import { trafficSpecs, BUS_STOPS } from './world/trafficMix.js';
import { createBuses } from './world/buses.js';
import { GUIDE_LINES, BUS_LINES, LATE_LINES } from './world/crowdLines.js';
import { createNanjingRoad } from './world/nanjingRoad.js';
import { createHenanTraffic } from './world/henanTraffic.js';
import { createMetro } from './world/metro.js';
import { createLujiazui } from './world/lujiazui.js';
import { updateQuests, currentStep } from './engine/quests.js';
import { QUESTS as STORY_QUESTS, runStoryBeats, storyContext, ENDINGS, endingOf, afterword as endingAfterword } from './world/story.js';
import { WORK_QUESTS, runWork, epilogue as workEpilogue, REG as WORK_REG } from './world/work.js';
import { hasProduct, isDusk, studio as workState, summary as workSummary, goesLeft, unwritten as workUnwritten, REGULARS as WORK_REGULARS } from './engine/studio.js';
import { createFieldTest, SPOTS as WORK_SPOTS } from './world/fieldTest.js';
import { createWorkDesk } from './world/workDesk.js';
import { createWorkbook, workSummaryHtml } from './ui/workbook.js';
import { createSeasonPlan } from './ui/season.js';
import { createProfile } from './ui/profile.js';
import { timeVariant, timeAfterword } from './world/allotEvents.js';
import { initYear, finalDay, isYear, settle as yearSettle, dateText, actOf, gapAfter, gapText } from './engine/year.js';
import { runRomance, romanceCallChoice, guardTalk, ROMANCE_CALLS } from './world/romance.js';   // the five he might come to love (engine/hearts.js)
import { createRomanceScenes } from './world/romanceScenes.js';
const QUESTS = [...STORY_QUESTS, ...MOMENT_QUESTS, ...WORK_QUESTS];   // the story's, the street moments' (world/moments.js), and the gimbal's week (world/work.js)
import { createSceneTalk } from './ui/sceneTalk.js';
import { createYearWorld } from './world/yearWorld.js';   // the working year in the world: the firm's floor, the flat, the calendar on screen
import { shortDate as yearDate, passLine as yearPassLine } from './world/career.js';
import { createConfrontation } from './world/confrontation.js';
import { romanceEvent } from './world/romance.js';
import { careerEvent } from './world/career.js';   // a row outside the Peace Hotel, once (engine/fight.js)
import { createDinner } from './world/dinner.js';
import { createJournal } from './ui/journal.js';
import { createCrowdView } from './world/crowdView.js';
import { lead as carLead, contact as carContact, choosePlate, payBalance, stepPurchase } from './engine/carPurchase.js';
import { usePhotoSurfaces } from './world/photoTextures.js';
import { createDidi, PICKUP } from './world/didi.js';
import { createRideFlow } from './world/rideFlow.js';
import { createShop } from './engine/errands.js';
import { manner as mannerSpec, stall as stallSpot } from './world/layout.js';
import { createMinimap } from './ui/minimap.js';
import { createLife, advance as lifeAdvance, lapse as lifeLapse, drain as lifeDrain, save as lifeSave, clockText as lifeClock, load as lifeLoad, post as lifePost, stamp as lifeStamp, thread as lifeThread, nudge as lifeNudge, skipTo as lifeSkipTo } from './engine/life.js';
import { setupThreads, addVoicemail, runAgenda, deliverFollowUps, react as lifeReact, CALLS } from './world/agenda.js';
import { createPhone } from './ui/phone/phone.js';
import { t as tx, tr, getLang, setLang, onLang } from './ui/i18n.js';
import { createMinimapState, updateMinimap, zoneAt } from './engine/minimapLogic.js';
import { createWind, WIND_LEVELS } from './world/wind.js';
import { planterIslands, streetTrees } from './world/layout.js';
import { icon } from './ui/icons.js';
import './ui/fonts.js';                                     // the display type and colour tokens the theme uses (also loaded by profile.js / season.js)
import './ui/deco.css';                                     // Bund Deco: loaded last, restyles the UI in the title screen's manner (ui/deco.css)
import { setSpringViewer } from './world/springs.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('view');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.00085);
// Aerial perspective with height: the air near the street and the water is denser than the air at the
// skyline's tops, so towers rise out of the haze instead of fading uniformly. Applies to every fogged material.
THREE.ShaderChunk.fog_pars_vertex = THREE.ShaderChunk.fog_pars_vertex.replace('#ifdef USE_FOG', '#ifdef USE_FOG\n\tvarying float vFogY;');
THREE.ShaderChunk.fog_vertex = THREE.ShaderChunk.fog_vertex.replace('vFogDepth = - mvPosition.z;', 'vFogDepth = - mvPosition.z;\n\tvFogY = (inverse(viewMatrix) * mvPosition).y;');
THREE.ShaderChunk.fog_pars_fragment = THREE.ShaderChunk.fog_pars_fragment.replace('#ifdef USE_FOG', '#ifdef USE_FOG\n\tvarying float vFogY;');
THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace('float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );',
  'float hd = fogDensity * mix(1.18, 0.9, smoothstep(0.0, 160.0, vFogY));\n\tfloat fogFactor = 1.0 - exp( - hd * hd * vFogDepth * vFogDepth );');
const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 4500);
setSpringViewer(camera);                                               // cloth and hair hold still beyond 30 m of the view (world/springs.js)
// graphics settings (engine/gfx.js): picked for this GPU the first time, then whatever you set.
// ?q=<n> (tools) pins one quality step; ?gfx=<preset> / ?lod=<level> override for a session.
const gpuName = (() => {
  try { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl && gl.getExtension('WEBGL_debug_renderer_info'); return gl ? String(gl.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : ''; } catch { return ''; }
})();
let gfx = loadGfx(gpuName);
if (params.has('gfx')) gfx = gfxResolve({ preset: params.get('gfx') });
if (params.has('lod')) gfx = { ...gfx, lod: gfxResolve({ ...gfx, preset: 'custom', lod: params.get('lod') }).lod };
const bootLod = gfx.lod;                                         // crowd and traffic sizes are set when the world is built
const R = createRenderer(canvas, scene, camera, { fixedLevel: params.has('q') ? Number(params.get('q')) : null, gfx });
const player = createPlayer(camera, canvas);
const audio = createAudio();
const worldMusic = createWorldMusic(audio);   // music in the world: Manner's playlist, Nanjing Road's shop doors, a DiDi's radio (world/music.js)
const hud = createHud();
const titleScreen = createTitleScreen();   // the painted Bund behind the title; its gold line is the loading bar
// people's voices: recorded clips per character (engine/voice.js); barks speak through the HUD
const voice = createVoice({ audio, getLang, camera });
hud.voice = voice; hud.audio = audio;
// talking to people in your own words (engine/llm.js, ui/talk.js): typed or spoken, Mandarin or English
const llm = createLLM({ canned: (id, said, ctx) => cannedReply(id, said, { first: ctx.first, lang: /[\u4e00-\u9fff]/.test(said || '') || (!said && getLang() === 'zh') ? 'zh' : 'en' }) });
const talk = createTalk({ llm, voice, getLife: () => life, save: () => saveLife() });
llm.warm();
const HEARTS_ON = !params.has('q') || params.has('hearts');   // measurement tools: none of the five writes or turns up unless asked
guardTalk(llm, () => life, getLang);   // when one of the five is being played, the model is told the validated state and nothing else (world/romance.js)

let mode = 'boot';              // boot -> entry -> play <-> pause / inspect / dialogue / pouch
let noLock = params.has('nolock');
let subtitlesOn = params.get('subs') !== '0';
let world = null, clueRead = false, t = 0, last = performance.now();
let dialogueAudio = null, conversation = null, mission1 = null, traffic = null;
// Temporary developer controls for Mission One (F8 start, F9 reset): dev server or ?dev only.
const devControls = import.meta.env.DEV || params.has('dev');
camera.layers.enable(HELD_LAYER); camera.layers.enable(RAIN_LAYER);
// Weather: clear <-> light drizzle only. Developer toggle F7 (dev builds / ?dev); ?weather=drizzle starts wet.
const weather = createWeather();
if (params.get('weather') === 'drizzle') weather.set('drizzle', { instant: true });
const _metroFog = new THREE.Color(0.32, 0.33, 0.34), HAZE_FOG = new THREE.Color(0.072, 0.108, 0.2), FOG_DENSITY = scene.fog.density, HAZE_DENSITY = 0.00028;
let weatherTime = 0, suUmbrella = 0, treeLevel = -1;
// Wind in the trees: a river breeze that rises with the drizzle. Developer control F6 cycles
// auto / calm / breeze / windy / gale; ?wind=<level> pins it.
const wind = createWind();
const TREE_SPOTS = [...streetTrees, ...planterIslands.map((p) => ({ x: (p.x0 + p.x1) / 2, z: (p.z0 + p.z1) / 2 }))];
if (params.get('wind') in WIND_LEVELS) wind.setOverride(params.get('wind'));
const _pairPos = new THREE.Vector3(npcLayout.pairFocus.x, npcLayout.pairFocus.y, npcLayout.pairFocus.z);

async function boot() {
  await loadFonts([
    [`900 40px ${FONT.serif}`, ALL_TEXT], [`500 40px ${FONT.serif}`, ALL_TEXT],
    [`700 40px ${FONT.sans}`, ALL_TEXT], [`40px ${FONT.hand}`, ALL_TEXT],
  ]);
  const M = createMaterials();
  usePhotoSurfaces(M, R.renderer).then((r) => { if (r) console.info('photo surfaces', r); });   // CC0 photographed stone and asphalt, swapped in when loaded
  const sky = createSky(), skyline = createSkyline(), river = createRiver();
  river.setMirrorSize(gfx.mirror);
  const bund = createBund(M), promenade = createPromenade(M), street = createStreet(M), clue = createClue();
  // real people (Microsoft Rocketbox, MIT) when their files load; the hand-built figures otherwise
  let people = null;
  try { people = await loadPeople('./people/'); } catch (err) { console.warn('people assets unavailable, using simple figures', err); }
  const npcs = people ? createRealNpcs(people) : createNpcs(M);
  // the player's own body, seen when looking down (?body=0 to leave it out)
  const playerBody = people && people.avatars.player && params.get('body') !== '0' ? createPlayerBody(people, { walk: WALK_SPEED, run: RUN_SPEED }) : null;
  if (playerBody) scene.add(playerBody.root);
  const pouch = createPouch();
  const rain = createRain();
  // the signal-controlled crossing: one controller, through traffic, background pedestrians
  // how much traffic: the level of detail; tools (?q=) keep the crossing's own seven unless ?traffic=<factor>
  const vehSpecs = params.has('traffic') ? trafficSpecs(Number(params.get('traffic'))) : params.has('q') ? crossing.vehicles : trafficSpecs(gfxDetail({ ...gfx, lod: bootLod }).traffic);
  traffic = createTraffic({ geom: crossing, vehicles: vehSpecs, peds: crossing.peds, shop: createShop({ queue: mannerSpec.queue, pickup: mannerSpec.pickup }) });
  const vehicles = createVehicles(vehSpecs), signals = createSignals();
  // Nanjing Road East to Henan Road, the metro's Exits 7 and 2 (world/nanjingRoad.js), Henan Road's traffic
  const nanjing = createNanjingRoad(M); scene.add(nanjing.group);
  const henan = createHenanTraffic({ scene, factor: params.has('q') && !params.has('traffic') ? 0.35 : gfxDetail({ ...gfx, lod: bootLod }).traffic, addCollider: addDynamicCollider });
  // the city buses and their stops (world/buses.js); they let the crowd's commuters on and off
  // the bus's kerbside announcement as the doors open / as it pulls away, if you're near enough to hear
  const announce = (v, what) => {
    if (Math.hypot(v.x - player.body.x, v.z - player.body.z) > 30) return;
    const [who, zh, en] = what === 'arrive' ? BUS_LINES[Math.random() < 0.6 ? 0 : 1] : BUS_LINES[2];
    voice.say({ zh, en, who, at: [v.x, 2.2, v.z], gain: 0.8, lang: 'zh' });
  };
  const buses = createBuses({ scene, traffic, vehicles, audio, announce, crowd: { board: (...a) => (world && world.crowd ? world.crowd.board(...a) : 0), alight: (...a) => (world && world.crowd ? world.crowd.alight(...a) : 0) } });
  for (const st of BUS_STOPS) {                                   // the shelters are solid: their back wall and the sign pole
    const back = st.dir > 0 ? -1 : 1, bx = (st.dir > 0 ? L.westCurbX - 1.5 : L.eastCurbX + 1.5) + back * 0.75, b = addDynamicCollider('shelter');
    b.minX = bx - 0.12; b.maxX = bx + 0.12; b.minZ = st.z - 3.75; b.maxZ = st.z + 3.75;
    const px = (st.dir > 0 ? L.westCurbX - 1.5 : L.eastCurbX + 1.5) - back * 0.9, q = addDynamicCollider('shelter');
    q.minX = px - 0.1; q.maxX = px + 0.1; q.minZ = st.z - 3.9; q.maxZ = st.z - 3.5;
  }
  const pedestrians = people ? createRealPedestrians(traffic.peds, people) : createPedestrians(traffic.peds);
  const vehicleBoxes = traffic.vehicles.map(() => addDynamicCollider('vehicle'));
  // the crossing's pedestrians are solid to the player (they steer round you; you can still walk into them)
  pedBoxes = traffic.peds.map((p) => { const b = addDynamicCollider('npc'); b.id = p.id; return b; });
  traffic.vehicles.forEach((v, i) => { v.ice = ['taxi', 'sedan'].includes(vehSpecs[i].model); });   // petrol engines get an engine note
  scene.add(sky.mesh, skyline.group, river.group, bund.group, promenade.group, street.group, clue.mesh, npcs.group, ...pouch.meshes,
    vehicles.group, signals.group, pedestrians.group, rain.mesh, buses.group);
  // trees: London planes on Hankou Road (November: turning, some twigs already bare), camphor
  // laurels in the promenade planters
  const trees = createTrees([
    ...streetTrees.map((t, i) => ({ x: t.x, y: L.curbH, z: t.z, h: 8.4 + (i % 2) * 0.7, species: 'plane', seed: 31 + i, bare: 0.12, away: [0, -Math.sign(t.z)] })),
    ...planterIslands.map((p, i) => ({ x: (p.x0 + p.x1) / 2, y: L.deckY + 0.5, z: (p.z0 + p.z1) / 2 + (i % 2 ? 1.5 : -1.5), h: 4.2 + (i % 3) * 0.3, species: 'camphor', seed: 1 + i })),
  ], { wetBoost: weatherUniforms.wetBoost });
  scene.add(trees.group);
  // Manner Coffee's takeaway front on Hankou Road (world/shops.js), lit from inside
  const manner = createManner(L.curbH); scene.add(manner.group);
  const baristas = createBaristas({ scene, people, work: manner.work });   // and the two making the coffee in it (world/baristas.js)
  // a Lamborghini parked on Hankou Road (loads in the background; world/huracan.js)
  const huracan = createHuracan(scene);
  huracan.ready.then((r) => {
    if (!r) return;
    traffic.setSights([{ id: 'huracan', x: HURACAN_SPOT.x, z: HURACAN_SPOT.z }]);                        // passers-by look; some take a photo
    traffic.setObstacles([-1.5, 0, 1.5].map((dx) => ({ x: HURACAN_SPOT.x + dx, z: HURACAN_SPOT.z, r: 1.15 })));   // and walk round it
  });
  // the Peace Hotel's ground floor and the AIA lobby (world/interiors.js); their lamps join the light pool
  const interiors = createInteriors({ scene, people, hud, audio, getLife: () => life, save: () => saveLife(), player, onCard: showInfoCard, onLift: () => upper.goUp() });
  // up the lifts: the sixth floor and room 612 (world/hotelUpper.js)
  const upper = createHotelUpper({ scene, hud, audio, getLife: () => life, save: () => saveLife(), player, travel });
  // the Jazz Bar off the hall: the trio, Momo's night (world/jazzBar.js)
  // places a DiDi takes you that you can walk into (the North Bund flat, IFC 32F)
  const dests = createDestinations({ scene, people, hud, audio, getLife: () => life, save: () => saveLife(), player, travel, voice });
  // the Yangpu makerspace: build things (world/makerspace.js, engine/maker.js)
  const makers = createMakerspace({ scene, people, hud, audio, getLife: () => life, save: () => saveLife(), player, travel, onMode: buildMode, onWork: () => openWork('bench') });
  const jazz = createJazzBar({ scene, people, hud, audio, getLife: () => life, save: () => saveLife(), player, travel, onMode: seatMode });
  // places (phase 4.4): a shengjian shop on Nanjing Road (world/dumpling.js) and the river cruise from a
  // pier on the promenade (world/cruise.js)
  const dumpling = createDumpling({ scene, people, player, hud, audio, voice, getLife: () => life, save: () => saveLife(), onMode: shopMode });
  const cruise = createCruise({ scene, people, player, hud, audio, voice, getLife: () => life, save: () => saveLife(), travel, skipTo: (abs) => { lifeSkipTo(life, abs); saveLife(); }, ferryTo: (info) => world.dest.arrive('lujiazui', info),
    roles: people ? Object.keys(people.manifest.cast).filter((r) => !people.manifest.cast[r].named && !['lin', 'su', 'player', 'dad'].includes(r)) : [],
    clock: () => (PIN_HOUR ? 17 * 60 + 42 : life.clock.minute + life.clock.sec / 60) });   // (measurement tools: alongside, as at 5:42 pm)
  // where you can go in: a pool of light at each open door, a label over it when it's in view
  const entrances = createEntrances({ scene, camera, list: entranceList({ shopOpen: () => { const m = life.clock.minute; return m >= 390 && m < 1290; }, cruiseOpen: () => { const m = life.clock.minute; return m >= 9 * 60 + 30 && m < 21 * 60 + 30; }, metroOpen: () => hourState.metro }) });
  const lighting = createLighting(scene, street.lanterns, [...entrances.lights, ...dumpling.lights, { ...manner.light, intensity: 7, distance: 10, color: new THREE.Color(1.0, 0.92, 0.8) }, ...buses.lights, ...nanjing.lights, ...interiors.lights, ...upper.lights, ...jazz.lights, ...dests.lights, ...makers.lights]);
  // Lujiazui, across the river (world/lujiazui.js): built when you first go there, hidden while you're on the Bund
  const ljz = createLujiazui({ scene, camera, M, people, hud, audio, player, travel, skyline, dests, lighting, renderer: R.renderer, getLife: () => life, save: () => saveLife(), metroOpen: () => hourState.metro, metroPassage: () => world.metro.fromExit1(), trafficFactor: params.has('q') && !params.has('traffic') ? 0.6 : gfxDetail({ ...gfx, lod: bootLod }).traffic });
  // shadows: everything solid at street level casts and receives (not the sky, skyline, river, rain or glows)
  for (const g of [bund.group, promenade.group, street.group, npcs.group, vehicles.group, signals.group, pedestrians.group]) {
    g.traverse((o) => {
      if (!o.isMesh) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent || m.blending === THREE.AdditiveBlending) return;
      o.castShadow = true; o.receiveShadow = true;
    });
  }
  // the hour's part in the lights (world/dayNight.js): outdoors, whatever glows is a lamp unless it
  // has a role of its own (skyline, Nanjing Road, the boats set theirs)
  for (const g of [bund.group, promenade.group, street.group]) autoLights(g, 'lamps', 0.3);
  scene.updateMatrixWorld(true);
  world0 = { sky, skyline, river, lighting };
  applyHour(0, { force: true });
  captureEnvironment(R.renderer, scene);
  // what you buy: the courier at the kerb, parcels, the umbrella, headphones (world/belongings.js)
  const belongings = createBelongings({ scene, people, camera, hud, audio, getLife: () => life, save: () => saveLife() });
  // DiDi: a car from the traffic comes to the kerb; you ride in it (world/didi.js, world/rideFlow.js)
  const didi = createDidi({ scene, people, traffic, vehicles, camera, player, renderer: R.renderer });
  const rideFlow = createRideFlow({ getLife: () => life, didi, hud, audio, save: () => saveLife(), onMode: rideMode, voice, arriveAt: (d, info) => world.dest.arrive(d.id, info) || world.makerspace.arrive(d.id, info) });
  document.querySelector('#ride-card .go').addEventListener('click', () => { if (!closeInfoCard()) rideFlow.closeCard(); });
  // buying it: Vivian, the consultant, at the car (world/carSale.js, engine/carPurchase.js)
  const carSale = createCarSale({ scene, people, huracan, hud, audio, camera, player, getLife: () => life, save: () => saveLife(), onMode: saleMode, voice, testDrive: () => driving.testDrive() });
  if (life.flags.carBuy && ['booked', 'viewed', 'specced'].includes(life.flags.carBuy.stage) && lifeStamp(life) >= life.flags.carBuy.at - 5) carSale.appear('viewing');   // (met her but not ordered: she's still there)
  // once it's yours: drive it (world/driving.js)
  // people getting out of its way, and what happens if someone can't (world/roadReactions.js)
  const roads = createRoadReactions({ scene, people, hud, audio, traffic, player, getLife: () => life, save: () => saveLife(), getCrowd: () => world && world.crowd });
  const driving = createDriving({ huracan, traffic, camera, player, audio, hud, getLife: () => life, save: () => saveLife(), onMode: driveMode, carSale, crowdPeople: () => (world && world.crowd ? world.crowd.onCarriageway() : []), reactions: roads });
  world = { people, baristas, entrances, cruise, dumpling, dawn: createDawn({ scene, people, addCollider: addDynamicCollider }), buses, nanjing, henan, sky, skyline, river, bund, street, clue, lighting, npcs, pouch, vehicles, signals, pedestrians, vehicleBoxes, rain, playerBody, trees, belongings, didi, rideFlow, huracan, carSale, interiors, upper, jazz, dest: dests, driving, roads, makerspace: makers, walkers: createWalkers({ scene, people }), hailers: createHailers({ scene, people, traffic, vehicles, audio }) };
  // the evening crowd (engine/crowd.js, world/crowdView.js): how many from the level of detail;
  // tools (?q=) run a light one unless ?crowd=<density> says otherwise
  if (people && params.get('crowd') !== '0' && !(params.has('q') && !params.has('crowd'))) {
    const roles = Object.keys(people.manifest.cast).filter((r) => !people.manifest.cast[r].named && !['lin', 'su', 'player', 'dad'].includes(r));
    const det = gfxDetail({ ...gfx, lod: bootLod });
    const density = params.has('crowd') ? Number(params.get('crowd')) : params.has('q') ? 0 : det.crowd;   // tools: none unless asked
    world.crowd = createCrowd({ density, roles });
    world.crowdView = createCrowdView({ scene, renderer: R.renderer, people, crowd: world.crowd, roles, nearCount: params.has('q') ? 5 : det.nearPeople, camera });
    traffic.setExtraPeople(() => world.crowd.onCarriageway());
    henan.traffic.setExtraPeople(() => world.crowd.onHenan());
    crowdBoxes = Array.from({ length: (params.has('q') ? 5 : det.nearPeople) + 2 }, () => addDynamicCollider('npc'));
  }
  // the friends in person after the first days (world/friendScenes.js): Yu'an at the AIA, Momo in 612, LiDAR scans
  world.friends = createFriendScenes({ scene, people, hud, audio, voice, getLife: () => life, save: () => saveLife(), player, interiors });
  // Line 2: down an exit's stairs, through the gates, a real train under the river to Lujiazui and back (world/metro.js)
  world.metro = createMetro({ scene, camera, renderer: R.renderer, hud, audio, voice, player, people, travel, getLife: () => life, save: () => saveLife(), open: () => hourState.metro, onPudongSoon: () => world.ljz.buildAsync() });
  // the story: a sat-down conversation, and dinner with Dad (world/story.js, world/dinner.js)
  world.sceneTalk = createSceneTalk({ voice, getLife: () => life, save: () => saveLife(), names: { dad: ['爸爸', 'Dad'], ...MOMENT_NAMES } });
  world.dinner = createDinner({ scene, people, player, getLife: () => life, save: () => saveLife(), sceneTalk: world.sceneTalk, onMode: seatMode, hud });
  // small things that happen on the street (world/moments.js): off for measurement tools unless ?moments
  world.moments = createMoments({ scene, people, player, camera, canvas: R.renderer.domElement, hud, audio, voice, sceneTalk: world.sceneTalk, getLife: () => life, save: () => saveLife(),
    getHour: () => life.clock.minute, isFree: () => mode === 'play' && !phone.isOpen && !talk.open && !world.sceneTalk.active, enabled: !!people && (!params.has('q') || params.has('moments')) });
  // something of your own (engine/studio.js): lending the gimbal on the promenade at dusk, the desk in 612
  world.fieldTest = createFieldTest({ scene, people, player, hud, audio, voice, getLife: () => life, save: () => saveLife(), getCrowdView: () => world.crowdView, getRain: () => weather.rain,
    isFree: () => mode === 'play' && !phone.isOpen && !talk.open && !world.sceneTalk.active && !world.moments.active, enabled: !!people });
  world.workDesk = createWorkDesk({ scene, player, getLife: () => life, onOpen: () => openWork('desk') });
  // the year (world/yearWorld.js): Marlowe Finch on IFC 28F, the flat he rents, days played as a card, the stall; arrivals at Lujiazui go through it
  world.year = createYearWorld({ scene, people, player, hud, audio, voice, travel, sceneTalk: world.sceneTalk, dests, getLife: () => life, save: () => saveLife(), lifeOn: params.get('life') !== '0',
    freeze: (on) => { player.enabled = !on && mode === 'play'; if (on) { player.clearInput(); hud.prompt(false); } }, onWork: () => openWork('desk'), onSeason: (days, gap) => openSeason(days, gap) });
  places = [interiors, upper, jazz, dests, driving, makers, world.friends, world.metro, world.dinner, world.moments, world.cruise, world.dumpling, world.fieldTest, world.workDesk];
  places.push(world.year);
  // the five he might come to love, where their own days put them (world/romanceScenes.js): off for measurement tools unless ?hearts
  world.hearts = createRomanceScenes({ scene, people, player, hud, audio, sceneTalk: world.sceneTalk, travel, jazz, dinner: world.dinner, getLife: () => life, save: () => saveLife(),
    isFree: () => mode === 'play' && !phone.isOpen && !talk.open && !world.sceneTalk.active && !world.moments.active && !world.fieldTest.busy, enabled: !!people && HEARTS_ON });
  places.push(world.hearts);
  // a late-evening row outside the Peace Hotel, once a game (world/confrontation.js, engine/fight.js): off for measurement tools unless ?fight
  world.confront = createConfrontation({ scene, people, player, camera, canvas: R.renderer.domElement, hud, audio, voice, getLife: () => life, save: () => saveLife(), travel, onMode: fightMode, getPlayerBody: () => world.playerBody,
    isFree: () => mode === 'play' && !phone.isOpen && !talk.open && !world.sceneTalk.active && !world.moments.active && !world.fieldTest.busy, enabled: !!people && (!params.has('q') || params.has('fight')) });
  places.push(world.confront);
  // what a row sets off elsewhere: the people in his life hear of it (or saw it); if it was filmed, so does the office
  world.confront.onOutcome((R, L) => { try { if (R.blows) { if (R.companion) romanceEvent(L, R.companion.id, 'saw-fight', { outcome: R.outcome }); else romanceEvent(L, null, 'heard-fight', { outcome: R.outcome }); if (R.filmed) careerEvent(L, 'fight-seen', { where: 'the Peace Hotel' }); } saveLife(); } catch (e) { console.warn('fight outcome', e); } });
  world.ljz = ljz; places.push(ljz);
  // photo mode with the gimbal you built (world/photoMode.js): G
  world.photo = createPhotoMode({ camera, renderer: R.renderer, player, hud, audio, getLife: () => life, save: () => saveLife(), onMode: photoMode,
    getDynamic: () => ({ car: life.flags.car && world.huracan.loaded ? world.huracan.group.position : null, boats: world.river.boats.map((b) => b.g.position) }) });
  // new conversations among the people around you, and now and then to you (world/ambient.js)
  world.ambient = createAmbient({ llm, voice, hud, getLife: () => life, sceneText: () => sceneText(),
    convExchanges: T.dialogue.exchanges,
    getPeople: () => ({ linSu: { x: npcLayout.pairFocus.x, z: npcLayout.pairFocus.z }, pairs: [...world.interiors.talkPairs(), ...world.jazz.talkPairs()], talkables }) });
  // bumping into people: their reactions, a passing remark, a jolt for you
  bumps = createBumps({ hud, audio, onPlayerBump: ({ closing }) => { player.head.dipV -= 0.1 + 0.05 * Math.min(4, closing); player.head.roll += (Math.random() - 0.5) * 0.04; } });
  // wet-ground reflections: deck, pavements and carriageways, each with its own per-pixel mask
  const reflectors = [];
  scene.traverse((o) => { if (o.isMesh && (o.material === M.deck || o.material === M.sidewalk || o.material === M.asphalt)) { o.userData.ssrMask = ssrMask(o.material); reflectors.push(o); } });
  if (params.get('ssr') !== '0') R.setReflectors(reflectors);
  dialogueAudio = createDialogueAudio({
    speakLive: (line, onEnd) => { const p = npcs.getSpeakerPosition(line.speaker); voice.say({ zh: line.text, en: line.en, who: line.speaker, at: p ? [p.x, p.y, p.z] : null, onEnd }).then((h) => { if (!h && onEnd) onEnd(); }); },
    clipFor: (line) => voice.clipUrl(voice.langFor(line.speaker, line.text, line.en), voice.langFor(line.speaker, line.text, line.en) === 'zh' ? line.text : line.en),
    audio,
    camera,
    getSpeakerPosition: (id) => npcs.getSpeakerPosition(id),
    refDistance: npcLayout.audibility.refDistance,
    maxDistance: npcLayout.audibility.maxDistance,
  });
  // the listener's 嗯 at a natural pause in the other's line: a murmur and a nod
  dialogueAudio.delivery.onBackchannel = (speaker) => {
    if (Math.random() > 0.55) return;
    const listener = speaker === 'lin' ? 'su' : 'lin';
    if (npcs.nod) npcs.nod(listener);
    const d = _pairPos.distanceTo(camera.position);
    if (d < npcLayout.audibility.maxDistance) audio.cue('hum', 0, Math.max(0.15, Math.min(1, 3 / Math.max(1, d))));
  };
  conversation = createConversation({
    exchanges: T.dialogue.exchanges,
    greetings: T.dialogue.greetings,
    audio: dialogueAudio,
    getPlayerDistance: () => _pairPos.distanceTo(camera.position),
    maxAudibleDist: npcLayout.audibility.maxDistance,
  });
  mission1 = createMissionOne({
    hud, audio, pouch, npcs,
    isClueRead: () => clueRead,
    onViewClosed: () => { if (mode === 'pouch') exitInteraction(); },
  });
  mission1.mission.on('complete', ({ outcome }) => { world.year.handoff(outcome); });   // the pouch's outcome is kept in the save (world/career.js): the year comes back to it
  document.getElementById('inspect-paper').appendChild(clue.canvas);
  player.update(0);
  R.renderer.compile(scene, camera);
  mode = 'entry';
  hud.ready(lifeClock(life.clock.minute));
  titleScreen.ready();
}

// ---- mode changes ----
function lock() {
  if (noLock) return;
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* handled by pointerlockerror */ }
}
// a card for an evening somewhere (the Jazz Bar): E or click to carry on
function showInfoCard({ place, line, fare = '', back = '' }) {
  const c = document.getElementById('ride-card'); if (!c) return;
  c.querySelector('.place').textContent = place; c.querySelector('.line').textContent = line;
  c.querySelector('.fare').textContent = fare; c.querySelector('.back').textContent = back; c.querySelector('.go').textContent = tx('rideContinue');
  c.classList.add('on'); c.dataset.info = '1';
}
// going somewhere through a fade (a lift, sleep): nothing to act on while the screen is dark
const veil = createVeil();
let places = [];   // modules with candidates / prompt / owns / interact (the hotel, its upper floor ...)
function travel(during, opts) {
  if (veil.busy) return;
  const from = mode; mode = 'travel'; player.enabled = false; player.clearInput(); hud.prompt(false); target = null;
  veil.cover(during, opts).then(() => { if (mode === 'travel') { mode = opts && opts.to ? opts.to : from === 'travel' ? 'play' : from; player.enabled = mode === 'play'; if (mode === 'play') player.lookOnly = false; player.clearInput(); } });
}
function closeInfoCard() { const c = document.getElementById('ride-card'); if (c && c.dataset.info) { c.classList.remove('on'); delete c.dataset.info; return true; } return false; }
// talking with Vivian at the car (1-4), or sat in it (the car sale has the camera)
function saleMode(m) {
  if (m === 'sale') { mode = 'sale'; player.enabled = false; player.lookOnly = false; player.clearInput(); hud.prompt(false); target = null; }
  else if (m === 'sale-seat') { mode = 'sale-seat'; player.enabled = false; player.lookOnly = true; }
  else { mode = 'play'; player.enabled = true; player.lookOnly = false; player.clearInput(); }
}
// at the wheel: the car has the camera (V for the driver's seat, where the mouse looks round)
function driveMode(m) {
  if (m === 'drive') { if (phone.isOpen) phone.close(); mode = 'drive'; player.enabled = false; player.lookOnly = true; player.clearInput(); hud.prompt(false); target = null; }
  else { mode = 'play'; player.enabled = true; player.lookOnly = false; player.clearInput(); }
}
// where you are and what's going on, in a sentence or two, for whoever you're talking to
function sceneText(extra = '') {
  if (world.year && world.year.here) return `${world.year.sceneText(clockOf(life.clock.minute))}${extra ? ` ${extra}` : ''}`;   // at the firm, or in his flat
  const b = player.body, l = life, m = l.clock.minute, inR = (r) => b.x > r.x0 && b.x < r.x1 && b.z > r.z0 && b.z < r.z1;
  { const ml = world.metro && world.metro.sceneLine(); if (ml) return `${clockOf(m)}, ${ml}.${extra ? ` ${extra}` : ''}`; }   // in the metro
  if (world.ljz && world.ljz.here(b)) return world.ljz.sceneLine(clockOf(m), weather.rain > 0.3, extra);   // in Lujiazui
  const where = world.makerspace && world.makerspace.here ? 'the Yangpu riverside makerspace in an old brick factory: benches, 3D printers humming, a CNC, a whiteboard of sketches' : world.dest && world.dest.here === 'lujiazui' ? 'the 32nd floor of IFC in Lujiazui, a robot-arm start-up\'s office, the Bund lit up across the river'
    : world.dest && world.dest.here === 'northbund' ? 'an empty top-floor show flat on the North Bund, 160 m up, the river and Lujiazui through the glass'
    : world.upper && world.upper.here ? 'the sixth floor of the Peace Hotel, by room 612'
    : b.y < 5 && b.x > JAZZ.x0 && b.x < JAZZ.x1 && b.z > JAZZ.z0 && b.z < JAZZ.z1 ? 'the Peace Hotel Jazz Bar: dim, panelled, a piano trio on the little stage'
    : inR(PEACE_R) ? 'the Peace Hotel\'s great hall on the Bund (1929): marble, brass, the stained-glass rotunda overhead'
    : inR(AIA_R) ? 'the granite lobby of the AIA Building on the Bund, by the face-recognition gates'
    : b.x > L.wallX ? 'the Bund promenade by the Huangpu river, Pudong\'s towers and the Oriental Pearl lit up across the water, people taking photos'
    : Math.abs(b.z) < 6 && b.x < L.westCurbX ? 'Hankou Road just off the Bund, by the Manner Coffee window and the old Customs House'
    : b.z < -190 && b.z > -215 && b.x < L.westCurbX ? 'Nanjing Road East at the Bund, outside the Peace Hotel, crowds and shopping bags'
    : 'Zhongshan East 1st Road on the Bund, the old banks floodlit gold, traffic going by';
  const wx = weather.rain > 0.3 ? 'a light drizzle' : 'a cool clear November evening, a breeze off the river';
  const has = [cupFor > 0 ? 'he is holding a Manner coffee' : '', world.belongings && world.belongings.umbrellaUp ? 'he has an umbrella up' : '', l.flags.car ? 'he owns a new yellow Lamborghini Huracán (parked nearby)' : ''].filter(Boolean).join('; ');
  return `${clockOf(m)}, ${wx}. ${where}.${has ? ` (${has}.)` : ''}${extra ? ` ${extra}` : ''}`;
}
// talking: whoever it is stops and turns to you; the conversation has the keyboard
let talkHold = null;
function startTalk(t, { inRide = false, opener = null } = {}) {
  if (!t || talk.open) return;
  talkHold = t; t.hold && t.hold(true, player.body);
  if (!inRide) { mode = 'talk'; player.enabled = false; player.clearInput(); hud.prompt(false); target = null; }
  world.rideFlow.quiet = inRide;
  talk.start({ id: t.persona, opener, greet: !opener, scene: () => `${sceneText(inRide ? `You are driving him in your DiDi${world.rideFlow.ride ? ` to ${world.rideFlow.ride.to}` : ''}.` : '')} ${storyContext(life, t.persona)}`.trim(), at: () => [t.x, t.y, t.z], onClose: () => {
    if (talkHold && talkHold.hold) talkHold.hold(false, player.body); talkHold = null; world.rideFlow.quiet = false;
    if (mode === 'talk') { mode = 'play'; player.enabled = true; player.clearInput(); }
  } });
}
// everyone near enough to talk to
function talkables() {
  const out = [];
  for (const q of traffic ? traffic.peds : []) if (q.active !== false && q.visible !== false) out.push({ key: `ped:${q.id}`, persona: PERSONAS[q.persona] ? q.persona : 'office', x: q.x, y: (q.y ?? L.curbH) + 1.62, z: q.z, hold(on, pp) { if (on) { q.pause = 999; q.faceTo = [pp.x, pp.z]; q.faceFor = 999; } else { q.pause = 0.3; q.faceFor = 0; q.faceTo = null; } } });
  for (const m of [world.walkers, world.interiors, world.jazz, world.dest, world.carSale, world.makerspace, world.friends, world.fieldTest]) if (m && m.talkables) out.push(...m.talkables());
  if (world.year) out.push(...world.year.talkables());                       // colleagues, once the day's meeting is over
  if (world.hearts) out.push(...world.hearts.talkables());
  if (world.ljz) out.push(...world.ljz.talkables());
  if (world.crowdView) for (const a of world.crowdView.nearAgents()) {
    if (a.kind === 'follower' || a.leader) continue;                       // the one in charge answers for a group or a couple
    out.push({ key: `crowd:${a.id}`, persona: PERSONAS[a.persona] ? a.persona : 'visitor', x: a.x, y: a.y + 1.62 * (a.scale || 1), z: a.z,
      hold(on, pp) { if (on) { a._saved = { state: a.state, act: a.act, wait: a.wait }; a.state = 'act'; a.act = 'look'; a.wait = 999; a.heading = Math.atan2(pp.x - a.x, pp.z - a.z); } else if (a._saved) { a.state = a._saved.state === 'act' ? 'act' : 'walk'; a.act = a._saved.act; a.wait = Math.min(a._saved.wait, 3); a._saved = null; } } });
  }
  return out;
}
// photo mode: you stand still and frame; the mouse still looks
function photoMode(m) {
  if (m === 'photo') { mode = 'photo'; player.enabled = false; player.lookOnly = true; player.clearInput(); hud.prompt(false); target = null; }
  else { mode = 'play'; player.enabled = true; player.lookOnly = false; player.clearInput(); }
}
// a confrontation (world/confrontation.js): he is in front of you; answers 1-4, then your hands (F R Space A D Q)
function fightMode(m) {
  if (m === 'fight') { if (phone.isOpen) phone.close(); mode = 'fight'; player.enabled = false; player.lookOnly = true; player.clearInput(); hud.prompt(false); target = null; }
  else { mode = 'play'; player.enabled = true; player.lookOnly = false; player.clearInput(); }
}
// at the workbench: the build panel has the keys
function buildMode(m) {
  if (m === 'build') { mode = 'build'; player.enabled = false; player.lookOnly = false; player.clearInput(); hud.prompt(false); target = null; }
  else { mode = 'play'; player.enabled = true; player.lookOnly = false; player.clearInput(); }
}
// sat at a table in the Jazz Bar: look around, E to stand
// at the shengjian shop's counter: the order card has the keys (world/dumpling.js); sitting is seat mode
function shopMode(m) {
  if (m === 'menu') { mode = 'menu'; player.enabled = false; player.lookOnly = false; player.clearInput(); target = null; hud.prompt(false); }
  else seatMode(m === 'seat' ? 'seat' : 'play');
}
function seatMode(m) {
  if (m === 'seat') { mode = 'seat'; player.enabled = false; player.lookOnly = true; player.clearInput(); target = null; }
  else { mode = 'play'; player.enabled = true; player.lookOnly = false; player.clearInput(); }
}
// in a DiDi: the car has the camera; you can look around and answer (1-4)
let pausedFrom = 'play';
function rideMode(m) {
  if (m === 'ride') {
    if (phone.isOpen) phone.close();
    mode = 'ride'; player.enabled = false; player.lookOnly = true; player.clearInput(); hud.prompt(false); target = null;
    hud.toast(tx('rideHint'), 4);
  } else {                                                                     // back on the Bund: out at the pickup point
    player.lookOnly = false;
    player.teleport(PICKUP.x, PICKUP.z - 1.2, Math.PI / 2, 0);                 // facing west, toward Hankou Road
    mode = 'play'; player.enabled = true; player.clearInput();
  }
}
function play() {
  const back = pausedFrom === 'ride' && world && world.rideFlow && (world.rideFlow.inCar || world.rideFlow.card);
  const seat = pausedFrom === 'seat' || pausedFrom === 'drive';
  mode = back ? 'ride' : seat ? pausedFrom : 'play'; player.enabled = !back && !seat; pausedFrom = 'play'; audio.resume();
  if (conversation) conversation.setPaused(false);
  hud.show('pause', false);
}
function begin() {
  if (mode !== 'entry') return;
  audio.start(); lock(); play(); hud.begin(lifeClock(life.clock.minute));
  if (devControls) hud.show('dev', true);
  if (conversation && conversation.state === 'idle') conversation.start();
  // coming back to it: where your own thing stands (not for measurement tools)
  if (hasProduct(life) && !params.has('q')) setTimeout(() => { if (mode === 'play') hud.toast(workReminder(), 6); }, 7000);
}
// one line on the gimbal's week: the version, the evenings left, who's waiting
function workReminder() {
  const s = workSummary(life), st = workState(life), left = finalDay(life) - life.clock.day, zhUI = getLang() === 'zh';
  const waiting = Object.entries(st.people).filter(([, p]) => p.promised != null).map(([id]) => (zhUI ? WORK_REG[id].name.zh : WORK_REG[id].name.en));
  const dinner = life.flags.dinnerChoice || left < 0 ? '' : zhUI ? (left === 0 ? ' · 今晚和爸爸吃饭' : ` · 离和爸爸吃饭还有 ${left} 个晚上`) : (left === 0 ? ' · dinner with Dad tonight' : ` · ${left} ${left === 1 ? 'evening' : 'evenings'} until the dinner with Dad`);
  return zhUI ? `夜行云台 · 第 ${s.rev} 版${dinner}${waiting.length ? ` · ${waiting.join('、')}等着试改过的` : ''} · N 翻开本子` : `Night gimbal · version ${s.rev}${dinner}${waiting.length ? ` · ${waiting.join(' and ')} ${waiting.length === 1 ? 'is' : 'are'} waiting to try the changed one` : ''} · N for your notebook`;
}
function pause() {
  // pausing cancels an open interaction (it can be re-entered afterwards)
  if (mode === 'inspect') closeInspect();
  if (mode === 'dialogue') closeDialogue();
  if (mode === 'pouch') closePouch();
  if (mode === 'photo') world.photo.toggle();                                        // pausing lowers the camera
  if (mode !== 'play' && mode !== 'ride' && mode !== 'seat' && mode !== 'drive') return;
  pausedFrom = mode;
  mode = 'pause'; player.enabled = false; audio.setPaused(true);
  if (conversation) conversation.setPaused(true);
  hud.show('pause', true); hud.prompt(false); hud.subtitle(false);
}
// Every interaction enters and leaves through these two, so controls always come back the same
// way: movement re-enabled, held keys forgotten, the camera left exactly where it is (no snap).
function enterInteraction(m) {
  mode = m; player.enabled = false; player.clearInput(); hud.prompt(false);
  target = null;
}
function exitInteraction() {
  mode = 'play'; player.enabled = true; player.clearInput();
}
const INSPECT = {
  zh: `<h2>寻人启事</h2>
    <p>纸被雨打湿过，中间那段电话号码晕开了。</p>
    <p class="scrawl">上面有人用红色马克笔写了一行沪语：<br /><em>“侬勿要再寻了。想晓得，就乘末班轮渡。”</em></p>
    <p>角上用胶带粘着一枚轮渡筹码：<em>金陵东路</em>。</p>`,
  en: `<h2>Missing-person notice</h2>
    <p><b>Zhou Bonian</b>, male, 67, about 1.70&nbsp;m, glasses, speaks Shanghainese. Has kept a watch-repair stall on Hankou Road for more than thirty years.</p>
    <p>Lost contact at dusk on 29 October, near the Customs House on the Bund, after packing up his stall. Dark grey jacket; carrying a brown toolbox.</p>
    <p>Anyone with information, please contact the family. The middle of the phone number has run in the rain.</p>
    <p class="scrawl">Across it, in red marker, in Shanghainese:<br /><em>"Stop looking. If you want to know, take the last ferry."</em></p>
    <p>A ferry token is taped to the corner: <em>Jinling East Road</em>.</p>`,
};
function openInspect() {
  document.getElementById('inspect-aside').innerHTML = `${INSPECT[getLang()]}<div class="close"><kbd>E</kbd> ${tx('putBack')}</div>`;
  enterInteraction('inspect'); hud.subtitle(false); hud.show('inspect', true);
}
function closeInspect() {
  hud.show('inspect', false);
  exitInteraction();
  if (!clueRead) {
    clueRead = true;
    hud.thought('末班轮渡。金陵东路渡口，沿江往南。', 'The last ferry. Jinling East Road pier, south along the water.');   // (one shown, by language)
  }
}
function openDialogue() {
  if (mode !== 'play') return;
  enterInteraction('dialogue');
  // Mission One decides what Old Lin says (offer / reminder / handoff); null = ordinary greeting
  const line = mission1 ? mission1.greetLine() : null;
  if (conversation) conversation.enterInteraction(line);
}
function closeDialogue() {
  if (conversation) conversation.exitInteraction();
  hud.subtitle(false);
  exitInteraction();
  if (mission1) mission1.dialogueClosed();
}
// E inside the dialogue: answer Old Lin's request if he made one, otherwise step back
function confirmDialogue() {
  const r = mission1 ? mission1.dialogueConfirm() : 'close';
  if (r === 'accept') { const line = mission1.accept(); if (line && conversation) conversation.enterInteraction(line); }
  else if (r === 'decline' || r === 'close') closeDialogue();
}
function openPouch() {
  if (mode !== 'play' || !mission1) return;
  if (mission1.openPickup()) { enterInteraction('pouch'); hud.subtitle(false); }
}
function closePouch() { if (mission1) mission1.closeView(false); if (mode === 'pouch') exitInteraction(); }
function devMission(start) {
  if (!mission1 || mode === 'boot' || mode === 'entry') return;
  if (mode === 'dialogue') closeDialogue();
  if (mode === 'inspect') closeInspect();
  if (mode === 'pouch') closePouch();
  if (start) mission1.devStart(); else mission1.mission.reset();
  hud.toast(start ? 'DEV · 任务一开始 · Mission One started' : 'DEV · 任务一重置 · Mission One reset', 2.4);
}

document.getElementById('begin').addEventListener('click', begin);
document.getElementById('resume').addEventListener('click', () => { lock(); if (noLock) play(); });
// ---- settings: language, subtitles, sound (title screen and pause menu) ----
// first-play tips (ui/tips.js): once each, when you're free; off for measurement tools unless ?tips
const tips = createTips({ isFree: () => mode === 'play' && !(phone && phone.isOpen) && !talk.open && !(world && world.sceneTalk.active) });
if (params.has('q') && !params.has('tips')) tips.setOn(false, false);
function syncSettings() {
  for (const seg of document.querySelectorAll('.seg[data-setting]')) {
    const c = llm.conf();
    const k = seg.dataset.setting;
    const cur = k.startsWith('g.') ? String(typeof gfx[k.slice(2)] === 'boolean' ? +gfx[k.slice(2)] : gfx[k.slice(2)])
      : { music: worldMusic.on ? 'on' : 'off', lang: getLang(), subs: subtitlesOn ? 'on' : 'off', sound: audio.muted ? 'off' : 'on', voices: voice.mode, voiceServer: voice.newLines === 'server' ? 'server' : voice.newLines, ai: c.mode === 'browser' ? 'browser' : c.mode === 'off' ? 'off' : 'auto', tips: tips.on ? 'on' : 'off' }[k];
    for (const b of seg.querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === cur);
  }
  syncGfx();
  // the music's credits (CC BY: title, artist, a link to the work, the licence), every track the game ships with
  { const ul = document.querySelector('#music-credits ul'); if (ul && !ul.childElementCount) ul.innerHTML = Object.values(MUSIC_TRACKS).map((t) => `<li>“${t.title}” · ${t.artist} · <a href="${t.page}" target="_blank" rel="noopener">OpenGameArt</a> · <a href="${MUSIC_LICENCE.url}" target="_blank" rel="noopener">${MUSIC_LICENCE.name}</a></li>`).join(''); }
  const c = llm.conf(), sv = document.getElementById('ai-server'), md = document.getElementById('ai-model');
  if (sv && document.activeElement !== sv) sv.value = c.server; if (md && document.activeElement !== md) md.value = c.model;
  const st = document.getElementById('ai-status'), vs = voice.stats;
  if (st) st.textContent = getLang() === 'zh'
    ? `AI：${llm.backend === 'server' ? `已连接本地服务` : llm.backend === 'browser' ? '浏览器内模型' : llm.status.startsWith('loading') ? `加载中 ${Math.round(llm.progress * 100)}%` : '未连接（简单回应）'} · 语音：${vs.size} 句录好的人声${vs.serverUp ? ' + 本地语音服务' : ''}`
    : `AI: ${llm.backend === 'server' ? 'local server connected' : llm.backend === 'browser' ? 'model in the browser' : llm.status.startsWith('loading') ? `loading ${Math.round(llm.progress * 100)}%` : 'not connected (simple replies)'} · Voices: ${vs.size} recorded lines${vs.serverUp ? ' + local voice server' : ''}`;
}
// ---- graphics settings (the Graphics tab) ----
function syncGfx() {
  const sl = document.getElementById('g-scale'), out = document.getElementById('g-scale-v');
  if (!sl) return;
  if (document.activeElement !== sl) sl.value = Math.round(gfx.scale * 100);
  const [w, h] = R.pixels; out.textContent = `${Math.round(gfx.scale * 100)}% · ${w}×${h}`;
  document.querySelector('#settings .g-reload').hidden = gfx.lod === bootLod;
  const st = document.getElementById('g-status');
  if (st) st.textContent = tx('gStatus', (gpuName.replace(/^ANGLE \(|\)$/g, '').replace(/\s*\(0x[0-9a-f]+\)|Direct3D.*|ANGLE Metal Renderer: |, Unspecified Version/gi, '').split(',').slice(-1)[0] || '?').trim().slice(0, 40), Math.round(1000 / R.frameMs), R.frameMs.toFixed(1), w, h, R.drop);
}
function setGfx(key, value) {
  gfx = gfxTweak(gfx, key, value);
  saveGfx(gfx);
  if (!params.has('q')) R.apply(gfx);
  if (world) world.river.setMirrorSize(gfx.mirror);
  syncSettings();
}
document.getElementById('g-scale')?.addEventListener('input', (e) => setGfx('scale', Number(e.target.value) / 100));
document.getElementById('g-reload')?.addEventListener('click', () => location.reload());
document.getElementById('set-tabs')?.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]'); if (!b) return;
  for (const x of document.querySelectorAll('#set-tabs button')) x.classList.toggle('on', x === b);
  for (const body of document.querySelectorAll('#settings .tab-body')) body.hidden = body.dataset.body !== b.dataset.tab;
  syncSettings();
});
setInterval(() => { if (!document.getElementById('settings').classList.contains('hidden')) syncGfx(); }, 500);
for (const id of ['ai-server', 'ai-model']) document.getElementById(id)?.addEventListener('change', () => { llm.configure({ aiServer: document.getElementById('ai-server').value.trim(), aiModel: document.getElementById('ai-model').value.trim() }).then(syncSettings); });
for (const id of ['ai-server', 'ai-model']) document.getElementById(id)?.addEventListener('keydown', (e) => e.stopPropagation());
document.addEventListener('click', (e) => {
  const b = e.target.closest('.seg[data-setting] button');
  if (b) {
    const k = b.parentElement.dataset.setting, v = b.dataset.v;
    if (k.startsWith('g.')) { if (!b.disabled) setGfx(k.slice(2), ['ao', 'ssr', 'bloom', 'auto'].includes(k.slice(2)) ? v === '1' : ['preset', 'lod'].includes(k.slice(2)) ? v : Number(v)); return; }
    if (k === 'lang') setLang(v);
    if (k === 'subs') subtitlesOn = v === 'on';
    if (k === 'sound' && (audio.muted !== (v === 'off'))) audio.toggleMute();
    if (k === 'voices') voice.setMode(v);
    if (k === 'tips') tips.setOn(v === 'on');
    if (k === 'music') worldMusic.setOn(v === 'on');
    if (k === 'voiceServer') voice.setNewLines(v);
    if (k === 'ai') llm.configure({ ai: v === 'browser' ? 'browser' : v, aiBrowser: v === 'browser' ? 1 : 0 }).then(syncSettings);
    syncSettings(); return;
  }
  if (e.target.closest('[data-open-settings]')) { document.getElementById('settings').classList.remove('hidden'); syncSettings(); return; }
  if (e.target.closest('[data-open-saves]')) { saveLife(); saves.open(); return; }
  if (e.target.closest('[data-close-settings]') || e.target.id === 'settings') document.getElementById('settings').classList.add('hidden');
});
onLang(() => syncSettings());
syncSettings();
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) { if (mode === 'pause') play(); }
  else if (!noLock && (mode === 'play' || mode === 'ride' || mode === 'seat' || mode === 'drive' || mode === 'photo' || mode === 'inspect' || mode === 'dialogue' || mode === 'pouch') && !(phone && phone.isOpen)) pause();   // the phone frees the mouse on purpose
});
document.addEventListener('pointerlockerror', () => {
  // Pointer lock refused (embedded frame, or re-requested too soon after Esc)
  if (mode === 'play' && !document.pointerLockElement) { noLock = true; hud.toast(tx('dragLook'), 5); }
});
// ---- input: one key press does exactly one thing ----
// Priority, first match wins:
//   1. global toggles that never touch the world: M sound, C subtitles, F8/F9 (dev builds)
//   2. entry screen: Enter begins
//   3. pause: Esc (drag-look mode) resumes; nothing else
//   4. an open interaction owns E, W/S (arrows, wheel) and Esc:
//        inspect  E or Esc closes
//        dialogue W/S moves the highlighted answer; E confirms it (or steps back); Esc steps back
//        pouch    W/S moves the highlight; E confirms / hold E on "break the seal"; Esc leaves it
//   5. walking about: E acts on the single selected target, if there is one
const CHOICE_KEYS = { KeyW: -1, ArrowUp: -1, KeyS: 1, ArrowDown: 1 };
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.code;
  if (k === 'KeyM' && e.shiftKey) { hud.toast(tx(audio.toggleMute() ? 'soundOff' : 'soundOn'), 2.4); syncSettings(); return; }   // (M alone is the map)
  if (k === 'KeyC' && (mode === 'play' || mode === 'dialogue')) {
    subtitlesOn = !subtitlesOn;
    hud.toast(tx(subtitlesOn ? 'subsOn' : 'subsOff'), 2.4); syncSettings();
    return;
  }
  if ((k === 'F8' || k === 'F9') && devControls) { e.preventDefault(); devMission(k === 'F8'); return; }
  if (k === 'F6' && devControls) {
    e.preventDefault();
    const w = wind.cycle();
    hud.toast(`DEV · 风 · Wind: ${w || 'auto (breeze, stronger in rain)'}`, 2.4);
    return;
  }
  if (k === 'F7' && devControls) {
    e.preventDefault();
    hud.toast(weather.toggle() === 'drizzle' ? tx('devDrizzle') : tx('devClear'), 2.4);
    return;
  }
  if (mode === 'entry') { if (k === 'Enter') begin(); return; }
  if (mode === 'pause') { if (k === 'Escape' && noLock) play(); return; }
  if (mode === 'inspect') { if (k === 'KeyE' || (k === 'Escape' && noLock)) closeInspect(); return; }
  if (mode === 'dialogue') {
    if (k in CHOICE_KEYS) { if (mission1) mission1.dialogueMove(CHOICE_KEYS[k]); e.preventDefault(); }
    else if (k === 'KeyE') confirmDialogue();
    else if (k === 'Escape' && noLock) closeDialogue();
    return;
  }
  if (mode === 'pouch') {
    if (k in CHOICE_KEYS) { mission1.viewMove(CHOICE_KEYS[k]); e.preventDefault(); }
    else if (k === 'KeyE') mission1.viewPress(true);
    else if (k === 'Escape' && noLock) closePouch();
    return;
  }
  if (mode === 'sale' || mode === 'sale-seat') { if (world.carSale.key(k)) e.preventDefault(); return; }
  if (mode === 'build') { if (world.makerspace.key(k)) e.preventDefault(); return; }
  if (mode === 'photo') { if (world.photo.key(k)) e.preventDefault(); return; }
  if (mode === 'menu') { world.dumpling.key(k); e.preventDefault(); return; }
  if (mode === 'seat') {
    if (world.dumpling.seated) { if (world.dumpling.key(k)) e.preventDefault(); else if (k === 'Escape' && noLock) pause(); return; }
    if (world.sceneTalk.key(k)) { e.preventDefault(); return; }
    if (k === 'KeyE') { if (world.dinner.seated) { if (!world.dinner.canStand()) return; world.dinner.stood(); } world.jazz.stand(); }
    else if (k === 'Escape' && noLock) pause();
    return;
  }
  if (mode === 'journal') { if (k === 'KeyJ' || k === 'Escape') { journal.close(); e.preventDefault(); } return; }
  if (mode === 'season') { season.key(k); e.preventDefault(); return; }
  if (mode === 'profile') { profilePage.key(k); e.preventDefault(); return; }
  if (mode === 'work') { workbook.key(k); e.preventDefault(); return; }                 // the notebook has the keys
  if (mode === 'map') { if (k === 'KeyM' || k === 'Escape') worldMap.close(); else worldMap.key(k); e.preventDefault(); return; }
  if (mode === 'drive') { if (world.driving.key(k)) e.preventDefault(); else if (k === 'Escape' && noLock) pause(); return; }
  if (mode === 'fight') { if (world.confront.key(k)) e.preventDefault(); return; }      // the row has the keys: 1-4, then F R Space Q
  if (mode === 'ride') {
    if (k === 'KeyT' && world.rideFlow.inCar && world.rideFlow.ride && world.rideFlow.ride.driver && !talk.open) { const d = world.rideFlow.ride.driver; startTalk({ key: 'driver', persona: `driver:${d.id}`, x: camera.position.x, y: camera.position.y, z: camera.position.z }, { inRide: true }); e.preventDefault(); return; }
    if (world.rideFlow.key(k)) { e.preventDefault(); return; }
    if (k === 'Escape' && noLock) pause();
    return;
  }
  if (mode === 'play') {
    if (world.moments.key(k)) { e.preventDefault(); return; }   // a street moment: answers (1-4), the shutter
    if (world.hearts.key(k)) { e.preventDefault(); return; }    // one of the five, talking: answers (1-4)
    if ((k === 'KeyE' || k === 'Enter') && closeInfoCard()) return;
    if (world && world.belongings && world.belongings.key(k)) return;
    if (world.dest.key(k)) return;
    if (k === 'KeyG') { world.photo.toggle(); e.preventDefault(); return; }
    if (k === 'KeyJ') { openJournal(); e.preventDefault(); return; }
    if (k === 'KeyN') { openWork('read'); e.preventDefault(); return; }
    if (k === 'KeyI') { openProfile(); e.preventDefault(); return; }               // the character page               // your notebook, to read (you write at a desk)
    if (k === 'KeyM') { openMap(); e.preventDefault(); return; }
    if (k === 'KeyT' && world.ambient.opener) { const o = world.ambient.opener; world.ambient.clearOpener(); startTalk(o.talkable, { opener: o.line }); e.preventDefault(); return; }
    if (k === 'KeyT' && talkTarget) { startTalk(talkTarget); e.preventDefault(); return; }
    if (k === 'KeyE') interact();
    else if (k === 'Escape' && noLock) pause();
  }
});
window.addEventListener('keyup', (e) => { if (e.code === 'KeyE' && mission1) mission1.viewPress(false); });
window.addEventListener('wheel', (e) => {
  const d = Math.sign(e.deltaY);
  if (!d) return;
  if (mode === 'dialogue' && mission1) mission1.dialogueMove(d);
  else if (mode === 'pouch' && mission1) mission1.viewMove(d);
}, { passive: true });
window.addEventListener('blur', () => { if (mission1) mission1.viewPress(false); });
window.addEventListener('blur', () => { if ((mode === 'play' || mode === 'dialogue' || mode === 'pouch' || mode === 'inspect') && noLock) pause(); });

// E while walking: act on the one selected target
function interact() {
  if (!target) return;
  if (target.id === 'lin') openDialogue();
  else if (target.id === 'pouch') openPouch();
  else if (target.id === 'notice') openInspect();
  else if (target.id === 'didi') world.rideFlow.board();
  else if (target.id === 'vivian') world.carSale.interact();
  else if (places.some((p) => p.owns(target.id))) places.find((p) => p.owns(target.id)).interact(target.id);
  else if (world.belongings.interact(target.id)) { /* the courier */ }
  else if (target.id === 'manner') {
    const mo = life.flags.mannerOrder;
    if (mo && !mo.done && mo.notified) { mo.done = true; cupFor = 240; hud.bark({ speaker: { zh: '店员', en: 'Barista' }, text: { zh: `${mo.num}号，您的${mo.item.name}，拿好～`, en: `Number ${mo.num}, your ${mo.item.en.toLowerCase()}. Here you go.` }, seconds: 2.6 }); saveLife(); }
    else if (mo && !mo.done) hud.bark({ speaker: { zh: '店员', en: 'Barista' }, text: { zh: '稍等一下哦，马上好。', en: 'Just a moment, nearly ready.' }, seconds: 2.2 });
    else { hud.bark({ speaker: { zh: '店员', en: 'Barista' }, text: { zh: '您好～扫码点单哦，码在窗口这边。', en: 'Hi! Scan the code by the window to order.' }, seconds: 2.6 }); phone.openManner(); }
    world.baristas.greet();
  }
}
player.onStep = (surface, running, landing) => audio.step(world && world.metro && world.metro.under > 0.5 ? 'stone' : surface, running, landing);   // (underground: the station's granite, whatever is overhead)
// If the browser kept the context suspended despite the Begin click, any later gesture wakes it.
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => {
  const c = audio.getContext();
  if (c && c.state === 'suspended' && !audio.paused && mode !== 'pause') c.resume();
});

// ---- frame ----
let target = null, boundaryCooldown = 0, talkTarget = null;   // target: { id, dist, cos } or null
const debug = { noReflect: false, freezeTraffic: false };   // freezeTraffic: screenshot tool only
debug.music = worldMusic;                                     // music in the world: what plays where (tools)
const _v = new THREE.Vector3(), _d = new THREE.Vector3();

function wrapAngle(a) {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

// subtitles: the spoken line (Mandarin) or, in English, its translation
const SPEAKER_NAMES = { lin: { zh: '老林', en: 'Old Lin' }, su: { zh: '苏女士', en: 'Ms. Su' } };
const lineText = (line) => (getLang() === 'zh' ? line.text : (line.en || line.text));
// what the prompt says for each target: who / what, then the action E will take
const PROMPTS = {
  lin: () => ({ target: tx('pLin'), action: tx(mission1 && mission1.mission.carrying ? 'pHandOver' : 'pTalk') }),
  notice: () => ({ target: tx('pNotice'), action: tx(clueRead ? 'pReread' : 'pRead') }),
  pouch: () => ({ target: tx('pPouch'), action: tx('pLook') }),
  manner: () => {
    const mo = life.flags.mannerOrder;
    if (mo && !mo.done && mo.notified) return { target: 'Manner Coffee', action: tx('pCollect', mo.num) };
    if (mo && !mo.done) return { target: 'Manner Coffee', action: tx('pBeingMade') };
    return { target: 'Manner Coffee', action: tx('pOrder') };
  },
};
const _player = { x: 0, z: 0, vx: 0, vz: 0 };
let pedBoxes = [], crowdBoxes = [], bumps = null;
// ---- the protagonist's life and phone (engine/life.js, world/agenda.js, ui/phone) ----
const LIFE_KEY = slotKey(currentSlot());   // the slot you're playing (ui/saves.js); slot 1 is the original save
let life = null;
try { life = params.has('fresh') ? null : lifeLoad(localStorage.getItem(LIFE_KEY)); } catch { life = null; }
if (!life) { life = createLife(); setupThreads(life); initYear(life); } else addVoicemail(life, { atEnd: true });   // a new game is a year long (engine/year.js); older saves keep their six days (and get Old Zhou's voicemail)
if (params.has('legacy') && params.has('fresh')) delete life.flags.year;   // tools: a new six-day game, as before the year existed
if (params.has('hour')) { const [h, m] = params.get('hour').split(':').map(Number); if (h >= 0 && h < 24) { life.clock.minute = h * 60 + (m || 0); life.clock.sec = 0; } }
let saves = null;
const saveLife = () => { try { localStorage.setItem(LIFE_KEY, lifeSave(life)); if (saves) saves.touched(); } catch { /* private mode: no saving */ } };
// the pause menu's saves panel: three slots, copy / load / export / import
saves = createSaves({ getLife: () => life, serialize: lifeSave, deserialize: lifeLoad,
  describe: (L) => { const c = currentStep(L, QUESTS); const q = c ? QT(c.quest.title) : ''; return `${yearDate(L, getLang())} · ${lifeClock(L.clock.minute)}${q ? ` · ${q}` : ''}`; },
  onLoad: () => { location.reload(); } });
let lifeSaveIn = 5, pendingCalls = [], cupFor = 0, wasDusk = null;
const phone = createPhone({
  getLife: () => life, calls: CALLS, audio, voice, llm,
  ride: {
    get: () => (world && world.rideFlow ? world.rideFlow.ride : null), request: (id) => world && world.rideFlow.request(id),
    cancel: () => world && world.rideFlow.cancel(), message: (q) => world && world.rideFlow.message(q),
  },
  onChange: (up) => { player.capScale = up ? 0.55 : 1; if (!up && mode === 'play' && !noLock) canvas.requestPointerLock?.(); },
  onEvent: (ev) => {
    if (ev.type === 'shared') { hud.toast(getLang() === 'zh' ? `分享到朋友圈 · +${ev.followers} 粉丝` : `Shared to Moments · +${ev.followers} followers`, 3); if (ev.achievement) hud.achievement(getLang() === 'zh' ? ev.achievement.zh : ev.achievement.en); saveLife(); }
    if (ev.type === 'paid') {
      lifeReact(life, ev);
      life.flags.mannerOrder = { num: ev.num, item: ev.item, ready: lifeStamp(life) + ev.wait, done: false };
    }
    if (ev.type === 'call-declined') lifeReact(life, ev);
    if (ev.type === 'add-contact' && ev.id === 'vivian') carContact(life, lifeStamp(life) + 20);   // she brings the demo car in twenty minutes
    if (ev.type === 'reply-do') {
      if (ev.do === 'plate-auction' || ev.do === 'plate-nanjing') choosePlate(life, ev.do.slice(6));
      if (ev.do === 'pay-full' || ev.do === 'pay-finance') {
        const r = payBalance(life, ev.do.slice(4));
        if (!r.ok && r.reason === 'insufficient') lifePost(life, 'vivian', { from: 'vivian', kind: 'text', text: '银行余额不够全款……要不做金融？首付三成就行。', replies: [{ text: '做金融吧。', do: 'pay-finance' }] });
      }
    }
    if (ev.type === 'call-choice' && ev.choice) { if (ev.choice.delta) lifeNudge(life, ev.from, ev.choice.delta, 'call'); if (ev.choice.flag) life.flags[ev.choice.flag] = true; }
    if (ev.type === 'call-choice' && ev.choice) romanceCallChoice(life, ev.from, ev.choice);
    saveLife();
  },
});
Object.assign(CALLS, ROMANCE_CALLS);   // their calls ring through the same phone (world/romance.js)
window.addEventListener('keydown', (e) => {
  if (mode !== 'play') return;
  if (phone.key(e)) { e.stopImmediatePropagation(); return; }
  if (e.code === 'KeyP' && !e.repeat) { phone.toggle(); e.stopImmediatePropagation(); }
}, true);
// ---- the story (engine/quests.js, world/story.js): beats, quest steps, what's announced ----
let questIn = 0;
const QT = (o) => (o ? (getLang() === 'zh' ? o.zh : o.en) : '');
function updateStory() {
  if (params.get('life') === '0') return;
  runStoryBeats(life);
  const evs = updateQuests(life, QUESTS, lifeStamp(life), { player: player.body });
  for (const e of evs) {
    const d = QUESTS.find((q) => q.id === e.id); if (!d) continue;
    const title = QT(d.title);
    const kick = getLang() === 'zh' ? (d.main ? '主线' : '支线') : (d.main ? 'Main story' : 'Side quest');
    if (e.type === 'start') { if (d.main) hud.achievement(tx('questNew', title), kick); else hud.toast(tx('questNew', title), 3.5); }
    else if (e.type === 'done') hud.achievement(tx('questDone', title), kick);
    else if (e.type === 'fail') hud.toast(tx('questFailed', title), 4);
    else if (e.type === 'step') { const c = currentStep(life, QUESTS); if (c && c.quest.id === e.id) hud.toast(tx('questNext', QT(typeof c.step.text === 'function' ? c.step.text(life) : c.step.text)), 3.5); }
  }
  const c = currentStep(life, QUESTS);
  hud.questObjective(c ? { ...(typeof c.step.text === 'function' ? c.step.text(life) : c.step.text), title: c.quest.title, hint: { zh: '<kbd>J</kbd>' + icon('book', '日志'), en: '<kbd>J</kbd>' + icon('book', 'journal') } } : null);
  if (evs.length) { journal.refresh(); saveLife(); }
}
// (first-play tips: created with the settings, above)
let playTime = 0, hourJumped = false;
function updateTips(dt) {
  if (!world) return;
  if (mode === 'play') playTime += dt;
  const b = player.body;
  if (playTime > 2) tips.show('move');
  if (playTime > 15 && life.quests && Object.keys(life.quests.list).length) tips.show('journal');
  if (playTime > 40) tips.show('phone');
  if (playTime > 75) tips.show('map');
  if (playTime > 120) tips.show('talk');
  if (hourJumped) tips.show('hour');
  if (world.moments.active) tips.show('moment');
  if (Math.hypot(b.x - 24, b.z - 65) < 12) tips.show('cruise');
  if (b.x < -137 && b.x > -153 && b.z > -197 && b.z < -181) tips.show('shop');
  if (mode === 'seat' && world.dumpling.seated) tips.show('seat');
  if (!(tips.seen('lend') && tips.seen('page') && tips.seen('revise')) && hasProduct(life)) {   // the gimbal's week, a step at a time (until each has been shown)
    if (b.y > 2 && b.x > 3 && isDusk(life.clock.minute)) tips.show('lend');
    if (workUnwritten(life).length) tips.show('page');
    if (workSummary(life).pages && workSummary(life).rev < 2) tips.show('revise');
  }
  tips.update(dt);
}
// the benchmark (Settings → Graphics; engine/bench.js): a fixed route at 8 pm with your settings,
// frame times measured for 30 s after a short warm-up; your place and the clock put back after
let bench = null;
function startBench() {
  if (!world || bench) return;
  document.getElementById('settings').classList.add('hidden'); hud.show('pause', false);
  const b = player.body;
  bench = { t: 0, ms: [], last: performance.now(), from: mode, saved: { x: b.x, z: b.z, y: b.y, yaw: player.yaw, pitch: player.pitch, minute: life.clock.minute, sec: life.clock.sec } };
  mode = 'bench'; player.enabled = false; player.clearInput(); hud.prompt(false);
  document.getElementById('hud').style.visibility = 'hidden';
  life.clock.minute = BENCH_HOUR[0] * 60 + BENCH_HOUR[1]; life.clock.sec = 0; applyHour(0, { force: true });
}
function benchFrame(now) {
  const ms = now - bench.last; bench.last = now; bench.t += ms / 1000;
  if (bench.t > BENCH_WARMUP && ms < 1000) bench.ms.push(ms);
  const { pos, look } = benchAt(bench.t / (BENCH_SECONDS + BENCH_WARMUP));
  camera.position.set(pos[0], pos[1], pos[2]); camera.lookAt(look[0], look[1], look[2]);
  player.body.x = pos[0]; player.body.z = pos[2];                                         // (what follows you follows the camera)
  if (bench.t >= BENCH_SECONDS + BENCH_WARMUP) finishBench();
}
function finishBench() {
  const st = benchStats(bench.ms), sv = bench.saved;
  life.clock.minute = sv.minute; life.clock.sec = sv.sec; player.teleport(sv.x, sv.z, sv.yaw, sv.pitch, sv.y); applyHour(0, { force: true });
  document.getElementById('hud').style.visibility = '';
  mode = bench.from === 'pause' ? 'pause' : 'play'; bench = null;
  if (mode === 'pause') hud.show('pause', true); else player.enabled = true;
  let gpu = '';
  try { const gl = R.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''; } catch { /* */ }
  const [w, h] = R.pixels, res = st ? { avg: +st.avgFps.toFixed(1), low1: +st.low1.toFixed(1), frames: st.frames, w, h, preset: gfx.preset, cap: gfx.fps || 0, gpu, at: Date.now() } : null;
  try { localStorage.setItem('bund-bench', JSON.stringify(res)); } catch { /* */ }
  showBench(res);
  document.getElementById('settings').classList.remove('hidden'); syncSettings();
  debug.lastBench = res;
}
function showBench(r) {
  const el = document.getElementById('bench-out'); if (!el) return;
  if (!r) { el.textContent = ''; return; }
  el.textContent = getLang() === 'zh'
    ? `平均 ${r.avg} fps · 1% 低帧 ${r.low1} fps · ${r.w}×${r.h} · ${r.preset}${r.cap ? ` · 限 ${r.cap} fps` : ''}${r.gpu ? ` · ${r.gpu}` : ''}`
    : `Average ${r.avg} fps · 1% low ${r.low1} fps · ${r.w}×${r.h} · ${r.preset}${r.cap ? ` · capped at ${r.cap}` : ''}${r.gpu ? ` · ${r.gpu}` : ''}`;
}
document.getElementById('bench-run')?.addEventListener('click', () => startBench());
try { const r = JSON.parse(localStorage.getItem('bund-bench') || 'null'); if (r) setTimeout(() => showBench(r), 0); } catch { /* */ }
debug.startBench = () => startBench(); debug.benchRunning = () => !!bench;
// a gamepad, if one's plugged in (engine/gamepad.js): sticks walk and look, buttons are keys; Menu pauses
const pad = createGamepad({ player, getMode: () => mode, hud, t: tx,
  onPause: () => { if (mode === 'pause') play(); else if (['play', 'ride', 'seat', 'drive'].includes(mode)) pause(); } });
// the map (M): the mouse is yours while it's open
const worldMap = createWorldMap({
  getState: () => ({ x: player.body.x, z: player.body.z, yaw: player.yaw, blips: world ? mapBlips() : [], objective: world ? storyTarget() : null, waypoint, clock: `${yearDate(life, getLang())} · ${lifeClock(life.clock.minute)}` }),
  onClose: () => { if (mode === 'map') { mode = 'play'; player.enabled = true; player.clearInput(); lock(); } },
  onWaypoint: (w) => { waypoint = w; },
});
function openMap() {
  if (mode !== 'play') return;
  mode = 'map'; player.enabled = false; player.clearInput(); hud.prompt(false); target = null;
  try { document.exitPointerLock(); } catch { /* not locked */ }
  worldMap.open();
}
// the journal: the mouse is yours while it's open
function openJournal() {
  if (mode !== 'play') return;
  mode = 'journal'; player.enabled = false; player.clearInput(); hud.prompt(false); target = null;
  try { document.exitPointerLock(); } catch { /* not locked */ }
  journal.open();
}
// the notebook (ui/workbook.js): the mouse is yours while it's open; making a version takes its hours through a fade
const workbook = createWorkbook({ getLife: () => life, save: () => saveLife(), hud, audio,
  onClose: () => { if (mode === 'work') { mode = 'play'; player.enabled = true; player.clearInput(); lock(); } },
  pass: (minutes, line, after) => travel(async () => { lifeSkipTo(life, lifeStamp(life) + minutes); saveLife(); questIn = 0; after(); }, { line, hold: 1100 }) });
// weeks went by between two playable days: the season plan (ui/season.js), as soon as nothing else is on screen
const season = createSeasonPlan({ getLife: () => life, save: () => saveLife(), hud });
let pendingSeason = null;
function openSeason(days, gap) { pendingSeason = { days, gap }; }
function trySeason() {
  if (!pendingSeason || mode !== 'play' || phone.inCall) return;
  const { days, gap } = pendingSeason; pendingSeason = null;
  mode = 'season'; player.enabled = false; player.clearInput(); hud.prompt(false); target = null;
  try { document.exitPointerLock(); } catch { /* not locked */ }
  season.open(days, gap, () => { if (mode === 'season') { mode = 'play'; player.enabled = true; player.clearInput(); lock(); } saveLife(); });
}
// the character page (I): who he is, skills, quests, money, reputation, belongings, people (ui/profile.js)
const profilePage = createProfile({ getLife: () => life, defs: QUESTS, getPeople: () => (world && world.people) || null, onClose: () => { if (mode === 'profile') { mode = 'play'; player.enabled = true; player.clearInput(); lock(); } } });
function openProfile(tab = null) {
  if (mode !== 'play') return;
  mode = 'profile'; player.enabled = false; player.clearInput(); hud.prompt(false); target = null;
  try { document.exitPointerLock(); } catch { /* not locked */ }
  profilePage.open(tab);
}
function openWork(where = 'read', tab = null) {
  if (mode !== 'play') return;
  mode = 'work'; player.enabled = false; player.clearInput(); hud.prompt(false); target = null;
  try { document.exitPointerLock(); } catch { /* not locked */ }
  workbook.open(where, tab);
}
const journal = createJournal({
  getLife: () => life, defs: QUESTS, work: (L) => workSummaryHtml(L), onAnswer: (inv) => { saveLife(); hud.toast(getLang() === 'zh' ? (inv.status === 'accepted' ? '已接受邀请' : '已婉拒') : (inv.status === 'accepted' ? 'Invitation accepted' : 'Declined'), 2.4); },
  onClose: () => { if (mode === 'journal') { mode = 'play'; player.enabled = true; player.clearInput(); lock(); } },
  onWait: (at) => travel(() => { lifeSkipTo(life, at); saveLife(); questIn = 0; }, { line: (yearPassLine(life, at, getLang()) ? `${yearPassLine(life, at, getLang())} · ` : '') + tx('questWait', lifeClock(at % 1440)), hold: 900 }),
});
// an ending: the card, then the Bund goes on
function showEnding(id) {
  const e0 = endingOf(life, id); if (!e0) return;                                 // (a year game tells the same six endings in the year's terms)
  const v = timeVariant(life), e = v ? { title: v.title, text: { zh: `${e0.text.zh}\n\n${v.text.zh}`, en: `${e0.text.en}\n\n${v.text.en}` } } : e0;   // where the year's time went (world/allotEvents.js)
  const from = mode; mode = 'ending'; player.enabled = false; player.clearInput();
  try { document.exitPointerLock(); } catch { /* not locked */ }
  audio.cue && audio.cue('chime', 0, 0.6);
  journal.ending(e, () => { mode = from === 'ending' ? 'play' : 'play'; player.enabled = true; player.clearInput(); lock(); saveLife(); }, withTime(endingAfterword(life, id, workEpilogue(life, id))));
}
function withTime(a) { const t = timeAfterword(life); if (!t) return a; return a ? { zh: `${a.zh}${t.zh}`, en: `${a.en} ${t.en}` } : t; }
function updateLife(dt) {
  if (mode !== 'play' && mode !== 'ride' && mode !== 'sale' && mode !== 'sale-seat' && mode !== 'dialogue' && mode !== 'inspect' && mode !== 'pouch') return;
  lifeAdvance(life, dt);
  if (params.get('life') !== '0') { runAgenda(life); runWork(life); deliverFollowUps(life); }   // ?life=0: nobody gets in touch (measurement tools)
  if (params.get('life') !== '0' && HEARTS_ON) runRomance(life);
  for (const inv of lifeLapse(life)) lifeReact(life, { type: 'invite', id: inv.id, status: 'missed', from: inv.from, thread: inv.thread });
  const events = lifeDrain(life);
  for (const ev of events) if (ev.type === 'call') pendingCalls.push(ev);
  if (world && world.belongings) world.belongings.step(dt, events);
  if (world && world.carSale) updateCarSale(events);
  // calls wait until you're not in the middle of something else
  trySeason();
  if (pendingCalls.length && mode === 'play' && !phone.inCall) { const c = pendingCalls.shift(); phone.ring(c.script); }
  const mo = life.flags.mannerOrder;
  if (mo && !mo.notified && lifeStamp(life) >= mo.ready) {
    mo.notified = true;
    lifeThread(life, 'manner', { title: 'Manner Coffee', members: ['me', 'manner'], kind: 'service' });
    lifePost(life, 'manner', { from: 'manner', kind: 'text', text: `您的${mo.item.name}已做好，取餐号 ${mo.num}，请到窗口取餐` });
  }
  if (world && world.year) world.year.tick(dt);                               // a new day: salary, rent, absences, the date; the year's messages
  for (const ev of events) if (ev.type === 'ending') showEnding(ev.ending);
  // the floodlights come on: if you've something to show people, now is when they're out
  { const dusk = isDusk(life.clock.minute); if (dusk && wasDusk === false && mode === 'play' && hasProduct(life) && !params.has('q')) hud.toast(getLang() === 'zh' ? '泛光灯亮了，江边拍照的人多起来了。云台在你口袋里。' : 'The floodlights are on and the railing is filling with people taking photos. The gimbal is in your pocket.', 6); wasDusk = dusk; }
  if ((questIn -= dt) <= 0) { questIn = 0.5; updateStory(); }
  if (cupFor > 0) cupFor = Math.max(0, cupFor - dt);
  phone.update(dt);
  if ((lifeSaveIn -= dt) <= 0) { lifeSaveIn = 5; saveLife(); }
}
// the Huracán: Zhixia's lead (after you said you'd think about a car), the appointment, the
// purchase's own clock, delivery, and what your friends make of it
function updateCarSale(events) {
  const f = life.flags, now = lifeStamp(life);
  if (f.carCurious && params.get('life') !== '0') { f.carCuriousAt ??= now; if (!f.carBuy && now >= f.carCuriousAt + 10) carLead(life); }
  for (const ev of events) {
    if (ev.type === 'car-appointment') f.carAppointAt = ev.at;
    if (ev.type === 'car-delivered') {
      lifePost(life, 'wuhu', { from: 'momo', kind: 'text', text: '？？？白白提车了？？？' });
      (f.pendingFollow ||= []).push({ at: now + 2, thread: 'wuhu', from: 'zhixia', text: '我就说吧😎 周末天马，带上它。' }, { at: now + 5, thread: 'wuhu', from: 'xuan', text: '……你爸知道吗' });
    }
  }
  const b = f.carBuy;
  if (b && b.stage === 'booked' && f.carAppointAt != null && now >= f.carAppointAt - 5 && !world.carSale.present) {
    world.carSale.appear('viewing');
    if (!f.carArrivedNoted) { f.carArrivedNoted = true; lifePost(life, 'vivian', { from: 'vivian', kind: 'text', text: '我到汉口路了，车停在海关大楼旁边的路边，我在车旁等您。可以开一圈～' }); }
  }
  if (b) for (const e of stepPurchase(life)) {
    if (e === 'delivery-due' && !f.deliveryNoted) { f.deliveryNoted = true; lifePost(life, 'vivian', { from: 'vivian', kind: 'text', text: '车到了！明天下午我们把车开到汉口路给您交车，您看几点方便？' }); world.carSale.appear('delivery'); }
  }
}
// minimap: shown when it helps (engine/minimapLogic.js); hold Tab to keep it up
const minimap = createMinimap(document.getElementById('minimap')), mapState = createMinimapState();
let mapHeld = false, mapFrame = 0;
window.addEventListener('keydown', (e) => { if (e.code === 'Tab') { e.preventDefault(); mapHeld = true; } });
window.addEventListener('keyup', (e) => { if (e.code === 'Tab') mapHeld = false; });
window.addEventListener('blur', () => { mapHeld = false; });
function mapObjective() {
  const m = mission1 && mission1.mission;
  if (!m) return null;
  if (m.step === 'collect') return { x: stallSpot.x, z: stallSpot.z, label: tx('mapStall') };
  if (m.step === 'carry') return { x: npcLayout.list[0].x, z: npcLayout.list[0].z, label: tx('pLin') };
  return null;
}
// your own waypoint (set on the map) comes first, until you get there
let waypoint = null;
function mapTarget() { return waypoint ? { ...waypoint, label: waypoint.label ? QT(waypoint.label) : tx('waypoint') } : storyTarget(); }
function storyTarget() {
  const r = world && world.rideFlow && world.rideFlow.ride;
  if (r && (r.phase === 'coming' || r.phase === 'waiting')) return { x: PICKUP.x, z: PICKUP.z, label: tx('mapDidi') };
  const q = life && currentStep(life, QUESTS), qt = q && q.target ? { x: q.target.x, z: q.target.z, label: QT(q.target.label) } : null;
  return mapObjective() || (world && world.belongings ? world.belongings.mapObjective() : null) || qt;
}
// the places that matter, on the map: coffee, your hotel, the Jazz Bar when it's open, DiDi, your car,
// and (with the gimbal) the photo subjects you haven't got yet
function mapBlips() {
  const tod = life.clock.minute, out = [
    { x: mannerSpec.queue[0].x, z: mannerSpec.zWall, glyph: 'M', bg: '#111', fg: '#fff', name: { zh: 'Manner 咖啡', en: 'Manner Coffee' } },
    { x: (PEACE_R.x0 + PEACE_R.x1) / 2, z: -211, glyph: '和', bg: '#2b2416', fg: '#e7b96a', name: { zh: '和平饭店（你住这里）', en: 'Peace Hotel (where you\'re staying)' } },
    { x: PICKUP.x, z: PICKUP.z, glyph: 'D', bg: '#ff7a00', fg: '#fff', name: { zh: '滴滴上车点', en: 'DiDi pick-up' } },
    { x: L.facadeX + 1.5, z: (AIA_R.door[0] + AIA_R.door[1]) / 2, glyph: '友', bg: '#24303f', fg: '#cfe0f5', name: { zh: '友邦大厦（大堂）', en: 'The AIA Building (lobby)' } },
    ...METRO_EXITS.map((m) => ({ x: m.top + Math.sign(m.top - m.bottom) * 1.5, z: (m.z0 + m.z1) / 2, glyph: String(m.exit), bg: '#c8161e', fg: '#fff', name: { zh: `南京东路站 ${m.exit} 号口`, en: `East Nanjing Rd station, Exit ${m.exit}` } })),
  ];
  if (tod >= 19 * 60 || tod < 60) out.push({ x: (JAZZ.x0 + JAZZ.x1) / 2, z: JAZZ.z0, glyph: '♪', bg: '#3b1f3f', fg: '#f3c6ff', name: { zh: '爵士吧', en: 'The Jazz Bar' } });
  out.push(world.cruise.mapBlip(), world.dumpling.mapBlip());
  if (hasProduct(life)) for (const [id, R] of Object.entries(WORK_REGULARS)) { const st = workState(life), sp = WORK_SPOTS[id]; if ((st.people[id] || (st.heardOf || {})[id]) && tod >= R.from && tod < R.to) out.push({ x: sp.x, z: sp.z, glyph: getLang() === 'zh' ? WORK_REG[id].name.zh.slice(-1) : WORK_REG[id].name.en.split(' ').pop()[0], bg: '#20303a', fg: '#bfe6d2', name: WORK_REG[id].name }); }
  if (world.hearts) out.push(...world.hearts.mapBlips());
  if (life.flags.car && world.huracan.loaded) { const g = world.huracan.group.position; out.push({ x: g.x, z: g.z, glyph: '▲', bg: '#e8b800', fg: '#111', name: { zh: '你的车', en: 'Your car' } }); }
  else if (world.carSale.present && !world.carSale.sitting) out.push({ x: HURACAN_SPOT.x, z: HURACAN_SPOT.z, glyph: '▲', bg: '#e8b800', fg: '#111', name: { zh: 'Vivian（车旁）', en: 'Vivian, at the car' } });
  const m = life.flags.maker;
  if (m && m.gadgets && m.gadgets.gimbal) for (const t of [{ id: 'customs', x: -45, z: 26 }, { id: 'peace', x: -43, z: -243 }, { id: 'linsu', x: 23.7, z: -15 }]) if (!m.shot[t.id]) out.push({ x: t.x, z: t.z, glyph: '◉', bg: '#1d3a8a', fg: '#fff' });
  if (world.ljz) out.push(...world.ljz.mapBlips());
  return out;
}
function updateMap(dt) {
  const b = player.body;
  if (waypoint && Math.hypot(waypoint.x - b.x, waypoint.z - b.z) < 6) { waypoint = null; hud.toast(tx('waypointHere'), 2.4); }
  const obj = mapTarget(), zone = (world.metro && world.metro.areaKey) || zoneAt(b.x, b.z, L);
  updateMinimap(mapState, dt, { mode, moving: player.speed > 0.6, objective: !!obj, zone, held: mapHeld });
  minimap.setShown(mapState.shown);
  document.getElementById('hud').classList.toggle('map-on', mapState.shown);
  if (mapState.shown && (mapFrame++ % 2 === 0)) minimap.draw({ x: b.x, z: b.z, yaw: player.yaw, objective: obj, people: traffic ? traffic.peds : [], area: zone, blips: mapBlips() });
}
const REACT_FOR = { sorry: 1.6, fine: 1.2, scold: 2.8, tut: 1.4, look: 0.9 };
function bumpActors() {
  const out = traffic.peds.map((p) => ({
    id: p.id, persona: p.persona, x: p.x, z: p.z, vx: p.vx, vz: p.vz, r: 0.3, busy: p.phone > 0.5,
    apply(r, other) {
      // every bump is felt: a flinch, a half-step away, a glance (engine/flinch.js); two passers-by
      // brushing each other leave it at that
      if (!p.flinch || p.flinch.t > p.flinch.dur) startFlinch(p, other.x, other.z, { hard: r.hard || 0.6 });
      if (r.kind === 'brush') { p.faceTo = [other.x, other.z]; p.faceFor = 1.1; return; }
      const dur = REACT_FOR[r.kind] || 1;
      p.faceTo = [other.x, other.z]; p.faceFor = dur + 0.8; p.gesture = r.kind;
      if (r.kind !== 'look') p.pause = p.crossing ? 0 : dur;                // never stop in the road
      if (r.stagger) { const dx = p.x - other.x, dz = p.z - other.z, d = Math.hypot(dx, dz) || 1; p.shove = { x: dx / d * 0.28, z: dz / d * 0.28, t: 0.35 }; }
    },
  }));
  if (world.npcs.react) {
    for (const s of npcLayout.list) out.push({ id: s.id, persona: s.id, x: s.x, z: s.z, vx: 0, vz: 0, r: 0.4,
      apply(r, other) { world.npcs.react(s.id, r.kind, [other.x, other.z], t + (REACT_FOR[r.kind] || 1) + 0.6); } });
  }
  // the evening crowd's nearby people: a look, a word, a step back
  if (world.crowdView) for (const a of world.crowdView.nearAgents()) {
    if (Math.abs(a.y - player.body.y) > 1.2) continue;
    const grp = a.group ? `tour${a.group.guide.id}` : a.leader ? `with${a.leader.id}` : a.partner || a.kid ? `with${a.id}` : null;   // (together: they don't bump each other)
    // (sim: 'crowd': two of the crowd bumping each other is the crowd's own business, engine/crowd.js)
    out.push({ id: `crowd:${a.id}`, sim: 'crowd', group: grp, persona: a.persona, x: a.x, z: a.z, vx: a.vx, vz: a.vz, r: 0.3, busy: a.phone,
      apply(r, other) {
        // the flinch first (shoulder back, half-step away, a glance), then whatever they make of it
        world.crowd.flinch(a, other.x, other.z, (r.hard || 0.6) + (r.stagger ? 1 : 0));
        if (r.kind === 'brush') return;
        if (r.kind !== 'look' && a.state === 'walk' && !a.leader && a.kind !== 'follower') {   // (those walking with someone keep up with them)
          a.state = 'act'; a.act = 'look'; a.wait = (REACT_FOR[r.kind] || 1) + 0.4; a.gesture = r.kind; a.faceTo = [other.x, other.z];
          a.heading = Math.atan2(other.x - a.x, other.z - a.z);
        }
      } });
  }
  const b = player.body;
  out.push({ id: 'player', x: b.x, z: b.z, vx: b.pvx || 0, vz: b.pvz || 0, r: 0.42 });
  return out;
}
function updateTraffic(dt) {
  const b = player.body;
  _player.x = b.x; _player.z = b.z; _player.vx = b.vx; _player.vz = b.vz;
  // on the promenade deck the player is nowhere near the road
  traffic.update(dt, { player: world.driving && world.driving.driving ? world.driving.trafficBody() : b.y > 1 ? null : _player, rain: weather.rain });
  if (world.crowd) {
    const cr = world.crowd, eye = camera.position;
    cr.setSignal(traffic.controller.pedAspect, dt);
    cr.setSignal(world.henan.traffic.controller.pedAspect, dt, 'henan');
    // new people appear only where you won't see them pop in: far off, or behind you
    camera.getWorldDirection(_d);
    const canSpawnAt = (n) => { const dx = n.x - eye.x, dz = n.z - eye.z, d = Math.hypot(dx, dz); return d > 45 || (d > 14 && (dx * _d.x + dz * _d.z) / d < -0.2); };
    const others = [...traffic.peds, ...npcLayout.list, ...world.dawn.others(), ...world.moments.others(), ...world.fieldTest.others()];
    others.push(...world.hearts.others());
    others.push(...world.confront.others());                                        // (the crowd walks round a row, too)
    cr.setCars(traffic.obstacles);                                                   // the Huracán, parked or driven: walked round, not through
    cr.update(dt, { player: b.y > 1.5 && b.x < L.wallX ? null : (world.driving && world.driving.driving ? null : b), canSpawnAt, others });
    world.crowdView.update(dt, eye, { rain: weather.rain });
    // the murmur of the people round you (engine/audio.js): how many, how near (twice a second)
    crowdHear -= dt;
    if (crowdHear <= 0) { crowdHear = 0.5; let k = 0; for (const a of cr.agents) if (!a.gone) { const d = Math.hypot(a.x - b.x, a.z - b.z, (a.y - b.y) * 1.5); if (d < 24) k += 1 - d / 24; } audio.setCrowd(k / 12); }
    // tour guides talk to their groups now and then (you hear them when you're near)
    for (const tour of cr.tours) {
      const g = tour.guide; tour.said = (tour.said || 0) - dt;
      if (g.gone || tour.said > 0) continue;
      const d = Math.hypot(g.x - b.x, g.z - b.z);
      if (d > 22) { tour.said = 3; continue; }
      const pool = g.state === 'act' ? [1, 2, 4, 5, 6] : [0, 3, 7];
      const [who, zh, en] = GUIDE_LINES[pool[Math.floor(Math.random() * pool.length)]];
      voice.say({ zh, en, who, at: [g.x, g.y + 1.6, g.z], gain: 0.9, lang: 'zh' });
      if (d < 9) hud.bark && hud.bark({ speaker: getLang() === 'zh' ? '导游' : 'Tour guide', text: getLang() === 'zh' ? zh : en, voice: false });
      tour.said = 18 + Math.random() * 20;
    }
    const near = world.crowdView.nearAgents();
    crowdBoxes.forEach((bx, i) => { const a = near[i]; if (!a || Math.abs(a.y - b.y) > 1.2) { bx.minX = bx.maxX = bx.minZ = bx.maxZ = 1e6; return; } bx.minX = a.x - 0.22; bx.maxX = a.x + 0.22; bx.minZ = a.z - 0.22; bx.maxZ = a.z + 0.22; bx.id = `crowd:${a.id}`; });
  }
  world.buses.update(dt);
  world.henan.update(dt, { player: world.driving && world.driving.driving ? null : b, eye: camera.position, rain: weather.rain });
  world.vehicles.update(traffic.vehicles, camera.position);
  world.pedestrians.update(traffic.peds, dt, camera.position);
  world.signals.update(traffic.controller);
  traffic.peds.forEach((p, i) => { const bx = pedBoxes[i]; if (bx) { bx.minX = p.x - 0.22; bx.maxX = p.x + 0.22; bx.minZ = p.z - 0.22; bx.maxZ = p.z + 0.22; } });
  traffic.vehicles.forEach((v, i) => {
    const box = world.vehicleBoxes[i];
    if (!v.active) { box.minX = box.maxX = box.minZ = box.maxZ = 1e6; return; }
    box.minX = v.x - v.width / 2; box.maxX = v.x + v.width / 2;
    box.minZ = v.z - v.len / 2; box.maxZ = v.z + v.len / 2;
  });
}

// ---- the hour (engine/timeOfDay.js): one state from the clock, handed to everything it lights ----
const PIN_HOUR = params.has('q') && !params.has('hour') && !params.has('tod');
let crowdHear = 0, envCaptures = 0, world0 = null, hourState = todState(17 * 60 + 42), hourAt = -1, hourTick = 0, envAt = null, envWait = 0, lastHourMin = null;
const _hazeFog = new THREE.Color(), DAY_HAZE_FOG = new THREE.Color(0.64, 0.66, 0.68);
// tools: ?hour=HH:MM sets today's clock at load (the screenshots of the day); debug.setHour too
function applyHour(dt, { force = false } = {}) {
  const w = world || world0; if (!w) return;
  // measurement tools (?q=) keep the approved 5:42 pm look whatever the clock says, unless they ask
  // for the hour (?hour= / ?tod)
  const minute = PIN_HOUR ? 17 * 60 + 42 : life.clock.minute + life.clock.sec / 60;
  hourTick -= dt;
  const jump = lastHourMin != null && Math.abs(((minute - lastHourMin + 720) % 1440 + 1440) % 1440 - 720) > 20;   // slept, waited, a ride
  if (!force && !jump && hourTick > 0) return;
  hourTick = 0.25;
  const prev = lastHourMin; lastHourMin = minute;
  if (jump && world) hourJumped = true;
  const s = hourState = todState(minute);
  w.sky.setTime(s); w.skyline.setTime(s); w.river.setTime(s); setArchLight(s); applyDayNight(s); setCrowdLight(s);
  const b = player.body, inR = (r) => b.x > r.x0 && b.x < r.x1 && b.z > r.z0 && b.z < r.z1;
  const under = world && world.metro ? world.metro.under : 0;                         // down in the metro: its own light, not the sky's
  const inside = Math.max(under, world && (world.upper.here || world.dest.here || world.makerspace.here) ? 1 : inR(PEACE) || inR(AIA) ? 0.8 : 0);
  w.lighting.setTime(s, inside, under);
  R.renderer.toneMappingExposure = THREE.MathUtils.lerp(s.exposure * (1 + 0.25 * inside * s.daylight), 0.92, under);
  R.bloom.strength = s.bloom;
  if (world) {
    if (world.crowd) world.crowd.setActive(s.crowd, { dawn: s.dawn, instant: jump || force });
    traffic.setDensity(s.traffic); world.henan.traffic.setDensity(s.traffic);
    if (prev != null && !jump && passedLateNight(prev, minute)) lateNight();
  }
  // the captured environment (what wet stone and glass reflect) follows the light, now and then
  envWait -= Math.max(dt, 0.25);
  const want = { d: s.daylight, n: s.night, f: s.floods, m: s.media };
  if (!envAt) envAt = want;
  else if (world && envWait <= 0 && (Math.abs(want.d - envAt.d) > 0.12 || Math.abs(want.n - envAt.n) > 0.3 || Math.abs(want.f - envAt.f) > 0.3 || Math.abs(want.m - envAt.m) > 0.5 || (jump && (want.d !== envAt.d || want.f !== envAt.f)))) {
    envAt = want; envWait = 4; envCaptures++;
    const old = scene.environment; scene.updateMatrixWorld(true); captureEnvironment(R.renderer, scene); if (old && old !== scene.environment) old.dispose();
  }
}
// 10 pm: the Bund goes over to its late-night lighting. If you're out by the river you see it, and
// so do the people round you
function lateNight() {
  const b = player.body, inR = (r) => b.x > r.x0 && b.x < r.x1 && b.z > r.z0 && b.z < r.z1;
  const out = !(world.upper.here || world.dest.here || world.makerspace.here || inR(PEACE) || inR(AIA));
  if (!out) return;
  life.flags.lightsOutSeen = true; saveLife();
  hud.toast(tx('lateNightLights'), 5);
  if (world.crowd && world.crowdView) {
    const near = world.crowdView.nearAgents().filter((a) => Math.hypot(a.x - b.x, a.z - b.z) < 18).slice(0, 2);
    near.forEach((a, i) => setTimeout(() => { const [who, zh, en] = LATE_LINES[(i + Math.floor(Math.random() * 2)) % LATE_LINES.length]; voice.say({ zh, en, who, at: [a.x, a.y + 1.6, a.z], gain: 0.9 }); }, 1200 + i * 2600));
  }
}
debug.setHour = (h, m = 0) => {   // (tools: load with ?hour= or ?tod so the hour isn't pinned)
  life.clock.minute = h * 60 + m; life.clock.sec = 0; applyHour(0, { force: true }); };
debug.hour = () => hourState;
debug.worldMap = () => worldMap; debug.setWaypoint = (w) => { waypoint = w; }; debug.getWaypoint = () => waypoint;
debug.envInfo = () => ({ envAt, envWait, uuid: scene.environment && scene.environment.uuid, captures: envCaptures });

let lastDraw = 0;
function frame(now) {
  // the frame-rate cap (settings): skip this display refresh if it comes too soon
  if (!params.has('q') && gfx.fps) {
    if (!shouldDraw(now - lastDraw, gfx.fps)) return;
    const iv = 1000 / gfx.fps; lastDraw = now - lastDraw > 2 * iv ? now : lastDraw + iv;   // on the beat, so 60 on a 144 Hz screen averages 60
  }
  const dt = Math.min(debug.dtMax || 0.05, Math.max(0, (now - last) / 1000)); last = now; t += dt;   // dtMax: tools only (slow software GL)
  pad.update(dt);
  if (!world) return;
  if (mode === 'bench') benchFrame(now);

  if (mode === 'entry') {             // a slow breath of camera movement behind the title
    player.yaw = L.spawn.yaw + Math.sin(t * 0.13) * 0.035;
    player.pitch = 0.1 + Math.sin(t * 0.09) * 0.02;
  } else if (mode === 'dialogue') {
    const targetPos = world.npcs.getSpeakerPosition('lin');
    const dx = targetPos.x - player.body.x;
    const dz = targetPos.z - player.body.z;
    const horiz = Math.hypot(dx, dz) || 1;
    const targetYaw = Math.atan2(-dx, -dz);
    const targetPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(targetPos.y - (player.body.y + L.eye), horiz)));
    const lk = Math.min(1, dt * 4.5);
    player.yaw += wrapAngle(targetYaw - player.yaw) * lk;
    player.pitch += (targetPitch - player.pitch) * lk;
  }
  const riding = mode === 'ride' || (mode === 'pause' && pausedFrom === 'ride');
  world.didi.update(mode === 'pause' ? 0 : dt);
  world.rideFlow.update(mode === 'pause' ? 0 : dt);
  if (riding && world.didi.car) { player.body.x = world.didi.car.x; player.body.z = world.didi.car.z; }   // you (and your ears) are in the car
  world.carSale.update(mode === 'pause' ? 0 : dt, player.body);
  world.hailers.update(mode === 'pause' ? 0 : dt, player.body);                      // other people getting DiDis
  world.dest.update(mode === 'pause' ? 0 : dt, player.body);
  world.sceneTalk.update(mode === 'pause' ? 0 : dt);
  world.dinner.update(mode === 'pause' ? 0 : dt, player.body);
  world.year.update(mode === 'pause' ? 0 : dt, player.body);
  world.makerspace.update(mode === 'pause' ? 0 : dt, player.body);
  world.friends.update(mode === 'pause' ? 0 : dt, player.body);
  world.fieldTest.update(mode === 'pause' ? 0 : dt, player.body); world.workDesk.update(); workbook.update(dt);   // the gimbal's evening
  world.hearts.update(mode === 'pause' ? 0 : dt, player.body);
  if (life.flags.pendingAchievement) { const a = life.flags.pendingAchievement; delete life.flags.pendingAchievement; hud.achievement(getLang() === 'zh' ? a.zh : a.en); }
  world.photo.update(mode === 'pause' ? 0 : dt);
  if (mode !== 'pause') world.ambient.update(dt, player.body, { talking: talk.open });
  if (player.body.z < -120) { world.interiors.update(mode === 'pause' ? 0 : dt, player.body); world.upper.update(mode === 'pause' ? 0 : dt, player.body); world.jazz.update(mode === 'pause' ? 0 : dt, player.body, camera); }
  else if (world.jazz.music.playing) world.jazz.update(0, player.body, camera);   // walked away: the band fades out
  { const b = player.body, inR = (r) => b.x > r.x0 && b.x < r.x1 && b.z > r.z0 && b.z < r.z1;
    const ins = world.year.here || world.upper.here || world.dest.here ? 1 : world.makerspace.here ? 0.75 : inR(PEACE) || inR(AIA) ? 0.4 : world.dumpling.inside ? 0.3 : 0;
    audio.setInside(world.year.here ? 1 : world.upper.here || world.dest.here ? 1 : world.makerspace.here ? 0.75 : inR(PEACE) || inR(AIA) ? 0.4 : world.dumpling.inside ? 0.3 : 0);
    worldMusic.update(dt, b, { minute: life ? life.clock.minute : 0, inside: ins, ride: mode === 'ride', paused: mode === 'pause' || mode === 'entry' }); }
  if (player.body.z < -30) world.walkers.update(mode === 'pause' ? 0 : dt, player.body);   // people with somewhere to be, on the northern Bund
  world.dawn.update(mode === 'pause' ? 0 : dt, { dawn: hourState.dawn, eye: camera.position });   // tai chi on the promenade at dawn
  world.moments.update(mode === 'pause' ? 0 : dt, { playing: mode === 'play' });
  world.roads.update(mode === 'pause' ? 0 : dt);                                       // people and the car: dodges, shouts, an accident's aftermath
  world.confront.update(mode === 'pause' ? 0 : dt, { mode });                          // the row outside the hotel: its rules, before your own step
  world.cruise.update(mode === 'pause' ? 0 : dt, player);                              // the boat moves, carrying whoever's aboard (before your own step)
  world.metro.pre(mode === 'pause' ? 0 : dt);                                          // so do the trains
  world.dumpling.update(mode === 'pause' ? 0 : dt, player.body);
  world.baristas.update(mode === 'pause' ? 0 : dt, player.body);
  world.entrances.update(dt, { eye: camera.position, prompting: !!target, active: mode === 'play' || mode === 'ride' });
  const driving = mode === 'drive' || (mode === 'pause' && pausedFrom === 'drive');
  if (driving) world.driving.update(dt, mode === 'pause');
  else if (mode === 'seat' || (mode === 'pause' && pausedFrom === 'seat')) (world.dumpling.seated ? world.dumpling : world.jazz).seatCamera(camera);
  else if (!riding && mode !== 'sale-seat' && mode !== 'bench') player.update(mode === 'pause' ? 0 : dt);
  const seated = mode === 'seat' || (mode === 'pause' && pausedFrom === 'seat') || driving;
  { const st = player.stamina, show = mode === 'play' && (player.running || st.level < 0.995 || st.winded > 0); hud.stamina(st.level, show, st.exhausted || st.winded > 0); }
  if (world.playerBody) { world.playerBody.setVisible(!riding && !seated); if (!riding && !seated) world.playerBody.update(mode === 'pause' ? 0 : dt, player, camera.position); }
  world.confront.late(mode === 'pause' ? 0 : dt);                                      // ...and after it: its people, your hands, the camera's kicks

  // weather (frozen while paused): every value is exactly the approved clear scene at 0
  if (mode !== 'pause') {
    weather.update(dt); weatherTime += dt;
    // Ms. Su opens her umbrella once it is properly drizzling, folds it when it has stopped
    const want = weather.rain > 0.3 ? 1 : weather.rain < 0.08 ? 0 : suUmbrella > 0.5 ? 1 : 0;
    suUmbrella = Math.max(0, Math.min(1, suUmbrella + (want ? dt : -dt) / 1.4));
  }
  world.rain.update(weatherTime, weather.rain, camera);
  if (mode !== 'pause') wind.update(dt, weather.rain);
  world.trees.update(weatherTime, wind.level, weather.rain, wind.dir);
  weatherUniforms.wetBoost.value = weather.wet;
  weatherUniforms.rainRipples.value = weather.rain; weatherUniforms.rippleTime.value = weatherTime;
  applyHour(dt);
  scene.fog.density = FOG_DENSITY * hourState.fog + HAZE_DENSITY * weather.haze;
  fogColorAt(hourState, scene.fog.color).lerp(_hazeFog.copy(HAZE_FOG).lerp(DAY_HAZE_FOG, hourState.daylight), weather.haze);
  if (world.metro.under > 0) { const u = world.metro.under; scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.0026, u); scene.fog.color.lerp(_metroFog, u); }   // a long platform's own haze
  audio.setRain(weather.rain, underCover(player.body.x, player.body.z, player.body.y + L.eye) || world.belongings.umbrellaUp);
  // the light shows (the Pearl's colours, LED façades, boats' strips, screens); debug.freezeShow holds them for tools
  const showT = debug.freezeShow ? 0 : t;
  world.sky.update(t, weather.haze); world.skyline.update(showT); world.river.update(t, dt, showT); world.bund.update(t); world.street.update(t); world.nanjing.update(showT);
  world.ljz.update(mode === 'pause' ? 0 : dt, player.body, { eye: camera.position, hour: hourState, playing: mode === 'play' });   // Lujiazui (only when you're there)
  world.metro.update(mode === 'pause' ? 0 : dt, { playing: mode === 'play' });         // Line 2 (only near a station or aboard)
  world.lighting.setShadowCount(params.get('shadows') === '0' ? 0 : R.quality.shadows);
  { const tl = params.has('q') ? R.level : treeStep(gfx, R.drop); if (tl !== treeLevel) { treeLevel = tl; world.trees.setQuality(tl); } }
  if (world.playerBody) world.playerBody.shadow.visible = world.lighting.shadowCount > 0;   // the shadow copy only matters with shadows
  world.lighting.update(camera.position, dt);
  // environment yields to NPC speech: fully while in conversation, by audibility otherwise
  let speech = 0;
  if (conversation && conversation.isSpeaking) speech = mode === 'dialogue' ? 1 : computeDistanceGain(_pairPos.distanceTo(camera.position), npcLayout.audibility.refDistance, npcLayout.audibility.maxDistance);
  audio.setBreath(player.stamina.breath);
  {
    let near = 0; for (const t of TREE_SPOTS) near = Math.max(near, 1 - Math.hypot(t.x - player.body.x, t.z - player.body.z) / 14);
    audio.setWind(wind.level, near);
  }
  audio.update(mode === 'pause' ? 0 : dt, player.body.x, { z: player.body.z, vehicles: traffic ? (world.henan ? [...traffic.vehicles, ...world.henan.worldVehicles(player.body.x < -380)] : traffic.vehicles) : null, speech });
  voice.update();                                                                  // where the listener is, for positional voices
  if (dialogueAudio) dialogueAudio.updateListener();
  if (conversation) conversation.update(mode === 'pause' ? 0 : dt);
  world.npcs.update(t, mode === 'pause' ? 0 : dt, {
    activeSpeaker: conversation ? conversation.activeSpeaker : null,
    interacting: mode === 'dialogue',
    playerPos: player.body,
    umbrella: suUmbrella,
    voice: dialogueAudio ? dialogueAudio.delivery : null,
    eye: camera.position,
  });
  if (mission1) mission1.update();
  updateTraffic(mode === 'pause' || debug.freezeTraffic ? 0 : dt);
  if (mode === 'play' && bumps) bumps.update(t, bumpActors(), player.body);
  updateMap(dt);
  updateLife(mode === 'pause' ? 0 : dt);
  world.belongings.update(mode === 'pause' ? 0 : dt, player.body, player);
  if (world.playerBody) { world.playerBody.setHold({ cup: cupFor > 0 && !world.belongings.holdingParcel, phone: phone.isOpen }); world.playerBody.placeProps(camera.position); }
  world.pouch.update(camera, t);

  // interactables: ONE target at a time - within reach, in view, not hidden behind a wall or a person
  camera.getWorldDirection(_d);
  const npcDist = _pairPos.distanceTo(camera.position);           // subtitles still use the pair's distance
  target = null;
  if (mode === 'play') {
    const head = world.npcs.getSpeakerPosition('lin'), cf = world.clue.focus, pf = world.pouch.focus;
    const cands = [
      { id: 'lin', x: head.x, y: head.y - 0.1, z: head.z, reach: npcLayout.interactDistance, cone: 0.72, ignore: ['lin'] },
      { id: 'notice', x: cf.x, y: cf.y, z: cf.z, reach: 2.7, cone: 0.78 },
    ];
    if (mission1 && mission1.canPickUp()) cands.push({ id: 'pouch', x: pf.x, y: pf.y, z: pf.z, reach: 2.4, cone: 0.72 });
    cands.push(...world.belongings.candidates(), ...world.carSale.candidates());
    for (const p of places) cands.push(...p.candidates());
    if (world.rideFlow.canBoard()) { const d = world.didi.doorFocus(); if (d) cands.push({ id: 'didi', ...d, reach: 2.8, cone: 0.6 }); }
    cands.push({ id: 'manner', x: mannerSpec.queue[0].x + 0.2, y: L.curbH + 1.15, z: mannerSpec.zWall + mannerSpec.depth - 0.1, reach: 2.6, cone: 0.7 });
    target = pickTarget(camera.position, _d, cands, colliders);
    const tl = talkables(), tc = tl.map((q, i) => ({ id: String(i), x: q.x, y: q.y, z: q.z, reach: 4.0, cone: 0.82 }));
    const tp = pickTarget(camera.position, _d, tc, colliders);
    talkTarget = tp ? tl[Number(tp.id)] : null;
  } else talkTarget = null;
  const place = target && places.find((p) => p.owns(target.id));
  const talkName = talkTarget && PERSONAS[talkTarget.persona] ? (getLang() === 'zh' ? PERSONAS[talkTarget.persona].zh : PERSONAS[talkTarget.persona].en) : null;
  if (mode === 'seat') { if (world.sceneTalk.active) hud.prompt(false); else hud.prompt(true, (world.dumpling.seated ? world.dumpling : world.jazz).seatPrompt()); if ((questIn -= dt) <= 0) { questIn = 0.5; updateStory(); } }
  else if (!target && talkName && mode === 'play') hud.prompt(true, { target: talkName, action: getLang() === 'zh' ? '聊天' : 'Talk', key: 'T' });
  else if (place) hud.prompt(true, { ...place.prompt(target.id), talk: talkName });
  else if (target && target.id === 'vivian') hud.prompt(true, world.carSale.prompt());
  else if (target && target.id === 'didi') hud.prompt(true, { target: tx('pDidi', world.rideFlow.ride.driver.plate), action: tx('pGetIn') });
  else if (target) hud.prompt(true, PROMPTS[target.id] ? PROMPTS[target.id]() : world.belongings.prompt(target.id));
  else hud.prompt(false);

  // subtitles + interaction greeting bar
  const line = conversation ? conversation.currentLine : null;
  const audioStatus = dialogueAudio ? dialogueAudio.getStatus() : { labelZh: '', labelEn: '' };
  const sourceLabel = getLang() === 'zh' ? audioStatus.labelZh : audioStatus.labelEn;
  const who = (id) => tr(SPEAKER_NAMES[id]) || '';
  if (mode === 'dialogue') {
    hud.subtitle(true, {
      speaker: who(line ? line.speaker : 'lin'),
      text: line ? lineText(line) : '',
      source: sourceLabel,
      interacting: true,
      showText: subtitlesOn,
      choices: mission1 ? mission1.dialogueChoices : null,
    });
  } else if (mode === 'play' && subtitlesOn && line && npcDist < npcLayout.audibility.maxDistance) {
    hud.subtitle(true, {
      speaker: who(line.speaker),
      text: lineText(line),
      source: sourceLabel,
      interacting: false,
      showText: true,
    });
  } else {
    hud.subtitle(false);
  }

  boundaryCooldown -= dt;
  if (mode === 'play' && player.body.hit === 'boundary' && boundaryCooldown < 0) {
    boundaryCooldown = 6;
    hud.toast(tx(player.body.x < L.facadeX - 20 ? 'hoarding' : 'barriers'), 3);
  }

  if (!debug.noReflect) world.river.renderReflection(R.renderer, scene, camera);
  R.renderer.info.reset();
  R.renderer.shadowMap.needsUpdate = true;
  R.frame(t);
  R.composer.render(dt);
  world.photo.afterRender();                                                          // a photo is read off the frame just drawn
  world.moments.afterRender();
  if (mode !== 'bench') R.tick();                                                    // (the benchmark measures your settings as they are)
  updateTips(dt);
}
R.renderer.setAnimationLoop(frame);

// Small handle for automated checks and console poking; not used by the game itself.
debug.workbook = workbook; debug.openWork = (w, t) => openWork(w, t); debug.goesLeft = () => goesLeft(life);
debug.setLang = setLang; debug.getLang = getLang; debug.voice = voice; debug.llm = llm; debug.talk = talk; debug.journal = journal; debug.profile = profilePage; debug.season = season; debug.openSeason = openSeason; debug.QUESTS = QUESTS; debug.updateStory = () => updateStory();
window.__bund = debug;
Object.defineProperties(debug, Object.getOwnPropertyDescriptors({
  player, camera, scene, R, audio, wind,
  get mode() { return mode; }, get target() { return target; }, get talkTarget() { return talkTarget; }, talkables: () => talkables(),
  talkProbe: () => talkables().map((q) => { const c = camera.position, v = { x: q.x - c.x, y: q.y - c.y, z: q.z - c.z }, d = Math.hypot(v.x, v.y, v.z); camera.getWorldDirection(_d); return { key: q.key, d: +d.toFixed(2), vy: +v.y.toFixed(2), cos: +((v.x * _d.x + v.y * _d.y + v.z * _d.z) / d).toFixed(3), block: colliders.filter((b) => BLOCKING_TAGS.has(b.tag) && segmentHitsBox(c.x, c.z, q.x, q.z, b)).map((b) => b.tag) }; }).filter((r) => r.d < 6),
  get nearClue() { return !!target && target.id === 'notice'; }, get nearNpc() { return !!target && target.id === 'lin'; },
  get clueRead() { return clueRead; }, get subtitlesOn() { return subtitlesOn; },
  get conversation() { return conversation; }, get dialogueAudio() { return dialogueAudio; },
  get npcs() { return world ? world.npcs : null; },
  // Mission One integration surface: mission.start(source) / reset() / on('start'|'complete'|...)
  get mission() { return mission1 ? mission1.mission : null; },
  get mission1() { return mission1; }, get nearPouch() { return !!target && target.id === 'pouch'; },
  get traffic() { return traffic; }, weather, THREE,                // THREE: for verification tools only
  get pedestrians() { return world ? world.pedestrians : null; },
  get world() { return world; }, get life() { return life; }, phone,
  get cup() { return cupFor; }, set cup(v) { cupFor = v; }, get bumps() { return bumps; },
  start() { noLock = true; if (mode === 'entry') begin(); },
}));

boot().catch((err) => { console.error(err); titleScreen.fail(); hud.fail(err); });
