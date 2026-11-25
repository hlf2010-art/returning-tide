// Everything the game ships that someone else made, or that a tool made under its own terms, and the credit each
// one's licence asks for. Shown in Settings under "Credits" (index.html #credits, filled by main.js); the music has
// its own list (engine/speakers.js). tests/credits.test.mjs fails if a licensed asset ships without its entry here.
// Sources: README.md "Credits", docs/sound.md, public/models/cars/CREDITS.md, public/rooms/CREDITS.md,
// public/fonts/LICENSE.md, public/people/LICENSE-Rocketbox.md.
const B = (zh, en) => ({ zh, en });

export const CREDITS = [
  {
    id: 'kokoro',
    what: B('全部配音、收款播报、人群低语与晚上十点的惊叹声、地铁广播', 'Every voice, the payment speakers, the crowd\'s murmur and the 22:00 sigh, the metro announcements'),
    who: 'Kokoro-82M by hexgrad',
    licence: B('Apache-2.0', 'Apache-2.0'),
    url: 'https://huggingface.co/hexgrad/Kokoro-82M', licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    files: ['public/ambience/murmur.mp3', 'public/ambience/lights-out.mp3', 'public/ambience/pay', 'public/voice'],
  },
  {
    id: 'synth',
    what: B('背景环境声（车流、江水、船、风）与喘气声，由程序合成', 'The background beds (traffic, river, boats, wind) and Ji Bai\'s breathing, synthesised in code'),
    who: 'Made for this game (tools/voice/ambience.py, tools/voice/breath.py; the crowd bed layers the Kokoro murmur)',
    licence: B('随游戏', 'Part of the game'),
    url: null, licenceUrl: null,
    files: ['public/ambience/beds', 'public/ambience/breath'],
  },
  {
    id: 'byd-han',
    what: B('路上的电动轿车（去掉了厂标）', 'The electric saloons in traffic (badges removed)'),
    who: '"Byd Han" by MattDoesBlender (Sketchfab); changed: scaled, interior and badges removed, simplified',
    licence: B('CC BY 4.0', 'CC BY 4.0'),
    url: 'https://sketchfab.com/3d-models/f7ee6b12224543c38f17f9122b4f1eaf', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    files: ['public/models/cars/byd-han.glb', 'public/models/cars/byd-han-far.glb'],
  },
  {
    id: 'rocketbox',
    what: B('行人和部分角色的模型与动作', 'People and their animations'),
    who: 'Microsoft Rocketbox avatars, Copyright (c) 2020 Microsoft',
    licence: B('MIT', 'MIT'),
    url: 'https://github.com/microsoft/Microsoft-Rocketbox', licenceUrl: './people/LICENSE-Rocketbox.md',
    files: ['public/people/LICENSE-Rocketbox.md'],
  },
  {
    id: 'hunyuan',
    what: B('季白和顾念的 3D 模型（由角色设定图生成）', 'Ji Bai\'s and Gu Nian\'s 3D models (generated from their character sheets)'),
    who: 'Generated with Tencent Hunyuan 3D',
    licence: B('腾讯混元 3D 的使用条款', 'Tencent Hunyuan 3D terms'),
    url: null, licenceUrl: null,
    files: ['public/people/player.glb', 'public/people/gunian.glb'],
  },
  {
    id: 'osm',
    what: B('南京东路的店铺位置、陆家嘴的建筑轮廓与高度', 'Nanjing Road\'s shop positions, Lujiazui\'s building footprints and heights'),
    who: '© OpenStreetMap contributors',
    licence: B('ODbL 1.0', 'ODbL 1.0'),
    url: 'https://www.openstreetmap.org/copyright', licenceUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
    files: ['src/world/lujiazuiOsm.js', 'src/world/njShops.js'],
  },
  {
    id: 'polyhaven',
    what: B('路面、石材等照片材质，橱窗里的店内全景', 'Photographed surfaces, and the shop interiors seen through the windows'),
    who: 'Poly Haven',
    licence: B('CC0（公共领域）', 'CC0 (public domain)'),
    url: 'https://polyhaven.com', licenceUrl: 'https://polyhaven.com/license',
    files: ['public/textures', 'public/rooms'],
  },
  {
    id: 'fonts',
    what: B('字体：马善政、Caveat、思源宋体、思源黑体、Cormorant Garamond、Limelight、Poiret One、站酷小薇', 'Fonts: Ma Shan Zheng, Caveat, Noto Serif SC, Noto Sans SC, Cormorant Garamond, Limelight, Poiret One, ZCOOL XiaoWei'),
    who: 'Their authors (see the licence file)',
    licence: B('SIL Open Font License 1.1', 'SIL Open Font License 1.1'),
    url: 'https://openfontlicense.org', licenceUrl: './fonts/LICENSE.md',
    files: ['public/fonts'],
  },
  {
    id: 'east-is-red',
    what: B('海关大楼的报时曲《东方红》', 'The Customs House chimes, "The East Is Red"'),
    who: 'Traditional Shaanbei folk melody, played as synthesised chimes',
    licence: B('公共领域', 'Public domain'),
    url: null, licenceUrl: null,
    files: [],
  },
  {
    id: 'three',
    what: B('3D 引擎', 'The 3D engine'),
    who: 'three.js authors',
    licence: B('MIT', 'MIT'),
    url: 'https://threejs.org', licenceUrl: 'https://github.com/mrdoob/three.js/blob/dev/LICENSE',
    files: [],
  },
  {
    id: 'webllm',
    what: B('可选的浏览器内对话模型（开启时由浏览器下载，不随游戏分发）', 'The optional in-browser conversation model (downloaded by your browser when you turn it on; not bundled)'),
    who: 'WebLLM (MLC) running Qwen2.5-1.5B-Instruct',
    licence: B('Apache-2.0', 'Apache-2.0'),
    url: 'https://github.com/mlc-ai/web-llm', licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    files: [],
  },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const link = (text, href) => (href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text));

// the credits as <li> items, in a language ('zh' or 'en')
export function creditsHtml(lang = 'en') {
  const L = (b) => b[lang] || b.en;
  return CREDITS.map((c) => `<li>${esc(L(c.what))} · ${link(c.who, c.url)} · ${link(L(c.licence), c.licenceUrl)}</li>`).join('');
}
