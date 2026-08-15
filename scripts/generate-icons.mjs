/**
 * Icon generation — no dependencies.
 *
 * The mark is the wheel reduced to its essentials: a rim, three spokes, a hub
 * and the pointer. Drawn analytically and rasterised with 3×3 supersampling,
 * then written as PNG via Node's built-in zlib. Keeping this in-repo means the
 * icons are reproducible and the project stays dependency-free.
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICON_DIR = path.join(ROOT, 'public', 'icons');
const SPLASH_DIR = path.join(ROOT, 'public', 'splash');

// ── the wordmark ─────────────────────────────────────────────────────────────

/**
 * SPILL, drawn as geometry.
 *
 * The icon is the wordmark and nothing else. There is no font rasteriser here
 * and no vendored font binary, so the five glyphs are constructed from
 * rectangles and rings — heavy, geometric, and identical in the PNGs and the
 * SVG because both are generated from these same numbers.
 *
 * Coordinates are in cap-height units: y = 0 is the cap line, y = 1 the
 * baseline, x grows to the right from each glyph's own origin.
 */
/**
 * The bowls are ellipses, not circles, and that is the whole trick.
 *
 * Two circular bowls stacked to fill the cap height are forced to an outer
 * radius of ~0.25, which leaves the counter at `2 × (0.25 − stem)`. At any
 * weight worth calling bold that closes to a slit. Widening the bowls
 * horizontally decouples the two: the vertical radius stays pinned by the cap
 * height while the horizontal radius opens the counter back up.
 *
 * Bowls are positioned by their outer edge rather than their centre, so a
 * bowl's left edge lines up with the stem's left edge and the counter opens to
 * the right of the stem instead of being buried inside it.
 */
const STEM = 0.155;

/**
 * Bowls are stroked slightly lighter than the stems, which is what real
 * typefaces do — a curve of equal measured width reads heavier than a straight
 * stem. It also buys back the counter space the curves need.
 */
const BOWL = 0.13;

// S: the vertical radius is a little over a quarter of the cap height, so the
// two bowls overlap and that overlap becomes the spine. At exactly 0.25 they are
// tangent and the waist pinches to a point; much more and the middle fills in.
const S_RX = 0.33;
const S_RY = 0.28;

const P_RX = 0.26;
const P_RY = 0.29;

const L_FOOT = 0.42;
const TRACKING = 0.1;

function inRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

/** Elliptical ring: inside the outer ellipse, outside the one inset by `BOWL`. */
function inRing(x, y, cx, cy, rx, ry) {
  const outerX = (x - cx) / rx;
  const outerY = (y - cy) / ry;
  if (outerX * outerX + outerY * outerY > 1) return false;

  const innerRx = rx - BOWL;
  const innerRy = ry - BOWL;
  if (innerRx <= 0 || innerRy <= 0) return true;

  const innerX = (x - cx) / innerRx;
  const innerY = (y - cy) / innerRy;
  return innerX * innerX + innerY * innerY >= 1;
}

const GLYPHS = {
  S: {
    width: 2 * S_RX,
    hit(x, y) {
      const cx = S_RX;
      const topY = S_RY;
      const bottomY = 1 - S_RY;

      // Upper bowl opens to the bottom-right, lower bowl to the top-left.
      if (inRing(x, y, cx, topY, S_RX, S_RY) && !(x > cx && y > topY)) return true;
      if (inRing(x, y, cx, bottomY, S_RX, S_RY) && !(x < cx && y < bottomY)) return true;
      return false;
    },
  },
  P: {
    width: 2 * P_RX,
    hit(x, y) {
      if (inRect(x, y, 0, 0, STEM, 1)) return true;
      return x >= P_RX && inRing(x, y, P_RX, P_RY, P_RX, P_RY);
    },
  },
  I: {
    width: STEM,
    hit(x, y) {
      return inRect(x, y, 0, 0, STEM, 1);
    },
  },
  L: {
    width: L_FOOT,
    hit(x, y) {
      return inRect(x, y, 0, 0, STEM, 1) || inRect(x, y, 0, 1 - STEM, L_FOOT, 1);
    },
  },
};

const WORD = 'SPILL';

