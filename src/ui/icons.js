// Line icons for the UI (24-unit grid, 1.6 stroke, round caps): original drawings in the common
// outline idiom, drawn as inline SVG so they take the text colour. icon(name, label) -> markup;
// with a label it is announced to screen readers and shown as a tooltip.
const P = {
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2.2-6.2L10 11l3.2-3 2.3 3.6 3 1.2M12.2 14.8L15 21M9 11.5l-2.5 2.4"/>',
  run: '<circle cx="15" cy="4.5" r="1.8"/><path d="M4 12.5l3.5-.5 3-3.5 3.5 1.5 2 3.5 3.5.5M10.5 8.5l-1.8 5.5 3.3 2.5-1.5 5M8.7 14l-4 4.5"/>',
  jump: '<path d="M12 19V5M6.5 10.5L12 5l5.5 5.5M5 21h14"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 013 0V12m0-6.5V4.5a1.5 1.5 0 013 0V12m0-5.5a1.5 1.5 0 013 0V14a7 7 0 01-7 7h-.5a6 6 0 01-5-2.7L4.3 15.5a1.6 1.6 0 012.6-1.8L8 15"/>',
  map: '<path d="M9 4.5L3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2zM9 4.5v13M15 6.5v13"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/><path d="M10.5 18.5h3"/>',
  book: '<path d="M4 5.5A2 2 0 016 3.5h13v15H6a2 2 0 00-2 2zM4 5.5v15M8 7.5h7"/>',
  menu: '<path d="M4.5 7h15M4.5 12h15M4.5 17h15"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/><circle cx="12" cy="12" r="6.6"/>',
  monitor: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M9 20h6M12 16.5V20"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  folder: '<path d="M3.5 7a2 2 0 012-2h4l2 2.2h7a2 2 0 012 2V17a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0112 0M16 4.8a3.2 3.2 0 010 6.4M18 14a5.5 5.5 0 013 6"/>',
  aperture: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5l3.5 6M20.3 10.5l-6.8.5M17.5 18.5l-3.5-6M6.5 18.5l3.5-6M3.7 10.5l6.8.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
};
export function icon(name, label = '') {
  const d = P[name]; if (!d) return label;
  const a = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
  return `<svg class="ico ico-${name}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"${a}>${label ? `<title>${label}</title>` : ''}${d}</svg>`;
}
export const ICON_NAMES = Object.keys(P);
