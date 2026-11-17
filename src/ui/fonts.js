// The game's display type, injected once (relative to the page, so it works wherever the build is served).
// Licences: public/fonts/LICENSE.md. Subsets: every Chinese character the game uses.
const CSS = `/* The game's display type (licences: public/fonts/LICENSE.md). Subsets: every Chinese character the game uses.
   --rt-serif   Cormorant Garamond for Latin, Noto Serif SC for Chinese: titles, numbers, quotes
   --rt-deco    Limelight: the Bund's Art Deco (chapter numerals, small caps)
   --rt-thin    Poiret One: thin Deco letterspacing
   --rt-hand    Ji Bai's hand: Ma Shan Zheng / Caveat (the notebook's) */
@font-face { font-family: 'RT Serif Latin'; src: url('./fonts/serif-en-400-normal.woff2') format('woff2'); font-weight: 400; font-display: swap; }
@font-face { font-family: 'RT Serif Latin'; src: url('./fonts/serif-en-400-italic.woff2') format('woff2'); font-weight: 400; font-style: italic; font-display: swap; }
@font-face { font-family: 'RT Serif Latin'; src: url('./fonts/serif-en-600-normal.woff2') format('woff2'); font-weight: 600 900; font-display: swap; }
@font-face { font-family: 'RT Serif'; src: url('./fonts/serif-zh-400.woff2') format('woff2'); font-weight: 400; font-display: swap; }
@font-face { font-family: 'RT Serif'; src: url('./fonts/serif-zh-700.woff2') format('woff2'); font-weight: 600 900; font-display: swap; }
@font-face { font-family: 'RT Deco'; src: url('./fonts/deco.woff2') format('woff2'); font-display: swap; }
@font-face { font-family: 'RT Thin'; src: url('./fonts/deco-thin.woff2') format('woff2'); font-display: swap; }
@font-face { font-family: 'JB Hand'; src: url('./fonts/hand-zh.woff2') format('woff2'); font-display: swap; }
@font-face { font-family: 'JB Hand En'; src: url('./fonts/hand-en.woff2') format('woff2'); font-display: swap; }
:root {
  --rt-serif: 'RT Serif Latin', 'RT Serif', 'Songti SC', 'STSong', serif;
  --rt-deco: 'RT Deco', 'RT Serif', serif;
  --rt-thin: 'RT Thin', 'RT Serif Latin', 'RT Serif', serif;
  --rt-hand: 'JB Hand En', 'JB Hand', 'Kaiti SC', cursive;
  /* the Bund at night: river ink, gold leaf, the Peace Hotel's copper green, a seal's vermilion, paper */
  --rt-ink: #070b0f; --rt-river: #0b1a20; --rt-river-2: #10262d;
  --rt-gold: #c8a35a; --rt-gold-hi: #ecd49a; --rt-gold-lo: rgba(200, 163, 90, 0.32);
  --rt-jade: #4f8f7b; --rt-seal: #b3352a; --rt-paper: #efe5cf; --rt-paper-ink: #2b2a33;
}
`;
if (typeof document !== 'undefined' && !document.getElementById('rt-fonts')) { const s = document.createElement('style'); s.id = 'rt-fonts'; s.textContent = CSS; document.head.appendChild(s); }
