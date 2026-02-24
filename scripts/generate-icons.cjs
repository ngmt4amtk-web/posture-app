#!/usr/bin/env node
/**
 * generate-icons.js
 * Generates valid PNG icon files for PostureAI PWA using only Node.js built-in modules.
 *
 * Creates indigo (#6366F1) icons with a human silhouette motif,
 * at 192x192 and 512x512 sizes.
 *
 * PNG format: Signature (8B) + IHDR chunk + IDAT chunk(s) + IEND chunk
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

// ── Colour palette ────────────────────────────────────────────────
const BG = { r: 99, g: 102, b: 241 };   // indigo-500  #6366F1
const FG = { r: 255, g: 255, b: 255 };   // white

// ── 16x16 template bitmap ─────────────────────────────────────────
// 1 = foreground (white), 0 = background (indigo)
// Depicts a stylised human figure with posture alignment line
const TEMPLATE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0],
  [0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// ── Helpers ───────────────────────────────────────────────────────

function writeU32(buf, offset, value) {
  buf[offset]     = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>>  8) & 0xff;
  buf[offset + 3] = (value)        & 0xff;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = data.length;
  const buf = Buffer.alloc(4 + 4 + length + 4);

  writeU32(buf, 0, length);
  typeBytes.copy(buf, 4);
  data.copy(buf, 8);

  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = crc32(crcInput);
  writeU32(buf, 8 + length, crc);

  return buf;
}

function crc32(buf) {
  let crcTable = crc32._table;
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[n] = c;
    }
    crc32._table = crcTable;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── Pixel rendering ───────────────────────────────────────────────

function renderPixels(size) {
  const buf = Buffer.alloc(size * size * 4);
  const tplSize = TEMPLATE.length;
  const scale = size / tplSize;
  const cornerR = Math.round(size * 0.15);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tplX = Math.min(Math.floor(x / scale), tplSize - 1);
      const tplY = Math.min(Math.floor(y / scale), tplSize - 1);
      const isFg = TEMPLATE[tplY][tplX] === 1;

      // Rounded corner masking
      let inRoundedRect = true;
      if (x < cornerR && y < cornerR) {
        const dx = x - cornerR; const dy = y - cornerR;
        if (dx * dx + dy * dy > cornerR * cornerR) inRoundedRect = false;
      } else if (x > size - 1 - cornerR && y < cornerR) {
        const dx = x - (size - 1 - cornerR); const dy = y - cornerR;
        if (dx * dx + dy * dy > cornerR * cornerR) inRoundedRect = false;
      } else if (x < cornerR && y > size - 1 - cornerR) {
        const dx = x - cornerR; const dy = y - (size - 1 - cornerR);
        if (dx * dx + dy * dy > cornerR * cornerR) inRoundedRect = false;
      } else if (x > size - 1 - cornerR && y > size - 1 - cornerR) {
        const dx = x - (size - 1 - cornerR); const dy = y - (size - 1 - cornerR);
        if (dx * dx + dy * dy > cornerR * cornerR) inRoundedRect = false;
      }

      const idx = (y * size + x) * 4;
      if (!inRoundedRect) {
        buf[idx] = 0; buf[idx+1] = 0; buf[idx+2] = 0; buf[idx+3] = 0;
      } else if (isFg) {
        buf[idx] = FG.r; buf[idx+1] = FG.g; buf[idx+2] = FG.b; buf[idx+3] = 255;
      } else {
        buf[idx] = BG.r; buf[idx+1] = BG.g; buf[idx+2] = BG.b; buf[idx+3] = 255;
      }
    }
  }
  return buf;
}

// ── PNG assembly ──────────────────────────────────────────────────

function createPng(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  writeU32(ihdrData, 0, size);
  writeU32(ihdrData, 4, size);
  ihdrData[8]  = 8;   // bit depth
  ihdrData[9]  = 6;   // colour type: RGBA
  ihdrData[10] = 0;   // compression
  ihdrData[11] = 0;   // filter
  ihdrData[12] = 0;   // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  const pixels = renderPixels(size);
  const rowBytes = size * 4;
  const rawData = Buffer.alloc(size * (1 + rowBytes));

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + rowBytes);
    rawData[rowStart] = 0;  // filter: None
    pixels.copy(rawData, rowStart + 1, y * rowBytes, (y + 1) * rowBytes);
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// ── Main ──────────────────────────────────────────────────────────

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const sizes = [192, 512];
  for (const size of sizes) {
    const png = createPng(size);
    const filePath = path.join(OUTPUT_DIR, `icon-${size}.png`);
    fs.writeFileSync(filePath, png);
    console.log(`Created ${filePath} (${png.length} bytes, ${size}x${size})`);
  }

  // Also create an SVG version for high-quality scaling
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="76.8" fill="#6366F1"/>
  <circle cx="256" cy="120" r="48" fill="white"/>
  <rect x="244" y="168" width="24" height="24" fill="white"/>
  <rect x="224" y="192" width="64" height="120" rx="8" fill="white"/>
  <line x1="224" y1="210" x2="160" y2="270" stroke="white" stroke-width="24" stroke-linecap="round"/>
  <line x1="288" y1="210" x2="352" y2="270" stroke="white" stroke-width="24" stroke-linecap="round"/>
  <line x1="240" y1="312" x2="210" y2="430" stroke="white" stroke-width="24" stroke-linecap="round"/>
  <line x1="272" y1="312" x2="302" y2="430" stroke="white" stroke-width="24" stroke-linecap="round"/>
  <line x1="256" y1="60" x2="256" y2="450" stroke="#c7d2fe" stroke-width="3" stroke-dasharray="12,8" opacity="0.7"/>
</svg>`;
  const svgPath = path.join(OUTPUT_DIR, 'icon.svg');
  fs.writeFileSync(svgPath, svg);
  console.log(`Created ${svgPath}`);

  console.log('\nDone. Icons generated successfully.');
}

main();