/** Left edge of each glyph, plus the wordmark's total width in cap-height units. */
const LAYOUT = (() => {
  const offsets = [];
  let cursor = 0;
  for (const letter of WORD) {
    offsets.push({ letter, x: cursor });
    cursor += GLYPHS[letter].width + TRACKING;
  }
  return { offsets, width: cursor - TRACKING };
})();

/** True when the point is part of the white mark. `x`/`y` are in cap-height units. */
function inMark(x, y) {
  if (y < 0 || y > 1) return false;

  for (const { letter, x: offset } of LAYOUT.offsets) {
    const glyph = GLYPHS[letter];
    const local = x - offset;
    if (local < 0 || local > glyph.width) continue;
    if (glyph.hit(local, y)) return true;
  }

  return false;
}

/**
 * Renders RGBA pixels: a black canvas with the wordmark centred on it.
 *
 * `capHeight` is the cap height in pixels, which is the single knob that scales
 * the same geometry from a 32px favicon to a 1320px launch image. `centreY`
 * defaults to the middle but can be nudged so a launch image lines up with
 * wherever the app's own splash puts the wordmark.
 */
function renderCanvas(width, height, capHeight, centreY = height / 2) {
  const pixels = Buffer.alloc(width * height * 4);
  const samples = 3;

  const markWidth = LAYOUT.width * capHeight;
  const originX = (width - markWidth) / 2;
  const originY = centreY - capHeight / 2;

  // Rows and columns outside the wordmark's box are pure black, so the
  // supersampling loop is skipped for them — which is most of a launch image.
  const top = Math.floor(originY) - 1;
  const bottom = Math.ceil(originY + capHeight) + 1;
  const left = Math.floor(originX) - 1;
  const right = Math.ceil(originX + markWidth) + 1;

  for (let py = 0; py < height; py++) {
    const inBandY = py >= top && py <= bottom;

    for (let px = 0; px < width; px++) {
      const offset = (py * width + px) * 4;
      pixels[offset + 3] = 255;

      if (!inBandY || px < left || px > right) continue;

      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples - originX) / capHeight;
          const y = (py + (sy + 0.5) / samples - originY) / capHeight;
          if (inMark(x, y)) hits++;
        }
      }

      // Black ground, white mark — the identity is monochrome all the way down.
      const value = Math.round((255 * hits) / (samples * samples));
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
    }
  }

  return pixels;
}

/** Square icon: `scale` is the fraction of the icon width the wordmark spans. */
function render(size, scale) {
  return renderCanvas(size, size, (size * scale) / LAYOUT.width);
}

// ── PNG encoding ─────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with its filter byte (0 = none).
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── output ───────────────────────────────────────────────────────────────────

/** `scale` is the fraction of the icon's width that the wordmark spans. */
const TARGETS = [
  { file: 'icon-32.png', size: 32, scale: 0.86 },
  { file: 'icon-64.png', size: 64, scale: 0.84 },
  // iOS home-screen icons. iOS does not round-crop these, so the wordmark can
  // sit closer to the edge than a maskable icon allows.
  { file: 'apple-touch-icon-152.png', size: 152, scale: 0.78 },
  { file: 'apple-touch-icon-167.png', size: 167, scale: 0.78 },
  { file: 'apple-touch-icon-180.png', size: 180, scale: 0.78 },
  { file: 'icon-180.png', size: 180, scale: 0.8 },
  { file: 'icon-192.png', size: 192, scale: 0.8 },
  { file: 'icon-256.png', size: 256, scale: 0.8 },
  { file: 'icon-384.png', size: 384, scale: 0.8 },
  { file: 'icon-512.png', size: 512, scale: 0.8 },
  // Maskable icons get cropped to a platform-chosen shape, often a circle. A
  // 2.4:1 wordmark inscribed in the 80% safe circle has to come in to ~0.66 of
  // the width, or the first and last letters lose their outer edges.
  { file: 'maskable-192.png', size: 192, scale: 0.66 },
  { file: 'maskable-512.png', size: 512, scale: 0.66 },
];

mkdirSync(ICON_DIR, { recursive: true });

