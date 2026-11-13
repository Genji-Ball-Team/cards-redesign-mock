// Inline SVG icons, 24px grid, stroked with currentColor.
const svg = (body) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  prev: svg(`<path d="M15 5l-7 7 7 7"/>`),
  next: svg(`<path d="M9 5l7 7-7 7"/>`),
  flip: svg(`<path d="M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4"/><path d="M20 12a8 8 0 0 1-14 5.3"/><path d="M6 21v-4h4"/>`),
  sound: svg(`<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>`),
  muted: svg(`<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M16 9.5l5 5"/><path d="M21 9.5l-5 5"/>`),
  flipAll: svg(`<rect x="3" y="6" width="9" height="13" rx="1.5"/><path d="M15 6h4.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M7.5 3.5h7"/>`),
  done: svg(`<path d="M5 12.5l4.5 4.5L19 7.5"/>`),
  depth: svg(`<rect x="3.5" y="5" width="13" height="15" rx="1.5"/><path d="M7.5 5V3.5h13V17.5H16.5"/><path d="M7 15l3-3 2 2 2.5-3"/>`),
  tilt: svg(`<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M3 9c-1 2-1 4 0 6"/><path d="M21 9c1 2 1 4 0 6"/><path d="M11 18.5h2"/>`),
};

// The Genji Ball mark (same geometry as favicon.svg), sized by CSS.
export const logo = `<svg viewBox="0 0 32 32" aria-hidden="true"><mask id="gb-slice"><rect width="32" height="32" fill="#fff"/><path d="M4 24.4 28 7.6" stroke="#000" stroke-width="3.5" stroke-linecap="round"/></mask><circle cx="16" cy="16" r="13" fill="currentColor" mask="url(#gb-slice)"/></svg>`;
