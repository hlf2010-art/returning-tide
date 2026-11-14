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
import { createPlayer } from './engine/player.js';
import { createAudio } from './engine/audio.js';
import { L, npcs as npcLayout } from './world/layout.js';
import { FONT, loadFonts } from './world/canvas.js';
import { T, ALL_TEXT } from './world/text.js';
import { createMaterials } from './world/materials.js';
import { createSky, FOG_COLOR } from './world/sky.js';
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
import { createPouch, HELD_LAYER } from './world/pouch.js';
import { createMissionOne } from './missionOne.js';
import { pickTarget } from './engine/targeting.js';
import { createWeather } from './engine/weather.js';
import { createRain, RAIN_LAYER } from './world/rain.js';
import { weatherUniforms, ssrMask } from './world/materials.js';
import { underCover } from './world/layout.js';
import { colliders } from './world/layout.js';
import { crossing, addDynamicCollider } from './world/layout.js';
import { createTraffic } from './engine/traffic.js';
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
import { createBelongings } from './world/belongings.js';
import { createHuracan, HURACAN_SPOT } from './world/huracan.js';
import { createCarSale } from './world/carSale.js';
import { createInteriors } from './world/interiors.js';
import { createWalkers } from './world/walkers.js';
import { lead as carLead, contact as carContact, choosePlate, payBalance, stepPurchase } from './engine/carPurchase.js';
import { usePhotoSurfaces } from './world/photoTextures.js';
import { createDidi, PICKUP } from './world/didi.js';
import { createRideFlow } from './world/rideFlow.js';
import { createShop } from './engine/errands.js';
import { manner as mannerSpec, stall as stallSpot } from './world/layout.js';
import { createMinimap } from './ui/minimap.js';
import { createLife, advance as lifeAdvance, lapse as lifeLapse, drain as lifeDrain, save as lifeSave, clockText as lifeClock, load as lifeLoad, post as lifePost, stamp as lifeStamp, thread as lifeThread, nudge as lifeNudge } from './engine/life.js';
import { setupThreads, runAgenda, deliverFollowUps, react as lifeReact, CALLS } from './world/agenda.js';
import { createPhone } from './ui/phone/phone.js';
import { t as tx, tr, getLang, setLang, onLang } from './ui/i18n.js';
import { createMinimapState, updateMinimap, zoneAt } from './engine/minimapLogic.js';
import { createWind, WIND_LEVELS } from './world/wind.js';
import { planterIslands, streetTrees } from './world/layout.js';

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
const R = createRenderer(canvas, scene, camera, { fixedLevel: params.has('q') ? Number(params.get('q')) : null });
const player = createPlayer(camera, canvas);
const audio = createAudio();
const hud = createHud();

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
const HAZE_FOG = new THREE.Color(0.072, 0.108, 0.2), FOG_DENSITY = scene.fog.density, HAZE_DENSITY = 0.00028;
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
  traffic = createTraffic({ geom: crossing, vehicles: crossing.vehicles, peds: crossing.peds, shop: createShop({ queue: mannerSpec.queue, pickup: mannerSpec.pickup }) });
  const vehicles = createVehicles(crossing.vehicles), signals = createSignals();
  const pedestrians = people ? createRealPedestrians(traffic.peds, people) : createPedestrians(traffic.peds);
  const vehicleBoxes = traffic.vehicles.map(() => addDynamicCollider('vehicle'));
  // the crossing's pedestrians are solid to the player (they steer round you; you can still walk into them)
  pedBoxes = traffic.peds.map((p) => { const b = addDynamicCollider('npc'); b.id = p.id; return b; });
  traffic.vehicles.forEach((v, i) => { v.ice = ['taxi', 'sedan'].includes(crossing.vehicles[i].model); });   // petrol engines get an engine note
  scene.add(sky.mesh, skyline.group, river.group, bund.group, promenade.group, street.group, clue.mesh, npcs.group, ...pouch.meshes,
    vehicles.group, signals.group, pedestrians.group, rain.mesh);
  // trees: London planes on Hankou Road (November: turning, some twigs already bare), camphor
  // laurels in the promenade planters
  const trees = createTrees([
    ...streetTrees.map((t, i) => ({ x: t.x, y: L.curbH, z: t.z, h: 8.4 + (i % 2) * 0.7, species: 'plane', seed: 31 + i, bare: 0.12, away: [0, -Math.sign(t.z)] })),
    ...planterIslands.map((p, i) => ({ x: (p.x0 + p.x1) / 2, y: L.deckY + 0.5, z: (p.z0 + p.z1) / 2 + (i % 2 ? 1.5 : -1.5), h: 4.2 + (i % 3) * 0.3, species: 'camphor', seed: 1 + i })),
  ], { wetBoost: weatherUniforms.wetBoost });
  scene.add(trees.group);
  // Manner Coffee's takeaway front on Hankou Road (world/shops.js), lit from inside
  const manner = createManner(L.curbH); scene.add(manner.group);
  // a Lamborghini parked on Hankou Road (loads in the background; world/huracan.js)
  const huracan = createHuracan(scene);
  huracan.ready.then((r) => {
    if (!r) return;
    traffic.setSights([{ id: 'huracan', x: HURACAN_SPOT.x, z: HURACAN_SPOT.z }]);                        // passers-by look; some take a photo
    traffic.setObstacles([-1.5, 0, 1.5].map((dx) => ({ x: HURACAN_SPOT.x + dx, z: HURACAN_SPOT.z, r: 1.15 })));   // and walk round it
  });
  // the Peace Hotel's ground floor and the AIA lobby (world/interiors.js); their lamps join the light pool
  const interiors = createInteriors({ scene, people, hud, audio, getLife: () => life, save: () => saveLife(), player, onCard: showInfoCard });
  const lighting = createLighting(scene, street.lanterns, [{ ...manner.light, intensity: 7, distance: 10, color: new THREE.Color(1.0, 0.92, 0.8) }, ...interiors.lights]);
  // shadows: everything solid at street level casts and receives (not the sky, skyline, river, rain or glows)
  for (const g of [bund.group, promenade.group, street.group, npcs.group, vehicles.group, signals.group, pedestrians.group]) {
    g.traverse((o) => {
      if (!o.isMesh) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent || m.blending === THREE.AdditiveBlending) return;
      o.castShadow = true; o.receiveShadow = true;
    });
  }
  scene.updateMatrixWorld(true);
  captureEnvironment(R.renderer, scene);
  // what you buy: the courier at the kerb, parcels, the umbrella, headphones (world/belongings.js)
  const belongings = createBelongings({ scene, people, camera, hud, audio, getLife: () => life, save: () => saveLife() });
  // DiDi: a car from the traffic comes to the kerb; you ride in it (world/didi.js, world/rideFlow.js)
  const didi = createDidi({ scene, people, traffic, vehicles, camera, player, renderer: R.renderer });
  const rideFlow = createRideFlow({ getLife: () => life, didi, hud, audio, save: () => saveLife(), onMode: rideMode });
  document.querySelector('#ride-card .go').addEventListener('click', () => { if (!closeInfoCard()) rideFlow.closeCard(); });
  // buying it: Vivian, the consultant, at the car (world/carSale.js, engine/carPurchase.js)
  const carSale = createCarSale({ scene, people, huracan, hud, audio, camera, player, getLife: () => life, save: () => saveLife(), onMode: saleMode });
  if (life.flags.carBuy && life.flags.carBuy.stage === 'booked' && lifeStamp(life) >= life.flags.carBuy.at - 5) carSale.appear('viewing');
  world = { sky, skyline, river, bund, street, clue, lighting, npcs, pouch, vehicles, signals, pedestrians, vehicleBoxes, rain, playerBody, trees, belongings, didi, rideFlow, huracan, carSale, interiors, walkers: createWalkers({ scene, people }) };
  // bumping into people: their reactions, a passing remark, a jolt for you
  bumps = createBumps({ hud, audio, onPlayerBump: ({ closing }) => { player.head.dipV -= 0.1 + 0.05 * Math.min(4, closing); player.head.roll += (Math.random() - 0.5) * 0.04; } });
  // wet-ground reflections: deck, pavements and carriageways, each with its own per-pixel mask
  const reflectors = [];
  scene.traverse((o) => { if (o.isMesh && (o.material === M.deck || o.material === M.sidewalk || o.material === M.asphalt)) { o.userData.ssrMask = ssrMask(o.material); reflectors.push(o); } });
  if (params.get('ssr') !== '0') R.setReflectors(reflectors);
  dialogueAudio = createDialogueAudio({
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
  document.getElementById('inspect-paper').appendChild(clue.canvas);
  player.update(0);
  R.renderer.compile(scene, camera);
  mode = 'entry';
  hud.ready(lifeClock(life.clock.minute));
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
function closeInfoCard() { const c = document.getElementById('ride-card'); if (c && c.dataset.info) { c.classList.remove('on'); delete c.dataset.info; return true; } return false; }
// talking with Vivian at the car (1-4), or sat in it (the car sale has the camera)
function saleMode(m) {
  if (m === 'sale') { mode = 'sale'; player.enabled = false; player.lookOnly = false; player.clearInput(); hud.prompt(false); target = null; }
  else if (m === 'sale-seat') { mode = 'sale-seat'; player.enabled = false; player.lookOnly = true; }
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
  mode = back ? 'ride' : 'play'; player.enabled = !back; pausedFrom = 'play'; audio.resume();
  if (conversation) conversation.setPaused(false);
  hud.show('pause', false);
}
function begin() {
  if (mode !== 'entry') return;
  audio.start(); lock(); play(); hud.begin(lifeClock(life.clock.minute));
  if (devControls) hud.show('dev', true);
  if (conversation && conversation.state === 'idle') conversation.start();
}
function pause() {
  // pausing cancels an open interaction (it can be re-entered afterwards)
  if (mode === 'inspect') closeInspect();
  if (mode === 'dialogue') closeDialogue();
  if (mode === 'pouch') closePouch();
  if (mode !== 'play' && mode !== 'ride') return;
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
function syncSettings() {
  for (const seg of document.querySelectorAll('.seg[data-setting]')) {
    const cur = { lang: getLang(), subs: subtitlesOn ? 'on' : 'off', sound: audio.muted ? 'off' : 'on' }[seg.dataset.setting];
    for (const b of seg.querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === cur);
  }
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('.seg[data-setting] button');
  if (b) {
    const k = b.parentElement.dataset.setting, v = b.dataset.v;
    if (k === 'lang') setLang(v);
    if (k === 'subs') subtitlesOn = v === 'on';
    if (k === 'sound' && (audio.muted !== (v === 'off'))) audio.toggleMute();
    syncSettings(); return;
  }
  if (e.target.closest('[data-open-settings]')) { document.getElementById('settings').classList.remove('hidden'); syncSettings(); return; }
  if (e.target.closest('[data-close-settings]') || e.target.id === 'settings') document.getElementById('settings').classList.add('hidden');
});
onLang(() => syncSettings());
syncSettings();
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) { if (mode === 'pause') play(); }
  else if (!noLock && (mode === 'play' || mode === 'ride' || mode === 'inspect' || mode === 'dialogue' || mode === 'pouch') && !(phone && phone.isOpen)) pause();   // the phone frees the mouse on purpose
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
  if (k === 'KeyM') { hud.toast(tx(audio.toggleMute() ? 'soundOff' : 'soundOn'), 2.4); syncSettings(); return; }
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
  if (mode === 'ride') {
    if (world.rideFlow.key(k)) { e.preventDefault(); return; }
    if (k === 'Escape' && noLock) pause();
    return;
  }
  if (mode === 'play') {
    if ((k === 'KeyE' || k === 'Enter') && closeInfoCard()) return;
    if (world && world.belongings && world.belongings.key(k)) return;
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
  else if (world.interiors.owns(target.id)) world.interiors.interact(target.id);
  else if (world.belongings.interact(target.id)) { /* the courier */ }
  else if (target.id === 'manner') {
    const mo = life.flags.mannerOrder;
    if (mo && !mo.done && mo.notified) { mo.done = true; cupFor = 240; hud.bark({ speaker: { zh: '店员', en: 'Barista' }, text: { zh: `${mo.num}号，您的${mo.item.name}，拿好～`, en: `Number ${mo.num}, your ${mo.item.en.toLowerCase()}. Here you go.` }, seconds: 2.6 }); saveLife(); }
    else if (mo && !mo.done) hud.bark({ speaker: { zh: '店员', en: 'Barista' }, text: { zh: '稍等一下哦，马上好。', en: 'Just a moment, nearly ready.' }, seconds: 2.2 });
    else { hud.bark({ speaker: { zh: '店员', en: 'Barista' }, text: { zh: '您好～扫码点单哦，码在窗口这边。', en: 'Hi! Scan the code by the window to order.' }, seconds: 2.6 }); phone.openManner(); }
  }
}
player.onStep = (surface, running, landing) => audio.step(surface, running, landing);
// If the browser kept the context suspended despite the Begin click, any later gesture wakes it.
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => {
  const c = audio.getContext();
  if (c && c.state === 'suspended' && !audio.paused && mode !== 'pause') c.resume();
});