for (const { file, size, scale } of TARGETS) {
  writeFileSync(path.join(ICON_DIR, file), encodePng(size, size, render(size, scale)));
}

/**
 * iOS launch images.
 *
 * Safari only shows a launch image when there is an exact match for the
 * device's CSS size and pixel ratio — anything else falls back to a white
 * flash, which would be jarring against a pure-black app. Portrait only, since
 * the manifest locks orientation.
 */
export const LAUNCH_SCREENS = [
  { w: 320, h: 568, r: 2 }, // iPhone SE (1st gen)
  { w: 375, h: 667, r: 2 }, // SE 2/3, 8
  { w: 414, h: 736, r: 3 }, // 8 Plus
  { w: 375, h: 812, r: 3 }, // X, XS, 11 Pro, 12/13 mini
  { w: 414, h: 896, r: 2 }, // XR, 11
  { w: 414, h: 896, r: 3 }, // XS Max, 11 Pro Max
  { w: 390, h: 844, r: 3 }, // 12, 13, 14
  { w: 428, h: 926, r: 3 }, // 12/13 Pro Max, 14 Plus
  { w: 393, h: 852, r: 3 }, // 14 Pro, 15, 15 Pro, 16
  { w: 430, h: 932, r: 3 }, // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  { w: 402, h: 874, r: 3 }, // 16 Pro
  { w: 440, h: 956, r: 3 }, // 16 Pro Max
  { w: 744, h: 1133, r: 2 }, // iPad mini
  { w: 820, h: 1180, r: 2 }, // iPad Air
  { w: 1024, h: 1366, r: 2 }, // iPad Pro 12.9"
];

mkdirSync(SPLASH_DIR, { recursive: true });

const launchLinks = [];

for (const { w, h, r } of LAUNCH_SCREENS) {
  const width = w * r;
  const height = h * r;
  const file = `launch-${width}x${height}.png`;

  /**
   * Matched to the app's own splash so the handover is invisible: iOS shows
   * this image, the app boots behind it and renders the same wordmark at the
   * same size in the same place.
   *
   * The app sets the wordmark with `--display-lg`, i.e.
   * `clamp(3.25rem, 2rem + 6.2vw, 6rem)` against the device's CSS width, and
   * caps are roughly 0.72 of the font size in this family.
   */
  const fontSize = Math.min(96, Math.max(52, 32 + 0.062 * w));
  const capHeight = fontSize * 0.72 * r;

  writeFileSync(path.join(SPLASH_DIR, file), encodePng(width, height, renderCanvas(width, height, capHeight)));

  launchLinks.push({
    href: `/splash/${file}`,
    media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
  });
}

// Emitted as data so the layout can render the link tags without duplicating
// this device table in two places.
writeFileSync(path.join(ROOT, 'src', 'pwa', 'launch-screens.json'), JSON.stringify(launchLinks, null, 2), 'utf8');

/** A real .ico (a PNG in an ICO wrapper) for browsers and tools that insist on one. */
const icoPng = encodePng(32, 32, render(32, 0.92));
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type: icon
icoHeader.writeUInt16LE(1, 4); // image count
icoHeader.writeUInt8(32, 6); // width
icoHeader.writeUInt8(32, 7); // height
icoHeader.writeUInt8(0, 8); // palette size (0 = truecolour)
icoHeader.writeUInt8(0, 9); // reserved
icoHeader.writeUInt16LE(1, 10); // colour planes
icoHeader.writeUInt16LE(32, 12); // bits per pixel
icoHeader.writeUInt32LE(icoPng.length, 14);
icoHeader.writeUInt32LE(22, 18); // offset to the image data
writeFileSync(path.join(ROOT, 'public', 'favicon.ico'), Buffer.concat([icoHeader, icoPng]));

/**
 * Scalable favicon — the same geometry as vectors.
 *
 * Bowls are emitted as evenodd paths (outer ellipse, inner ellipse punched out)
 * clipped to the quadrants the letter uses. A *stroked* ellipse would not be
 * equivalent: its stroke is a constant width perpendicular to the curve,
 * whereas the raster predicate insets both radii by a stem. Building it this
 * way keeps the SVG and the PNGs the same shape.
 */
