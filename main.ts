// Sun Breaking Its Frame — ai-excited-01 entry.
// A program that draws one 1024x1024 PNG with Node 22 standard library only.
// No network, no dependencies: a hand-rolled PNG encoder (zlib deflate + CRC32),
// drawn at 2x supersampling and downsampled for clean edges.
//
// The picture: a pale paper sheet with a neat grey dot grid held inside a
// thick black frame. One huge vermilion sun is the only thing that escaped:
// it punches through the frame's top-right corner, flinging two black
// fragments off, and four cyan speed bars streak down-left from the breach
// at about 35 degrees. Under the frame, in block pixel letters: BREAK THE FRAME.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------- palette ----------
const PAPER = [244, 239, 230];
const INK = [13, 13, 13];
const SUN = [255, 75, 31];
const CYAN = [0, 194, 255];
const DOT = [201, 194, 180];

// ---------- geometry (final 1024 canvas) ----------
const W = 1024;
const H = 1024;
const SS = 2; // supersampling factor
const SW = W * SS;
const SH = H * SS;
const FRAME_INSET = 90;
const FRAME_STROKE = 40;
const SUN_CX = 660;
const SUN_CY = 350;
const SUN_R = 280;

// ---------- pixel buffer ----------
const buf = new Uint8Array(SW * SH * 3);
for (let i = 0; i < SW * SH; i++) {
  buf[i * 3] = PAPER[0];
  buf[i * 3 + 1] = PAPER[1];
  buf[i * 3 + 2] = PAPER[2];
}

function setPx(x: number, y: number, c: number[]) {
  if (x < 0 || y < 0 || x >= SW || y >= SH) return;
  const o = (y * SW + x) * 3;
  buf[o] = c[0];
  buf[o + 1] = c[1];
  buf[o + 2] = c[2];
}

// Fill an axis-aligned rectangle, coordinates in final pixels.
function fillRect(x0: number, y0: number, x1: number, y1: number, c: number[]) {
  const a = Math.max(0, Math.round(x0 * SS));
  const b = Math.max(0, Math.round(y0 * SS));
  const d = Math.min(SW, Math.round(x1 * SS));
  const e = Math.min(SH, Math.round(y1 * SS));
  for (let y = b; y < e; y++) {
    for (let x = a; x < d; x++) setPx(x, y, c);
  }
}

// Fill a circle, coordinates in final pixels.
function fillCircle(cx: number, cy: number, r: number, c: number[]) {
  const x0 = Math.max(0, Math.floor((cx - r) * SS));
  const x1 = Math.min(SW - 1, Math.ceil((cx + r) * SS));
  const y0 = Math.max(0, Math.floor((cy - r) * SS));
  const y1 = Math.min(SH - 1, Math.ceil((cy + r) * SS));
  const ccx = cx * SS;
  const ccy = cy * SS;
  const rr = r * SS;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - ccx;
      const dy = y + 0.5 - ccy;
      if (dx * dx + dy * dy <= rr * rr) setPx(x, y, c);
    }
  }
}

// Fill a convex polygon (array of [x, y] in final pixels) with a scanline fill.
function fillPoly(pts: number[][], c: number[]) {
  const ys = pts.map((p) => p[1]);
  const yMin = Math.max(0, Math.floor(Math.min(...ys) * SS));
  const yMax = Math.min(SH - 1, Math.ceil(Math.max(...ys) * SS));
  for (let y = yMin; y <= yMax; y++) {
    const fy = (y + 0.5) / SS;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= fy && b[1] > fy) || (b[1] <= fy && a[1] > fy)) {
        const t = (fy - a[1]) / (b[1] - a[1]);
        xs.push((a[0] + t * (b[0] - a[0])) * SS);
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.max(0, Math.ceil(xs[k]));
      const x1 = Math.min(SW - 1, Math.floor(xs[k + 1]));
      for (let x = x0; x <= x1; x++) setPx(x, y, c);
    }
  }
}

// A rotated rectangle centred at (cx, cy), size w x h, rotated by degrees.
function fillRotatedRect(cx: number, cy: number, w: number, h: number, deg: number, c: number[]) {
  const a = (deg * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const hw = w / 2;
  const hh = h / 2;
  const corners = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([dx, dy]) => [cx + dx * ca - dy * sa, cy + dx * sa + dy * ca]);
  fillPoly(corners, c);
}

