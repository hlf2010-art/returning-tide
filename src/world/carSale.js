// The Huracán, bought the way it's actually done (engine/carPurchase.js keeps the state and the money).
// In the world:
//   - at the appointment Vivian (the sales consultant) waits on the pavement by the demo car on
//     Hankou Road. E to talk: what she says, and what you can answer with 1-4
//   - sit in it (the passenger seat; mouse to look round, E to get out), hear her start the V10
//   - colour and interior, then the deposit (by bank transfer, in-game money)
//   - the plate and the balance carry on in WeChat with her (her messages offer the choices)
//   - delivery: back on Hankou Road, the car in your colour with your plate, Vivian with the key
// Conversation lines show in the chosen language; brands as text only.
import * as THREE from 'three';
import { createPerson } from './people.js';
import { CAR, COLOURS, INTERIORS, view, spec, payDeposit, quote, deliver } from '../engine/carPurchase.js';
import { HURACAN_SPOT } from './huracan.js';
import { getLang } from '../ui/i18n.js';
import { L as LAYOUT } from './layout.js';

const ZH = () => getLang() === 'zh';
const T = (zh, en) => (ZH() ? zh : en);
export const VIVIAN_SPOT = { x: HURACAN_SPOT.x + 1.2, z: HURACAN_SPOT.z + 1.85 };   // on the pavement by the passenger door

