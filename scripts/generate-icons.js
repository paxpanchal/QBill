// Pure Node.js script to create valid PNG icons from scratch using built-in zlib & fs
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function createSolidPng(width, height, r, g, b, a = 255) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits per channel
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Compression method
  ihdrData.writeUInt8(0, 11); // Filter method
  ihdrData.writeUInt8(0, 12); // Interlace method
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image scanlines
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      // Calculate nice gradient and center emblem
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      const maxRadius = width / 2;

      // Card boundary
      const cardMargin = width * 0.18;
      const inCard = (
        x >= cardMargin &&
        x <= width - cardMargin &&
        y >= cardMargin &&
        y <= height - cardMargin
      );

      if (inCard) {
        // Indigo emblem card with light highlight
        rawData[pxOffset] = 79;      // R
        rawData[pxOffset + 1] = 70;  // G
        rawData[pxOffset + 2] = 229; // B
        rawData[pxOffset + 3] = 255; // A
      } else {
        // Deep Indigo/Slate Background
        const ratio = y / height;
        rawData[pxOffset] = Math.round(30 * (1 - ratio) + 15 * ratio);   // R
        rawData[pxOffset + 1] = Math.round(27 * (1 - ratio) + 23 * ratio); // G
        rawData[pxOffset + 2] = Math.round(75 * (1 - ratio) + 42 * ratio); // B
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  // Deflate IDAT data
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 implementation
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[i] = c;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createSolidPng(192, 192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createSolidPng(512, 512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createSolidPng(512, 512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createSolidPng(180, 180));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), createSolidPng(64, 64));

console.log('Successfully generated PWA icon PNGs in /public directory!');
