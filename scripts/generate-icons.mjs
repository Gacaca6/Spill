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

// ── geometry (normalised to a unit circle centred at 0,0) ────────────────────

const RIM_OUTER = 0.86;
const RIM_INNER = 0.78;
const HUB = 0.12;
const SPOKE_INNER = 0.2;
const SPOKE_OUTER = 0.78;
const SPOKE_HALF_WIDTH = 0.035;
const SPOKE_ANGLES = [90, 210, 330];

const POINTER_APEX = -0.72;
const POINTER_BASE = -1.0;
const POINTER_HALF = 0.085;

/** True when the point is part of the white mark. */
function inMark(x, y) {
  const d = Math.hypot(x, y);

  if (d >= RIM_INNER && d <= RIM_OUTER) return true;
  if (d <= HUB) return true;

  // Spokes, as projections onto each spoke's direction vector. Doing this with
  // angles instead invites wrap-around bugs at the ±π boundary, which turn thin
  // lines into filled wedges.
  for (const spoke of SPOKE_ANGLES) {
    const rad = (spoke * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const along = x * dx + y * dy;
    const perpendicular = Math.abs(x * dy - y * dx);
    if (along >= SPOKE_INNER && along <= SPOKE_OUTER && perpendicular <= SPOKE_HALF_WIDTH) return true;
  }

  // Pointer: a triangle above the rim, apex pointing into the wheel.
  if (y >= POINTER_BASE && y <= POINTER_APEX) {
    const progress = (y - POINTER_BASE) / (POINTER_APEX - POINTER_BASE);
    const halfWidth = POINTER_HALF * (1 - progress);
    if (Math.abs(x) <= halfWidth) return true;
  }

  return false;
}

/**
 * Renders RGBA pixels on an arbitrary canvas with the mark centred.
 *
 * `markRadius` is the radius in pixels that the unit circle maps to, which is
 * what lets the same geometry produce a tight app icon, a padded maskable icon
 * and a mostly-empty phone-sized launch image.
 */
function renderCanvas(width, height, markRadius) {
  const pixels = Buffer.alloc(width * height * 4);
  const samples = 3;
  const cx = width / 2;
  const cy = height / 2;

  // Everything outside this radius is guaranteed black, so the supersampling
  // loop can be skipped entirely — which matters on a 1320×2868 launch image.
  const bound = markRadius * 1.05;

  for (let py = 0; py < height; py++) {
    const dy = py + 0.5 - cy;

    for (let px = 0; px < width; px++) {
      const dx = px + 0.5 - cx;
      const offset = (py * width + px) * 4;
      pixels[offset + 3] = 255;

      if (Math.abs(dx) > bound || Math.abs(dy) > bound) continue;

      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples - cx) / markRadius;
          const y = (py + (sy + 0.5) / samples - cy) / markRadius;
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

/** Square icon: `scale` is the fraction of the half-width the mark occupies. */
function render(size, scale) {
  return renderCanvas(size, size, (size / 2) * scale);
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

const TARGETS = [
  { file: 'icon-32.png', size: 32, scale: 0.92 },
  { file: 'icon-64.png', size: 64, scale: 0.9 },
  // iOS home-screen icons. iOS does not round-crop these, so the mark can sit
  // closer to the edge than a maskable icon allows.
  { file: 'apple-touch-icon-152.png', size: 152, scale: 0.82 },
  { file: 'apple-touch-icon-167.png', size: 167, scale: 0.82 },
  { file: 'apple-touch-icon-180.png', size: 180, scale: 0.82 },
  { file: 'icon-180.png', size: 180, scale: 0.86 },
  { file: 'icon-192.png', size: 192, scale: 0.86 },
  { file: 'icon-256.png', size: 256, scale: 0.86 },
  { file: 'icon-384.png', size: 384, scale: 0.86 },
  { file: 'icon-512.png', size: 512, scale: 0.86 },
  // Maskable icons are cropped to a platform-chosen shape; 0.62 keeps the whole
  // mark inside the 80% safe zone even under an aggressive circular mask.
  { file: 'maskable-192.png', size: 192, scale: 0.62 },
  { file: 'maskable-512.png', size: 512, scale: 0.62 },
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
  // Mark sized against the narrow edge so it reads the same on every device.
  const markRadius = Math.round(width * 0.19);
  const file = `launch-${width}x${height}.png`;

  writeFileSync(path.join(SPLASH_DIR, file), encodePng(width, height, renderCanvas(width, height, markRadius)));

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

/** Scalable favicon, same geometry expressed as vectors. */
const spokes = SPOKE_ANGLES.map((angle) => {
  const rad = (angle * Math.PI) / 180;
  const x1 = (50 + 50 * SPOKE_INNER * 0.86 * Math.cos(rad)).toFixed(2);
  const y1 = (50 + 50 * SPOKE_INNER * 0.86 * Math.sin(rad)).toFixed(2);
  const x2 = (50 + 50 * SPOKE_OUTER * 0.86 * Math.cos(rad)).toFixed(2);
  const y2 = (50 + 50 * SPOKE_OUTER * 0.86 * Math.sin(rad)).toFixed(2);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="2.4" />`;
}).join('\n    ');

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="SPILL">
  <rect width="100" height="100" fill="#000" />
  <g>
    <circle cx="50" cy="50" r="${(50 * ((RIM_OUTER + RIM_INNER) / 2) * 0.86).toFixed(2)}" fill="none" stroke="#fff" stroke-width="${(50 * (RIM_OUTER - RIM_INNER) * 0.86).toFixed(2)}" />
    ${spokes}
    <circle cx="50" cy="50" r="${(50 * HUB * 0.86).toFixed(2)}" fill="#fff" />
    <path d="M50 ${(50 + 50 * POINTER_APEX * 0.86).toFixed(2)} L${(50 - 50 * POINTER_HALF * 0.86).toFixed(2)} ${(50 + 50 * POINTER_BASE * 0.86).toFixed(2)} L${(50 + 50 * POINTER_HALF * 0.86).toFixed(2)} ${(50 + 50 * POINTER_BASE * 0.86).toFixed(2)} Z" fill="#fff" />
  </g>
</svg>
`;

writeFileSync(path.join(ROOT, 'public', 'favicon.svg'), favicon, 'utf8');

console.log(
  `icons: ${TARGETS.length} PNGs, ${LAUNCH_SCREENS.length} launch images, favicon.svg + favicon.ico written to public/`,
);
