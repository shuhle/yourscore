/**
 * SVG Icon Utility
 * Provides inline SVG icons to replace emojis throughout the app
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(content, size = 24) {
  return `<svg xmlns="${SVG_NS}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
}

function svgFilled(content, size = 24) {
  return `<svg xmlns="${SVG_NS}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="none">${content}</svg>`;
}

// --- Nav Icons ---

export function iconCalendarCheck(size = 24) {
  return svg(
    '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>' +
      '<line x1="16" y1="2" x2="16" y2="6"/>' +
      '<line x1="8" y1="2" x2="8" y2="6"/>' +
      '<line x1="3" y1="10" x2="21" y2="10"/>' +
      '<path d="M9 16l2 2 4-4"/>',
    size
  );
}

export function iconList(size = 24) {
  return svg(
    '<line x1="8" y1="6" x2="21" y2="6"/>' +
      '<line x1="8" y1="12" x2="21" y2="12"/>' +
      '<line x1="8" y1="18" x2="21" y2="18"/>' +
      '<line x1="3" y1="6" x2="3.01" y2="6"/>' +
      '<line x1="3" y1="12" x2="3.01" y2="12"/>' +
      '<line x1="3" y1="18" x2="3.01" y2="18"/>',
    size
  );
}

export function iconGrid(size = 24) {
  return svg(
    '<rect x="3" y="3" width="7" height="7"/>' +
      '<rect x="14" y="3" width="7" height="7"/>' +
      '<rect x="3" y="14" width="7" height="7"/>' +
      '<rect x="14" y="14" width="7" height="7"/>',
    size
  );
}

export function iconBarChart(size = 24) {
  return svg(
    '<line x1="12" y1="20" x2="12" y2="10"/>' +
      '<line x1="18" y1="20" x2="18" y2="4"/>' +
      '<line x1="6" y1="20" x2="6" y2="16"/>',
    size
  );
}

export function iconGear(size = 24) {
  return svg(
    '<circle cx="12" cy="12" r="3"/>' +
      '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    size
  );
}

// --- Achievement Icons ---

export function iconStar(size = 24) {
  return svgFilled(
    '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    size
  );
}

export function iconDoubleStar(size = 24) {
  return svgFilled(
    '<path d="M9 2l2.16 4.38L16 7.25l-3.5 3.41.83 4.82L9 13.19l-4.33 2.29.83-4.82L2 7.25l4.84-.87L9 2z"/>' +
      '<path d="M18 8l1.3 2.63L22 11.35l-2.1 2.05.5 2.89L18 14.91l-2.4 1.38.5-2.89-2.1-2.05 2.7-.72L18 8z" opacity="0.7"/>',
    size
  );
}

export function iconTrophy(size = 24) {
  return svgFilled(
    '<path d="M6 9a6 6 0 0 0 12 0V3H6v6zM4 3H2v3a4 4 0 0 0 4 4h.07A7.96 7.96 0 0 1 4 6V3zm16 0h2v3a4 4 0 0 1-4 4h-.07A7.96 7.96 0 0 0 20 6V3zM9 17h6v2H9v-2zm-2 4h10v2H7v-2z"/>',
    size
  );
}

export function iconFlame(size = 24) {
  return svgFilled(
    '<path d="M12 23c-3.866 0-7-3.134-7-7 0-3.037 2.166-5.568 3.5-7 .357-.383.5-.183.5.2 0 1.6.85 2.8 2 2.8.63 0 1-.45 1-1 0-1.5-.5-3-2-5 2 0 4.5 1.5 5.5 4 .178.445.5.3.5-.2 0-.82-.25-1.8-.75-2.8C17.25 9.5 19 12 19 16c0 3.866-3.134 7-7 7z"/>',
    size
  );
}

export function iconSparkle(size = 24) {
  return svgFilled(
    '<path d="M12 1l2.5 8.5L23 12l-8.5 2.5L12 23l-2.5-8.5L1 12l8.5-2.5L12 1z"/>',
    size
  );
}

export function iconArrowUp(size = 24) {
  return svg(
    '<circle cx="12" cy="12" r="10"/>' +
      '<polyline points="16 12 12 8 8 12"/>' +
      '<line x1="12" y1="16" x2="12" y2="8"/>',
    size
  );
}

export function iconFootsteps(size = 24) {
  return svgFilled(
    '<path d="M8 3C6.9 3 6 4.3 6 6c0 1.7.9 3 2 3s2-1.3 2-3c0-1.7-.9-3-2-3zm0 8c-1.7 0-3 1.1-4 3-.6 1.1 0 3 2 3s3.3-1.1 4-3c.6-1.1-0.3-3-2-3zm8-2c1.1 0 2-1.3 2-3s-.9-3-2-3-2 1.3-2 3 .9 3 2 3zm0 4c-1.7 0-3.4 1.1-2 3 1 1.9 2.3 3 4 3s2.6-1.9 2-3c-1-1.9-2.3-3-4-3z"/>',
    size
  );
}

export function iconChart(size = 24) {
  return svg(
    '<line x1="18" y1="20" x2="18" y2="10"/>' +
      '<line x1="12" y1="20" x2="12" y2="4"/>' +
      '<line x1="6" y1="20" x2="6" y2="14"/>' +
      '<line x1="2" y1="20" x2="22" y2="20"/>',
    size
  );
}

export function iconShield(size = 24) {
  return svgFilled(
    '<path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 15l-4-4 1.41-1.41L11 14.17l5.59-5.59L18 10l-7 7z"/>',
    size
  );
}

export function iconCheck(size = 24) {
  return svg('<polyline points="20 6 9 17 4 12"/>', size);
}

export function iconLock(size = 24) {
  return svg(
    '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>' +
      '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    size
  );
}

// --- Action Icons (shared between activities and categories views) ---

export const ACTION_ICONS = {
  up: `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 4l6 6h-4v6H8v-6H4l6-6z"></path>
    </svg>
  `,
  down: `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 16l-6-6h4V4h4v6h4l-6 6z"></path>
    </svg>
  `,
  edit: `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M14.69 3.86l1.45 1.45a2 2 0 010 2.83l-7.8 7.8-3.53.39.39-3.53 7.8-7.8a2 2 0 012.83 0z"></path>
      <path d="M3 17h14v2H3z"></path>
    </svg>
  `,
  archive: `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M3 5h14l-1 12H4L3 5zm2-3h10l1 3H4l1-3zm4 6v4h2V8H9z"></path>
    </svg>
  `,
  restore: `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 4a6 6 0 016 6h-2a4 4 0 10-4 4v2a6 6 0 010-12z"></path>
      <path d="M10 1l3 3-3 3V1z"></path>
    </svg>
  `,
  delete: `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M6 6h8l-1 11H7L6 6zm1-3h6l1 2H6l1-2zm2 4v6h2V7H9z"></path>
    </svg>
  `,
};

export function iconCalendar(size = 24) {
  return svg(
    '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>' +
      '<line x1="16" y1="2" x2="16" y2="6"/>' +
      '<line x1="8" y1="2" x2="8" y2="6"/>' +
      '<line x1="3" y1="10" x2="21" y2="10"/>',
    size
  );
}