function plateTexture(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 80;
  const x = c.getContext('2d'), nanjing = text.startsWith('苏');
  const g = x.createLinearGradient(0, 0, 0, 80);
  if (nanjing) { g.addColorStop(0, '#2a62c9'); g.addColorStop(1, '#1d4fa8'); } else { g.addColorStop(0, '#2a62c9'); g.addColorStop(1, '#1d4fa8'); }   // petrol cars: blue plates
  x.fillStyle = g; x.fillRect(0, 0, 256, 80); x.strokeStyle = '#e8eef6'; x.lineWidth = 4; x.strokeRect(5, 5, 246, 70);
  x.fillStyle = '#f4f7fb'; x.font = '700 44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 43);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createCarSale({ scene, people, huracan, hud, audio, camera, player, getLife, save, onMode }) {
  const S = { vivian: null, present: false, talk: null, sitting: false, delivery: false, plates: [] };
  if (people) {
    const role = people.manifest.cast.vivian ? 'vivian' : 'p2';
    S.vivian = createPerson(people, role); S.vivian.root.visible = false; S.vivian.root.name = 'vivian';
    S.vivian.root.position.set(VIVIAN_SPOT.x, LAYOUT.curbH, VIVIAN_SPOT.z);
    S.vivian.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(S.vivian.root);
  }
  const box = document.getElementById('ride-sub');
  function show(speaker, text, choices = null) {
    if (!box) return;
    box.classList.add('on'); box.querySelector('.sp').textContent = speaker; box.querySelector('.tx').textContent = text;
    const ch = box.querySelector('.ch'); ch.innerHTML = choices ? choices.map((c, i) => `<span><kbd>${i + 1}</kbd>${c}</span>`).join('') : ''; ch.classList.toggle('hidden', !choices);
  }
  const hide = () => box && box.classList.remove('on');
  const VIV = () => T('Vivian', 'Vivian');

  // the conversation at the car: a few small scenes, each a line and up to four answers
  const scenes = {
    hello: () => ({
      text: T('沈先生？我是Vivian。这台是我们的试驾车，Huracán LP610-4，5.2升V10自然吸气，您随便看。', "Mr Shen? I'm Vivian. This is our demo car, the Huracán LP610-4: 5.2-litre naturally aspirated V10. Have a good look."),
      choices: [[T('能坐进去看看吗？', 'Can I sit in it?'), 'sit'], [T('听听发动机？', "Can I hear the engine?"), 'engine'], [T('颜色和内饰有哪些？', 'What colours and interiors are there?'), 'colour'], [T('我再想想。', "I'll think about it."), 'bye']],
    }),
    engine: () => { audio && audio.cue && audio.cue('v10'); huracan.setLights(true); return {
      text: T('（她探身进去按了启动键。V10先是一声吼，然后低低地怠速。路边好几个人回头。）', '(She leans in and presses start. The V10 barks, then settles into a low idle. Several people on the pavement turn round.)'),
      choices: [[T('能坐进去看看吗？', 'Can I sit in it?'), 'sit'], [T('颜色和内饰有哪些？', 'What colours and interiors are there?'), 'colour'], [T('价格呢？', 'And the price?'), 'price'], [T('我再想想。', "I'll think about it."), 'bye']],
    }; },
    colour: () => ({
      text: T('车身色我推荐这四个，上海这边绿色的最少见。', 'For the body I would suggest one of these four. Green is the rarest in Shanghai.'),
      choices: COLOURS.map((c) => [T(c.zh, c.en), `paint:${c.id}`]),
    }),
    interior: () => ({
      text: T('内饰呢？黑色Alcantara比较运动，赤陶棕的皮革在白天特别好看。', 'And inside? Black Alcantara is the sporty one; the terracotta leather looks wonderful in daylight.'),
      choices: INTERIORS.map((c) => [T(c.zh, c.en), `trim:${c.id}`]),
    }),
    price: () => ({
      text: T(`落地大概${(CAR.price / 10000).toFixed(0)}万。定金20万，今天交的话这一批的配额能帮您锁住，大概两周到店。`, `About ¥${(CAR.price / 1e6).toFixed(2)} million on the road. A ¥200,000 deposit today secures this allocation; it would arrive in about two weeks.`),
      choices: [[T('今天就定。', "Let's do it today."), 'deposit'], [T('全款还是贷款划算？', 'Is it better to pay in full or finance?'), 'finance'], [T('我再想想。', "I'll think about it."), 'bye']],
    }),
    finance: () => { const q = quote('finance'); return {
      text: T(`做金融的话首付三成，月供大概${q.monthly.toLocaleString('en-US')}，36期。很多客户这样做，现金流灵活一点。`, `With finance it's 30% down and about ¥${q.monthly.toLocaleString('en-US')} a month over 36 months. A lot of clients do that: it keeps cash free.`),
      choices: [[T('今天先交定金。', "I'll pay the deposit today."), 'deposit'], [T('我再想想。', "I'll think about it."), 'bye']],
    }; },
    deposited: () => ({
      text: T('好的！定金收到了。上牌和尾款的事我微信上跟您确认～', "Wonderful, the deposit's in. I'll confirm the plate and the balance with you on WeChat."),
      choices: [[T('好，谢谢。', 'Great, thanks.'), 'bye']],
    }),
    short: () => ({ text: T('银行卡余额好像不够……没关系，您方便的时候再说。', "It looks like there isn't enough in the account... No problem, whenever suits you."), choices: [[T('好。', 'OK.'), 'bye']] }),
    bye: () => ({ text: T('好的，有问题随时微信我。', 'Of course. Message me any time.'), choices: null, end: true }),
  };
  let picked = { colour: null, interior: null };
  function go(name) {
    const sc = scenes[name](); S.talk = { name, sc };
    show(VIV(), sc.text, sc.choices ? sc.choices.map((c) => c[0]) : null);
    if (sc.end) setTimeout(() => { if (S.talk && S.talk.name === name) end(); }, 2600);
    if (S.vivian) S.vivian.play(sc.end ? 'idle' : 'talk1', 0.3);
  }
  function choose(i) {
    const sc = S.talk && S.talk.sc; if (!sc || !sc.choices || !sc.choices[i]) return;
    const act = sc.choices[i][1], L = getLife();
    if (act.startsWith('paint:')) { picked.colour = act.slice(6); return go('interior'); }
    if (act.startsWith('trim:')) { picked.interior = act.slice(5); spec(L, picked); return go('price'); }
    if (act === 'sit') return sitIn();
    if (act === 'deposit') {
      if (!picked.colour) return go('colour');
      const r = payDeposit(L); if (save) save();
      return go(r.ok ? 'deposited' : 'short');
    }
    go(act);
  }
  // in the passenger seat (the car faces +x; left-hand drive, so the passenger is on the +z side)
  function sitIn() {
    S.sitting = true; hide();
    player.lookOnly = true; player.yaw = -Math.PI / 2; player.pitch = -0.08;
    hud.toast(T('E 下车 · 鼠标环顾', 'E to get out · mouse to look around'), 3);
    onMode('sale-seat');
  }
  function end() { S.talk = null; hide(); onMode('play'); if (S.vivian) S.vivian.play('idle', 0.4); }

  // the plate on your car, front and back
  function fitPlate(text) {
    for (const m of S.plates) huracan.group.remove(m);
    const sz = huracan.size || new THREE.Vector3(4.46, 1.14, 2.23), mat = new THREE.MeshStandardMaterial({ map: plateTexture(text), roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.12 });
    mat.emissiveMap = mat.map;
    for (const [x, ry] of [[-sz.x / 2 + 0.03, -Math.PI / 2], [sz.x / 2 - 0.05, Math.PI / 2]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.14), mat); p.position.set(x, 0.36, 0); p.rotation.y = ry; huracan.group.add(p); S.plates.push(p);
    }
  }

  return {
    get present() { return S.present; },
    get sitting() { return S.sitting; },
    // the appointment (or the delivery): Vivian at the car
    appear(kind = 'viewing') {
      S.present = true; S.delivery = kind === 'delivery';
      if (S.vivian) { S.vivian.root.visible = true; S.vivian.play('idle', 0); }
      if (S.delivery) {
        const b = getLife().flags.carBuy, c = COLOURS.find((x) => x.id === b.colour);
        huracan.setPaint(c.hex);
      }
    },
    leave() { S.present = false; if (S.vivian) S.vivian.root.visible = false; },
    candidates() { return S.present && S.vivian ? [{ id: 'vivian', x: VIVIAN_SPOT.x, y: LAYOUT.curbH + 1.5, z: VIVIAN_SPOT.z, reach: 2.8, cone: 0.66 }] : []; },
    prompt() { return { target: 'Vivian', action: S.delivery ? T('提车', 'Take delivery') : T('交谈', 'Talk') }; },
    interact() {
      const L = getLife();
      if (S.delivery) {
        const car = deliver(L);
        if (car) {
          fitPlate(car.plate); huracan.setLights(true); audio && audio.cue && audio.cue('v10');
          show(VIV(), T(`恭喜提车！钥匙给您。${car.plate}，以后它就是您的了。`, `Congratulations! Here's the key. ${car.plate}: she's all yours now.`), null);
          hud.toast(T('兰博基尼 Huracán 已是你的', 'The Huracán is yours'), 4);
          setTimeout(() => { hide(); this.leave(); }, 4200);
          if (save) save();
        }
        return true;
      }
      if (L.flags.carBuy && L.flags.carBuy.stage === 'booked') view(L, { rode: false });
      onMode('sale'); go('hello');
      return true;
    },
    key(code) {
      if (S.sitting) { if (code === 'KeyE' || code === 'Escape') { S.sitting = false; player.lookOnly = false; onMode('sale'); go('engine'); } return true; }
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(code);
      if (i >= 0) { choose(i); return true; }
      if (code === 'Escape') { end(); return true; }
      return false;
    },
    // per frame: Vivian faces you when you're near; in the seat, the camera sits in the car
    update(dt, playerPos) {
      if (S.vivian && S.present) {
        const r = S.vivian.root, dx = playerPos.x - r.position.x, dz = playerPos.z - r.position.z, d = Math.hypot(dx, dz);
        if (d < 8) { let a = Math.atan2(dx, dz) - r.rotation.y; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; r.rotation.y += a * Math.min(1, dt * 3); }
        S.vivian.update(dt, d < 8 ? [playerPos.x, playerPos.z] : null);
      }
      if (S.vivian) {                                                       // she steps back from the door while you're in it
        const want = S.sitting ? 0.7 : 0; S.back = (S.back || 0) + (want - (S.back || 0)) * Math.min(1, dt * 3);
        S.vivian.root.position.set(VIVIAN_SPOT.x + S.back * 0.3, LAYOUT.curbH, VIVIAN_SPOT.z + S.back);
      }
      if (S.sitting) {
        camera.position.set(HURACAN_SPOT.x - 0.25, 0.93, HURACAN_SPOT.z + 0.36);
        camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
      }
    },
  };
}