// ---- frame ----
let target = null, boundaryCooldown = 0;   // target: { id, dist, cos } or null
const debug = { noReflect: false, freezeTraffic: false };   // freezeTraffic: screenshot tool only
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
let pedBoxes = [], bumps = null;
// ---- the protagonist's life and phone (engine/life.js, world/agenda.js, ui/phone) ----
const LIFE_KEY = 'bund-life-v1';
let life = null;
try { life = params.has('fresh') ? null : lifeLoad(localStorage.getItem(LIFE_KEY)); } catch { life = null; }
if (!life) { life = createLife(); setupThreads(life); }
const saveLife = () => { try { localStorage.setItem(LIFE_KEY, lifeSave(life)); } catch { /* private mode: no saving */ } };
let lifeSaveIn = 5, pendingCalls = [], cupFor = 0;
const phone = createPhone({
  getLife: () => life, calls: CALLS, audio,
  ride: {
    get: () => (world && world.rideFlow ? world.rideFlow.ride : null), request: (id) => world && world.rideFlow.request(id),
    cancel: () => world && world.rideFlow.cancel(), message: (q) => world && world.rideFlow.message(q),
  },
  onChange: (up) => { player.capScale = up ? 0.55 : 1; if (!up && mode === 'play' && !noLock) canvas.requestPointerLock?.(); },
  onEvent: (ev) => {
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
    saveLife();
  },
});
window.addEventListener('keydown', (e) => {
  if (mode !== 'play') return;
  if (phone.key(e)) { e.stopImmediatePropagation(); return; }
  if (e.code === 'KeyP' && !e.repeat) { phone.toggle(); e.stopImmediatePropagation(); }
}, true);
function updateLife(dt) {
  if (mode !== 'play' && mode !== 'ride' && mode !== 'sale' && mode !== 'sale-seat' && mode !== 'dialogue' && mode !== 'inspect' && mode !== 'pouch') return;
  lifeAdvance(life, dt);
  if (params.get('life') !== '0') { runAgenda(life); deliverFollowUps(life); }   // ?life=0: nobody gets in touch (measurement tools)
  for (const inv of lifeLapse(life)) lifeReact(life, { type: 'invite', id: inv.id, status: 'missed', from: inv.from, thread: inv.thread });
  const events = lifeDrain(life);
  for (const ev of events) if (ev.type === 'call') pendingCalls.push(ev);
  if (world && world.belongings) world.belongings.step(dt, events);
  if (world && world.carSale) updateCarSale(events);
  // calls wait until you're not in the middle of something else
  if (pendingCalls.length && mode === 'play' && !phone.inCall) { const c = pendingCalls.shift(); phone.ring(c.script); }
  const mo = life.flags.mannerOrder;
  if (mo && !mo.notified && lifeStamp(life) >= mo.ready) {
    mo.notified = true;
    lifeThread(life, 'manner', { title: 'Manner Coffee', members: ['me', 'manner'], kind: 'service' });
    lifePost(life, 'manner', { from: 'manner', kind: 'text', text: `您的${mo.item.name}已做好，取餐号 ${mo.num}，请到窗口取餐` });
  }
  if (cupFor > 0) cupFor = Math.max(0, cupFor - dt);
  phone.update(dt);
  if ((lifeSaveIn -= dt) <= 0) { lifeSaveIn = 5; saveLife(); }
}
// the Huracán: Zhixia's lead (after you said you'd think about a car), the appointment, the
// purchase's own clock, delivery, and what your friends make of it
function updateCarSale(events) {
  const f = life.flags, now = lifeStamp(life);
  if (f.carCurious && params.get('life') !== '0') { f.carCuriousAt ??= now; if (!f.carBuy && now >= f.carCuriousAt + 25) carLead(life); }
  for (const ev of events) {
    if (ev.type === 'car-appointment') f.carAppointAt = ev.at;
    if (ev.type === 'car-delivered') {
      lifePost(life, 'wuhu', { from: 'momo', kind: 'text', text: '？？？白白提车了？？？' });
      (f.pendingFollow ||= []).push({ at: now + 2, thread: 'wuhu', from: 'zhixia', text: '我就说吧😎 周末天马，带上它。' }, { at: now + 5, thread: 'wuhu', from: 'xuan', text: '……你爸知道吗' });
    }
  }
  const b = f.carBuy;
  if (b && b.stage === 'booked' && f.carAppointAt != null && now >= f.carAppointAt - 5 && !world.carSale.present) world.carSale.appear('viewing');
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
function mapTarget() {
  const r = world && world.rideFlow && world.rideFlow.ride;
  if (r && (r.phase === 'coming' || r.phase === 'waiting')) return { x: PICKUP.x, z: PICKUP.z, label: tx('mapDidi') };
  return mapObjective() || (world && world.belongings ? world.belongings.mapObjective() : null);
}
function updateMap(dt) {
  const b = player.body, obj = mapTarget(), zone = zoneAt(b.x, b.z, L);
  updateMinimap(mapState, dt, { mode, moving: player.speed > 0.6, objective: !!obj, zone, held: mapHeld });
  minimap.setShown(mapState.shown);
  document.getElementById('hud').classList.toggle('map-on', mapState.shown);
  if (mapState.shown && (mapFrame++ % 2 === 0)) minimap.draw({ x: b.x, z: b.z, yaw: player.yaw, objective: obj, people: traffic ? traffic.peds : [], area: zone });
}
const REACT_FOR = { sorry: 1.6, fine: 1.2, scold: 2.8, tut: 1.4, look: 0.9 };
function bumpActors() {
  const out = traffic.peds.map((p) => ({
    id: p.id, persona: p.persona, x: p.x, z: p.z, vx: p.vx, vz: p.vz, r: 0.3, busy: p.phone > 0.5,
    apply(r, other) {
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
  const b = player.body;
  out.push({ id: 'player', x: b.x, z: b.z, vx: b.pvx || 0, vz: b.pvz || 0, r: 0.42 });
  return out;
}
function updateTraffic(dt) {
  const b = player.body;
  _player.x = b.x; _player.z = b.z; _player.vx = b.vx; _player.vz = b.vz;
  // on the promenade deck the player is nowhere near the road
  traffic.update(dt, { player: b.y > 1 ? null : _player, rain: weather.rain });
  world.vehicles.update(traffic.vehicles);
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

function frame(now) {
  const dt = Math.min(debug.dtMax || 0.05, Math.max(0, (now - last) / 1000)); last = now; t += dt;   // dtMax: tools only (slow software GL)
  if (!world) return;

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
  if (player.body.z < -120) world.interiors.update(mode === 'pause' ? 0 : dt, player.body);
  if (player.body.z < -30) world.walkers.update(mode === 'pause' ? 0 : dt, player.body);   // people with somewhere to be, on the northern Bund
  if (!riding && mode !== 'sale-seat') player.update(mode === 'pause' ? 0 : dt);
  if (world.playerBody) { world.playerBody.setVisible(!riding); if (!riding) world.playerBody.update(mode === 'pause' ? 0 : dt, player, camera.position); }

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
  scene.fog.density = FOG_DENSITY + HAZE_DENSITY * weather.haze;
  scene.fog.color.lerpColors(FOG_COLOR, HAZE_FOG, weather.haze);
  audio.setRain(weather.rain, underCover(player.body.x, player.body.z, player.body.y + L.eye) || world.belongings.umbrellaUp);
  world.sky.update(t, weather.haze); world.skyline.update(t); world.river.update(t, dt); world.bund.update(t); world.street.update(t);
  world.lighting.setShadowCount(params.get('shadows') === '0' ? 0 : R.quality.shadows);
  if (R.level !== treeLevel) { treeLevel = R.level; world.trees.setQuality(R.level); }
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
  audio.update(mode === 'pause' ? 0 : dt, player.body.x, { z: player.body.z, vehicles: traffic ? traffic.vehicles : null, speech });
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
    if (player.body.z < -125) cands.push(...world.interiors.candidates());
    if (world.rideFlow.canBoard()) { const d = world.didi.doorFocus(); if (d) cands.push({ id: 'didi', ...d, reach: 2.8, cone: 0.6 }); }
    cands.push({ id: 'manner', x: mannerSpec.queue[0].x + 0.2, y: L.curbH + 1.15, z: mannerSpec.zWall + mannerSpec.depth - 0.1, reach: 2.6, cone: 0.7 });
    target = pickTarget(camera.position, _d, cands, colliders);
  }
  if (target && world.interiors.owns(target.id)) hud.prompt(true, world.interiors.prompt(target.id));
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
  R.tick();
}
R.renderer.setAnimationLoop(frame);

// Small handle for automated checks and console poking; not used by the game itself.
debug.setLang = setLang; debug.getLang = getLang;
window.__bund = debug;
Object.defineProperties(debug, Object.getOwnPropertyDescriptors({
  player, camera, scene, R, audio, wind,
  get mode() { return mode; }, get target() { return target; },
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

boot().catch((err) => { console.error(err); hud.fail(err); });