const SVG_SIZE = 100;
const svgScale = (SVG_SIZE * 0.86) / LAYOUT.width;
const svgOriginX = (SVG_SIZE - LAYOUT.width * svgScale) / 2;
const svgOriginY = (SVG_SIZE - svgScale) / 2;

const n = (value) => Number(value.toFixed(3));
const u = (value) => n(value * svgScale);

const shapes = [];
const clips = [];
let clipId = 0;

function ringPath(cx, cy, rx, ry) {
  const ellipse = (a, b) =>
    `M ${n(cx - a)} ${n(cy)} a ${n(a)} ${n(b)} 0 1 0 ${n(2 * a)} 0 a ${n(a)} ${n(b)} 0 1 0 ${n(-2 * a)} 0 Z`;
  return `${ellipse(rx, ry)} ${ellipse(rx - u(BOWL), ry - u(BOWL))}`;
}

/** Clips a bowl to a rectangular region, expressed in multiples of its radii. */
function clipToRects(cx, cy, rx, ry, rects) {
  const id = `c${clipId++}`;
  const body = rects
    .map(
      ([x0, y0, x1, y1]) =>
        `<rect x="${n(cx + x0 * rx)}" y="${n(cy + y0 * ry)}" width="${n((x1 - x0) * rx)}" height="${n((y1 - y0) * ry)}" />`,
    )
    .join('');
  clips.push(`<clipPath id="${id}">${body}</clipPath>`);
  return id;
}

for (const { letter, x: offset } of LAYOUT.offsets) {
  const ox = svgOriginX + offset * svgScale;
  const oy = svgOriginY;
  const rect = (x0, y0, x1, y1) =>
    `<rect x="${n(ox + x0 * svgScale)}" y="${n(oy + y0 * svgScale)}" width="${u(x1 - x0)}" height="${u(y1 - y0)}" fill="#fff" />`;

  if (letter === 'I') shapes.push(rect(0, 0, STEM, 1));

  if (letter === 'L') {
    shapes.push(rect(0, 0, STEM, 1));
    shapes.push(rect(0, 1 - STEM, L_FOOT, 1));
  }

  if (letter === 'P') {
    shapes.push(rect(0, 0, STEM, 1));
    const cx = ox + P_RX * svgScale;
    const cy = oy + P_RY * svgScale;
    const rx = u(P_RX);
    const ry = u(P_RY);
    const id = clipToRects(cx, cy, rx, ry, [[0, -1, 1, 1]]); // right half
    shapes.push(`<path d="${ringPath(cx, cy, rx, ry)}" fill="#fff" fill-rule="evenodd" clip-path="url(#${id})" />`);
  }

  if (letter === 'S') {
    const cx = ox + S_RX * svgScale;
    const rx = u(S_RX);
    const ry = u(S_RY);
    const topY = oy + S_RY * svgScale;
    const bottomY = oy + (1 - S_RY) * svgScale;

    // Upper bowl: all but the bottom-right quadrant. Lower bowl: the mirror.
    const topId = clipToRects(cx, topY, rx, ry, [
      [-1, -1, 0, 1],
      [0, -1, 1, 0],
    ]);
    const bottomId = clipToRects(cx, bottomY, rx, ry, [
      [0, -1, 1, 1],
      [-1, 0, 0, 1],
    ]);

    shapes.push(
      `<path d="${ringPath(cx, topY, rx, ry)}" fill="#fff" fill-rule="evenodd" clip-path="url(#${topId})" />`,
      `<path d="${ringPath(cx, bottomY, rx, ry)}" fill="#fff" fill-rule="evenodd" clip-path="url(#${bottomId})" />`,
    );
  }
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" role="img" aria-label="${WORD}">
  <defs>
    ${clips.join('\n    ')}
  </defs>
  <rect width="${SVG_SIZE}" height="${SVG_SIZE}" fill="#000" />
  ${shapes.join('\n  ')}
</svg>
`;

writeFileSync(path.join(ROOT, 'public', 'favicon.svg'), favicon, 'utf8');

console.log(
  `icons: ${TARGETS.length} PNGs, ${LAUNCH_SCREENS.length} launch images, favicon.svg + favicon.ico written to public/`,
);
