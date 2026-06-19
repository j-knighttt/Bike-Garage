/**
 * Generates the PWA / home-screen icons as real PNG files — no image libraries,
 * just Node's zlib. Draws an on-brand orange tile with a simple white bike
 * wheel (rim + hub + spokes).
 *
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const ORANGE = [0xfc, 0x4c, 0x02];
const WHITE = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, pixels /* RGBA Uint8Array */) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10..12 = compression/filter/interlace = 0
  // Add filter byte (0) at the start of each scanline.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy
      ? pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
      : Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.34;
  const rInner = size * 0.27;
  const rHub = size * 0.07;
  const spokeW = size * 0.022;

  const set = (x, y, [r, g, b]) => {
    const i = (y * size + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      let color = ORANGE;

      // Rim (ring between inner and outer radius).
      if (d <= rOuter && d >= rInner) color = WHITE;
      // Hub.
      if (d <= rHub) color = WHITE;
      // Spokes (4, at 0/45/90/135 degrees) within the wheel.
      if (d < rInner && d > rHub) {
        const onH = Math.abs(dy) <= spokeW;
        const onV = Math.abs(dx) <= spokeW;
        const onD1 = Math.abs(dx - dy) <= spokeW * 1.4;
        const onD2 = Math.abs(dx + dy) <= spokeW * 1.4;
        if (onH || onV || onD1 || onD2) color = WHITE;
      }
      set(x, y, color);
    }
  }
  return px;
}

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 64 },
];

for (const { name, size } of sizes) {
  const png = encodePng(size, drawIcon(size));
  writeFileSync(join(OUT, name), png);
  console.log(`wrote public/icons/${name} (${size}x${size}, ${png.length} bytes)`);
}
