// Shop signs for Nanjing Road, drawn for each real shop (world/njShops.js) in its own manner, and hung as
// real signboards: a board with depth, fixed out in front of the façade (clear of the ground floor's
// cornice, which used to cut across the old flat signs), lit at night.
//   plaque   a 老字号's board: black (or red) lacquer, gilt brush characters, a thin gilt border
//   deco     a department store's: dark bronze, cream serif characters, the English beneath
//   brand    a modern brand's lightbox: its colour, bold characters, the English beside
//   letters  standing letters, on a dark fascia band (board) or, without one, cut out against the façade
// Type: Ma Shan Zheng (brush), ZCOOL XiaoWei (an old-fashioned print hand), Noto Serif SC and Noto
// Sans SC Black, all SIL OFL, subset to the shop names (tools/fonts/signs.py, public/fonts/sign-*.woff2).
import * as THREE from 'three';

export const SIGN_FONTS = {
  kai: '"NJ Kai", "Kaiti SC", "STKaiti", "KaiTi", serif',
  wei: '"NJ Wei", "NJ Song", "Songti SC", serif',
  song: '"NJ Song", "Songti SC", "STSong", serif',
  hei: '"NJ Hei", "PingFang SC", "Microsoft YaHei", sans-serif',
};
const FACES = { 'NJ Kai': 'sign-kai.woff2', 'NJ Wei': 'sign-wei.woff2', 'NJ Song': 'sign-song.woff2', 'NJ Hei': 'sign-hei.woff2' };
// the sign faces, loaded once; resolves when they're ready (or have failed: the system's fonts stand in)
let fontsReady = null;
export function loadSignFonts(base = './fonts/') {
  if (fontsReady) return fontsReady;
  if (typeof document === 'undefined' || !document.fonts) return (fontsReady = Promise.resolve(false));
  const faces = Object.entries(FACES).map(([fam, file]) => { const f = new FontFace(fam, `url(${base}${file})`); document.fonts.add(f); return f.load().catch(() => null); });
  return (fontsReady = Promise.all(faces).then(() => true));
}