// A tapered speed bar: a quad from a wide start to a narrow tip.
function speedBar(
  sx: number, sy: number, // start centre (final px)
  ex: number, ey: number, // tip centre
  w0: number, w1: number, // widths at start / tip
  c: number[],
) {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  const px = -dy / len;
  const py = dx / len;
  fillPoly(
    [
      [sx + (px * w0) / 2, sy + (py * w0) / 2],
      [sx - (px * w0) / 2, sy - (py * w0) / 2],
      [ex - (px * w1) / 2, ey - (py * w1) / 2],
      [ex + (px * w1) / 2, ey + (py * w1) / 2],
    ],
    c,
  );
}

// ---------- 5x7 pixel font (only the letters we need) ----------
const GLYPHS: Record<string, string[]> = {
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function drawText(text: string, x0: number, y0: number, cell: number, c: number[]) {
  const adv = 6 * cell; // 5 columns + 1 column gap
  for (let i = 0; i < text.length; i++) {
    const g = GLYPHS[text[i]];
    if (!g) continue;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (g[row][col] === '1') {
          fillRect(x0 + i * adv + col * cell, y0 + row * cell, x0 + i * adv + (col + 1) * cell, y0 + (row + 1) * cell, c);
        }
      }
    }
  }
}

// ---------- draw the scene ----------
// 1. Neat dot grid, contained inside the frame.
const inner0 = FRAME_INSET + FRAME_STROKE;
const inner1 = W - FRAME_INSET - FRAME_STROKE;
for (let gy = inner0 + 32; gy < inner1; gy += 64) {
  for (let gx = inner0 + 32; gx < inner1; gx += 64) {
    fillCircle(gx, gy, 5, DOT);
  }
}

// 2. The sun — the only thing that escapes.
fillCircle(SUN_CX, SUN_CY, SUN_R, SUN);

// 3. Cyan speed bars streaking down-left from the breach, across the sun.
//    The lead bar is the longest and widest, so the eye follows it out.
speedBar(818, 268, 238, 652, 22, 3, CYAN);
speedBar(798, 318, 330, 648, 15, 3, CYAN);
speedBar(772, 366, 392, 660, 12, 2, CYAN);
speedBar(742, 412, 448, 668, 9, 2, CYAN);

// 4. The frame, in four bars — with a real gap where the sun breaks out
//    through the TOP-RIGHT CORNER itself: the top bar ends at x 560 and the
//    right bar's upper stub ends at y 200, so the whole corner is gone and
//    the sun bursts out through it. The lower right bar resumes at y 462.
const F0 = FRAME_INSET;
const F1 = W - FRAME_INSET;
fillRect(F0, F0, 560, F0 + FRAME_STROKE, INK); // top, left segment only
fillRect(F0, F0, F0 + FRAME_STROKE, F1, INK); // left, full
fillRect(F0, F1 - FRAME_STROKE, F1, F1, INK); // bottom, full
fillRect(F1 - FRAME_STROKE, F0, F1, 200, INK); // right, short upper stub
fillRect(F1 - FRAME_STROKE, 462, F1, F1, INK); // right, lower segment

// 5. Two black frame fragments flung off beside the breach, top-right.
fillRotatedRect(962, 58, 44, 16, -28, INK);
fillRotatedRect(996, 26, 34, 13, -28, INK);

// 6. The words, on the paper strip below the frame.
const TEXT = 'BREAK THE FRAME';
const CELL = 8;
const textW = TEXT.length * 6 * CELL - CELL;
drawText(TEXT, Math.round((W - textW) / 2), 952, CELL, INK);

// ---------- downsample 2x -> 1024x1024 ----------
const out = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let dy = 0; dy < SS; dy++) {
      for (let dx = 0; dx < SS; dx++) {
        const o = ((y * SS + dy) * SW + (x * SS + dx)) * 3;
        r += buf[o];
        g += buf[o + 1];
        b += buf[o + 2];
      }
    }
    const o = (y * W + x) * 3;
    out[o] = Math.round(r / (SS * SS));
    out[o + 1] = Math.round(g / (SS * SS));
    out[o + 2] = Math.round(b / (SS * SS));
  }
}

// ---------- PNG encoder ----------
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0; // filter: none
  out.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type: RGB
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), png);
