// The phone's 滴滴出行 DiDi app: where to, a fare estimate, call the car; then the driver card (name,
// car, plate, how far), quick messages to the driver, cancelling. The app's name as text on a plain
// orange tile; no logo, no copied interface. The ride itself is engine/ride.js; the car is world/didi.js.
import { DESTINATIONS, fare } from '../../engine/ride.js';
import { DRIVER_NAME_EN } from '../../world/driversEn.js';
import { CARS } from '../../world/carModels.js';

const QUICK = [
  { zh: '我在路口了，马上到', en: "I'm at the corner, coming now" },
  { zh: '稍等我两分钟', en: 'Give me two minutes' },
  { zh: '我穿深色外套', en: "I'm in a dark coat" },
];

export function createDidiApp({ L, Z, esc, go, render, top, getRide, onRequest, onCancel, onMessage }) {
  const pickup = () => Z('中山东一路 汉口路口（东侧）', 'Zhongshan E-1 Rd at Hankou Rd (east side)');
  const map = (label) => `<div class="dmap"><div class="road r1"></div><div class="road r2"></div><div class="river"></div><div class="pin"></div><div class="dlabel">${esc(label)}</div></div>`;

  function homeView(l) {
    const R = getRide();
    if (R && R.phase !== 'arrived' && R.phase !== 'cancelled') return rideView(l, R);
    const rows = DESTINATIONS.map((d) => `<div class="drow" data-act="didiTo" data-id="${d.id}"><div class="mid"><div class="n">${esc(Z(d.zh, d.en))}</div>
      <div class="pv">${d.km} km · ${Z(`约${d.mins}分钟`, `about ${d.mins} min`)}</div></div><div class="pr">¥${fare(d, l.clock.minute).toFixed(1)}</div></div>`).join('');
    return `<div class="view didi"><div class="bar didibar"><span class="back" data-act="back">‹</span>${Z('滴滴出行', 'DiDi')}</div>${map(Z('你在这里', 'You are here'))}
      <div class="dfrom"><i class="dot g"></i>${esc(pickup())}</div><div class="plabel">${Z('你要去哪儿', 'Where to?')}</div><div class="scroll">${rows}</div></div>`;
  }

  function rideView(l, R) {
    const d = DESTINATIONS.find((x) => x.id === R.to), drv = R.driver;
    let body = '';
    if (R.phase === 'matching') body = `<div class="dstat"><div class="spin"></div>${Z('正在为你呼叫附近司机…', 'Finding you a driver nearby…')}</div>`;
    else {
      const car = R.car && CARS[R.car] ? Z(`${CARS[R.car].zh} ${CARS[R.car].name.replace(/^\S+\s/, '')}`, CARS[R.car].name) : '';
      const status = R.phase === 'coming' ? Z(`司机正在赶来 · 约${Math.max(1, Math.round(R.etaMin || 2))}分钟`, `Driver on the way · about ${Math.max(1, Math.round(R.etaMin || 2))} min`)
        : R.phase === 'waiting' ? Z('司机已到达上车点，打着双闪', "Your driver's at the pickup point, hazards on")
          : Z('行程中', 'On your way');
      body = `<div class="dstat">${esc(status)}</div>
        <div class="dcard"><div class="plate">${esc(drv.plate)}</div><div class="car">${esc(car)}</div>
        <div class="who"><span class="av">${esc(Z(drv.name.slice(0, 1), (DRIVER_NAME_EN[drv.name] || 'D').split(' ').pop()[0]))}</span>${esc(Z(drv.name, DRIVER_NAME_EN[drv.name] || drv.name))} · ★ ${drv.rating || '4.9'}</div></div>
        ${R.phase !== 'riding' ? `<div class="plabel">${Z('给司机发消息', 'Message your driver')}</div><div class="chips">${QUICK.map((q, i) => `<button class="chip" data-act="didiMsg" data-i="${i}">${esc(Z(q.zh, q.en))}</button>`).join('')}</div>
        <button class="btn no dcancel" data-act="didiCancel">${Z('取消行程', 'Cancel ride')}</button>` : ''}`;
    }
    return `<div class="view didi"><div class="bar didibar"><span class="back" data-act="back">‹</span>${Z('滴滴出行', 'DiDi')}</div>${map(Z(d.zh, d.en))}
      <div class="dfrom"><i class="dot g"></i>${esc(pickup())}</div><div class="dfrom"><i class="dot o"></i>${esc(Z(d.zh, d.en))}</div>${body}</div>`;
  }

  function confirmView(l, t) {
    const d = DESTINATIONS.find((x) => x.id === t.id);
    return `<div class="view didi"><div class="bar didibar"><span class="back" data-act="back">‹</span>${Z('滴滴出行', 'DiDi')}</div>${map(Z(d.zh, d.en))}
      <div class="dfrom"><i class="dot g"></i>${esc(pickup())}</div><div class="dfrom"><i class="dot o"></i>${esc(Z(d.zh, d.en))}</div>
      <div class="dquote"><div class="k">${Z('快车', 'Express')}</div><div class="amt">¥${fare(d, l.clock.minute).toFixed(1)}</div><div class="pv">${Z(`预估价 · 约${d.mins}分钟 · ${d.km}公里`, `Estimate · about ${d.mins} min · ${d.km} km`)}</div></div>
      <div class="pnote" style="padding:0 16px">${Z('车费在下车时用微信支付扣款（游戏内虚拟资金）', 'The fare is charged to WeChat Pay when you get out (in-game money)')}</div>
      <button class="btn go dcall" data-act="didiCall" data-id="${d.id}">${Z('呼叫快车', 'Call DiDi Express')}</button></div>`;
  }

  function act(a, id, el) {
    if (a === 'didiTo') { go('didiConfirm', { id }); return true; }
    if (a === 'didiCall') { onRequest(id); go('didi'); return true; }
    if (a === 'didiCancel') { onCancel(); render(); return true; }
    if (a === 'didiMsg') { const q = QUICK[+el.dataset.i]; onMessage(q); render(); return true; }
    return false;
  }
  return { views: { didi: homeView, didiConfirm: confirmView }, act };
}