const PX = 128;                                   // texture pixels per metre of sign height... per row
// fit text into a width: the font size that makes it fit, no larger than `max`
function fit(x, text, font, max, width, spacing = 0) {
  let s = max;
  for (let i = 0; i < 12; i++) { x.font = `${s}px ${font}`; const w = x.measureText(text).width + spacing * s * Math.max(0, [...text].length - 1); if (w <= width) break; s *= Math.max(0.6, width / w); }
  return s;
}
function spaced(x, text, cx, cy, size, font, spacing) {
  // characters spread apart (as on a board), centred on cx
  x.font = `${size}px ${font}`;
  const chars = [...text], ws = chars.map((c) => x.measureText(c).width), gap = spacing * size;
  let tx = cx - (ws.reduce((a, b) => a + b, 0) + gap * (chars.length - 1)) / 2;
  chars.forEach((c, i) => { x.fillText(c, tx + ws[i] / 2, cy); tx += ws[i] + gap; });
}
// draw one sign into (X, Y, W, H) of the atlas
export function drawSign(x, s, X, Y, W, H) {
  const st = s.style || 'brand', zh = s.zh || s.en || '', en = s.zh ? (s.en || '') : '';
  x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip();
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (st === 'plaque') {
    const bg = s.bg || '#111010', gold = s.fg || '#e2b65a';
    const g = x.createLinearGradient(0, Y, 0, Y + H); g.addColorStop(0, shade(bg, 1.25)); g.addColorStop(0.5, bg); g.addColorStop(1, shade(bg, 0.7));
    x.fillStyle = g; x.fillRect(X, Y, W, H);
    x.strokeStyle = gold; x.lineWidth = H * 0.035; x.strokeRect(X + H * 0.07, Y + H * 0.07, W - H * 0.14, H - H * 0.14);
    const font = SIGN_FONTS[s.font || 'kai'], size = fit(x, zh, font, H * 0.66, W - H * 0.6, 0.35);
    const lg = x.createLinearGradient(0, Y + H * 0.2, 0, Y + H * 0.8); lg.addColorStop(0, '#fff1b8'); lg.addColorStop(0.45, gold); lg.addColorStop(1, shade(gold, 0.62));
    x.fillStyle = lg; x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = H * 0.03; x.shadowOffsetY = H * 0.02;
    spaced(x, zh, X + W / 2, Y + H * 0.53, size, font, 0.35);
    if (s.since) { x.shadowBlur = 0; x.font = `${H * 0.11}px ${SIGN_FONTS.song}`; x.fillStyle = gold; x.textAlign = 'left'; x.fillText(s.since, X + H * 0.18, Y + H * 0.24); }
  } else if (st === 'deco') {
    const bg = s.bg || '#2a2119', fg = s.fg || '#efe2c4';
    x.fillStyle = bg; x.fillRect(X, Y, W, H);
    x.fillStyle = shade(bg, 1.5); x.fillRect(X, Y + H * 0.05, W, H * 0.025); x.fillRect(X, Y + H * 0.92, W, H * 0.025);
    const font = SIGN_FONTS[s.font || 'song'], size = fit(x, zh, font, H * (en ? 0.5 : 0.62), W * 0.9, 0.18);
    x.fillStyle = fg; spaced(x, zh, X + W / 2, Y + H * (en ? 0.4 : 0.52), size, font, 0.18);
    if (en) { const es = fit(x, en, SIGN_FONTS.song, H * 0.15, W * 0.86, 0.25); x.globalAlpha = 0.85; spaced(x, en.toUpperCase(), X + W / 2, Y + H * 0.79, es, SIGN_FONTS.song, 0.25); x.globalAlpha = 1; }
  } else if (st === 'letters' && s.logo && (!s.zh || /Apple/.test(s.en || ''))) {
    // a logo alone (Apple's), or a logo and a name, standing on the façade (or on a dark fascia band)
    if (s.board) { x.fillStyle = s.board; x.fillRect(X, Y, W, H); } else x.clearRect(X, Y, W, H);
    const text = /Apple/.test(s.en || '') ? '' : (s.en || '');
    if (!text) logo(x, s.logo, X + W / 2, Y + H / 2, H * 0.86, s.fg || '#f5f5f7', s.glow);
    else {
      const L = H * 0.7, font = SIGN_FONTS[s.font || 'hei'], ts = fit(x, text, font, H * 0.5, W * 0.92 - L - H * 0.3, 0.04);
      x.font = `${ts}px ${font}`; const tw = x.measureText(text).width, x0 = X + (W - (L + H * 0.3 + tw)) / 2;
      logo(x, s.logo, x0 + L / 2, Y + H / 2, L, s.fg || '#ffffff');
      x.fillStyle = s.fg || '#ffffff'; x.textAlign = 'left'; x.fillText(text, x0 + L + H * 0.3, Y + H * 0.54);
    }
  } else if (st === 'letters') {
    if (s.board) { x.fillStyle = s.board; x.fillRect(X, Y, W, H); } else x.clearRect(X, Y, W, H);
    const font = SIGN_FONTS[s.font || 'hei'], fg = s.fg || '#f5f5f5', size = fit(x, zh, font, H * (en ? 0.56 : 0.7), W * 0.94, 0.12);
    x.fillStyle = fg; x.shadowColor = s.glow || 'rgba(0,0,0,0)'; x.shadowBlur = s.glow ? H * 0.08 : 0;
    spaced(x, zh, X + W / 2, Y + H * (en ? 0.4 : 0.52), size, font, 0.12);
    if (en) { x.shadowBlur = 0; const es = fit(x, en, SIGN_FONTS.hei, H * 0.2, W * 0.9, 0.06); x.font = `${es}px ${SIGN_FONTS.hei}`; x.fillText(en, X + W / 2, Y + H * 0.82); }
  } else {
    // brand: a lightbox in the brand's colour
    const bg = s.bg || '#b8141c', fg = s.fg || '#ffffff';
    x.fillStyle = bg; x.fillRect(X, Y, W, H);
    const font = SIGN_FONTS[s.font || 'hei'];
    if (s.logo) {
      // the brand's mark, then its name
      const L = H * 0.62, zs = fit(x, zh, font, H * 0.5, W * 0.9 - L - H * 0.4, 0.06); x.font = `${zs}px ${font}`;
      const zw = x.measureText(zh).width + 0.06 * zs * ([...zh].length - 1), tot = L + H * 0.3 + zw, x0 = X + (W - tot) / 2;
      logo(x, s.logo, x0 + L / 2, Y + H / 2, L, s.logoFg || fg);
      x.fillStyle = fg; spaced(x, zh, x0 + L + H * 0.3 + zw / 2, Y + H * 0.53, zs, font, 0.06);
      if (en) { const es = fit(x, en, SIGN_FONTS.hei, H * 0.13, zw, 0.04); x.font = `${es}px ${SIGN_FONTS.hei}`; x.globalAlpha = 0.85; x.fillText(en, x0 + L + H * 0.3 + zw / 2, Y + H * 0.84); x.globalAlpha = 1; }
    } else if (en && W / H > 4.5) {
      // characters left of centre, the English to their right
      const zs = fit(x, zh, font, H * 0.62, W * 0.55, 0.08); x.font = `${zs}px ${font}`;
      const zw = x.measureText(zh).width + 0.08 * zs * ([...zh].length - 1), es = fit(x, en, SIGN_FONTS.hei, H * 0.3, W * 0.9 - zw - H * 0.5, 0.04);
      x.font = `${es}px ${SIGN_FONTS.hei}`; const ew = x.measureText(en).width, tot = zw + H * 0.35 + ew, x0 = X + (W - tot) / 2;
      x.fillStyle = fg; spaced(x, zh, x0 + zw / 2, Y + H * 0.54, zs, font, 0.08);
      x.font = `${es}px ${SIGN_FONTS.hei}`; x.textAlign = 'left'; x.fillText(en, x0 + zw + H * 0.35, Y + H * 0.56);
    } else {
      const zs = fit(x, zh, font, H * (en ? 0.5 : 0.64), W * 0.9, 0.08); x.fillStyle = fg; spaced(x, zh, X + W / 2, Y + H * (en ? 0.4 : 0.53), zs, font, 0.08);
      if (en) { const es = fit(x, en, SIGN_FONTS.hei, H * 0.18, W * 0.86, 0.04); x.font = `${es}px ${SIGN_FONTS.hei}`; x.fillText(en, X + W / 2, Y + H * 0.8); }
    }
  }
  x.restore();
}
// a vertical sign (characters stacked), plaque or neon
export function drawBlade(x, s, X, Y, W, H) {
  const chars = [...(s.blade || s.zh)].slice(0, 6), neon = s.bladeStyle === 'neon', fg = neon ? (s.neon || '#ff3b3b') : (s.fg || '#e2b65a');
  x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip();
  x.fillStyle = neon ? '#0b0b0d' : (s.bg || '#121010'); x.fillRect(X, Y, W, H);
  x.strokeStyle = fg; x.lineWidth = W * 0.05; x.strokeRect(X + W * 0.1, Y + W * 0.1, W * 0.8, H - W * 0.2);
  const font = SIGN_FONTS[neon ? 'hei' : (s.font || 'kai')], size = Math.min(W * 0.62, (H - W * 0.5) / chars.length * 0.86);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `${size}px ${font}`;
  if (neon) { x.shadowColor = fg; x.shadowBlur = W * 0.12; }
  chars.forEach((c, i) => x.fillText(c, X + W / 2, Y + W * 0.25 + (H - W * 0.5) * (i + 0.5) / chars.length));
  x.restore();
}
// a brand mark: a simple-icons path (24 x 24), centred at (cx, cy), `size` across
function logo(x, path, cx, cy, size, color, glow) {
  x.save(); x.translate(cx - size / 2, cy - size / 2); x.scale(size / 24, size / 24);
  x.fillStyle = color; if (glow) { x.shadowColor = glow; x.shadowBlur = 2; }
  x.fill(new Path2D(path)); x.restore();
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// An atlas of signs, in pages of W x H: add(spec, aspect) -> region [u0, v0, u1, v1, page]; draw() paints them
// (call again once the fonts are in). Rows of PX px; each sign as wide as its aspect asks, up to the width;
// a new page when one fills. textures[page] for the materials.
export function createSignAtlas(W = 4096, H = 2048) {
  const pages = [], items = [];
  let cx = 0, cy = 0, rowH = 0;
  const page = () => {
    const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (c) { c.width = W; c.height = H; }
    const tex = c ? new THREE.CanvasTexture(c) : null;
    if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; }
    pages.push({ c, tex });
  };
  page();
  return {
    get textures() { return pages.map((p) => p.tex); },
    get texture() { return pages[0].tex; },
    // a horizontal sign of the given width/height ratio, or a vertical one (blade: true)
    add(spec, aspect, { blade = false } = {}) {
      const h = Math.round(blade ? Math.min(PX * aspect, H) : PX), w = blade ? PX * 0.9 : Math.min(W, Math.round(PX * aspect));
      if (cx + w > W) { cx = 0; cy += rowH + 4; rowH = 0; }
      if (cy + h > H) { page(); cx = 0; cy = 0; rowH = 0; }
      const r = { spec, blade, page: pages.length - 1, X: cx, Y: cy, w, h };
      cx += w + 4; rowH = Math.max(rowH, h);
      items.push(r);
      return [r.X / W, 1 - (r.Y + r.h) / H, (r.X + r.w) / W, 1 - r.Y / H, r.page];
    },
    draw() {
      for (const p of pages) if (p.c) p.c.getContext('2d').clearRect(0, 0, W, H);
      for (const r of items) { const p = pages[r.page]; if (p.c) (r.blade ? drawBlade : drawSign)(p.c.getContext('2d'), r.spec, r.X, r.Y, r.w, r.h); }
      for (const p of pages) if (p.tex) p.tex.needsUpdate = true;
    },
    get used() { return { pages: pages.length, rows: cy + rowH, items: items.length }; },
  };
}
