import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const OUT_DIR = path.resolve('src/assets/icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const COLORS = {
  base: [0xF4, 0xA2, 0x61],
  baseDark: [0xE9, 0x8E, 0x4F],
  offWhite: [0xFF, 0xF4, 0xEC],
  shadow: [0x2B, 0x2B, 0x2B]
};

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function blend(dst, src, alpha) {
  const a = clamp01(alpha);
  return [
    Math.round(dst[0] + (src[0] - dst[0]) * a),
    Math.round(dst[1] + (src[1] - dst[1]) * a),
    Math.round(dst[2] + (src[2] - dst[2]) * a),
    Math.round(dst[3] + (255 - dst[3]) * a)
  ];
}

function degToRad(d) {
  return (d * Math.PI) / 180;
}

function angleInArc(angleDeg, startDeg, endDeg) {
  const a = (angleDeg + 360) % 360;
  const s = (startDeg + 360) % 360;
  const e = (endDeg + 360) % 360;
  if (s <= e) return a >= s && a <= e;
  return a >= s || a <= e;
}

function drawLine(pixels, w, h, x1, y1, x2, y2, thickness, color, alpha) {
  const minX = Math.floor(Math.min(x1, x2) - thickness - 1);
  const maxX = Math.ceil(Math.max(x1, x2) + thickness + 1);
  const minY = Math.floor(Math.min(y1, y2) - thickness - 1);
  const maxY = Math.ceil(Math.max(y1, y2) + thickness + 1);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  for (let y = minY; y <= maxY; y++) {
    if (y < 0 || y >= h) continue;
    for (let x = minX; x <= maxX; x++) {
      if (x < 0 || x >= w) continue;
      const px = x - x1;
      const py = y - y1;
      const t = clamp01((px * dx + py * dy) / len2);
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      const dist = Math.hypot(x - projX, y - projY);
      if (dist <= thickness) {
        const idx = (y * w + x) * 4;
        const dst = [pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]];
        const blended = blend(dst, color, alpha * (1 - dist / thickness));
        pixels[idx] = blended[0];
        pixels[idx + 1] = blended[1];
        pixels[idx + 2] = blended[2];
        pixels[idx + 3] = blended[3];
      }
    }
  }
}

function renderIcon(size) {
  const scale = 2;
  const w = size * scale;
  const h = size * scale;
  const pixels = new Uint8Array(w * h * 4);
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.5;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const t = clamp01(dist / (radius * 0.95));
      const col = mix(COLORS.base, COLORS.baseDark, t);
      const idx = (y * w + x) * 4;
      pixels[idx] = col[0];
      pixels[idx + 1] = col[1];
      pixels[idx + 2] = col[2];
      pixels[idx + 3] = 255;
    }
  }

  const ringOuter = radius * 0.62;
  const ringInner = radius * 0.48;
  const arcStart = 210;
  const arcEnd = 30;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < ringInner || dist > ringOuter) continue;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (!angleInArc(angle, arcStart, arcEnd)) continue;
      const idx = (y * w + x) * 4;
      const dst = [pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]];
      const blended = blend(dst, COLORS.offWhite, 1);
      pixels[idx] = blended[0];
      pixels[idx + 1] = blended[1];
      pixels[idx + 2] = blended[2];
      pixels[idx + 3] = blended[3];
    }
  }

  const dotAngle = degToRad(arcEnd);
  const dotR = (ringOuter + ringInner) / 2;
  const dotX = cx + Math.cos(dotAngle) * dotR;
  const dotY = cy + Math.sin(dotAngle) * dotR;
  const dotRadius = (ringOuter - ringInner) * 0.55;

  for (let y = Math.floor(dotY - dotRadius - 2); y <= Math.ceil(dotY + dotRadius + 2); y++) {
    if (y < 0 || y >= h) continue;
    for (let x = Math.floor(dotX - dotRadius - 2); x <= Math.ceil(dotX + dotRadius + 2); x++) {
      if (x < 0 || x >= w) continue;
      const dist = Math.hypot(x - dotX, y - dotY);
      if (dist <= dotRadius) {
        const idx = (y * w + x) * 4;
        const dst = [pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]];
        const blended = blend(dst, COLORS.offWhite, 1);
        pixels[idx] = blended[0];
        pixels[idx + 1] = blended[1];
        pixels[idx + 2] = blended[2];
        pixels[idx + 3] = blended[3];
      }
    }
  }

  const checkScale = radius * 0.35;
  const checkCenterX = cx + radius * 0.12;
  const checkCenterY = cy + radius * 0.05;
  const p1 = [checkCenterX - checkScale * 0.25, checkCenterY + checkScale * 0.05];
  const p2 = [checkCenterX - checkScale * 0.05, checkCenterY + checkScale * 0.28];
  const p3 = [checkCenterX + checkScale * 0.32, checkCenterY - checkScale * 0.18];
  const thickness = radius * 0.045;

  drawLine(pixels, w, h, p1[0] + 2, p1[1] + 2, p2[0] + 2, p2[1] + 2, thickness, COLORS.shadow, 0.25);
  drawLine(pixels, w, h, p2[0] + 2, p2[1] + 2, p3[0] + 2, p3[1] + 2, thickness, COLORS.shadow, 0.25);

  drawLine(pixels, w, h, p1[0], p1[1], p2[0], p2[1], thickness, COLORS.offWhite, 1);
  drawLine(pixels, w, h, p2[0], p2[1], p3[0], p3[1], thickness, COLORS.offWhite, 1);

  return downsample(pixels, w, h, size, size, scale);
}

function downsample(src, sw, sh, dw, dh, scale) {
  const dst = new Uint8Array(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const ix = x * scale + sx;
          const iy = y * scale + sy;
          const idx = (iy * sw + ix) * 4;
          r += src[idx];
          g += src[idx + 1];
          b += src[idx + 2];
          a += src[idx + 3];
        }
      }
      const samples = scale * scale;
      const o = (y * dw + x) * 4;
      dst[o] = Math.round(r / samples);
      dst[o + 1] = Math.round(g / samples);
      dst[o + 2] = Math.round(b / samples);
      dst[o + 3] = Math.round(a / samples);
    }
  }
  return dst;
}

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, pixels) {
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowLen = width * 4 + 1;
  const raw = Buffer.alloc(rowLen * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * rowLen + 1 + x * 4;
      raw[dstIdx] = pixels[srcIdx];
      raw[dstIdx + 1] = pixels[srcIdx + 1];
      raw[dstIdx + 2] = pixels[srcIdx + 2];
      raw[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  const idat = zlib.deflateSync(raw);

  const chunks = [
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ];

  return Buffer.concat([header, ...chunks]);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  ensureDir(OUT_DIR);
  for (const size of SIZES) {
    const pixels = renderIcon(size);
    const png = encodePNG(size, size, pixels);
    const filename = path.join(OUT_DIR, `icon-${size}.png`);
    fs.writeFileSync(filename, png);
    console.log(`wrote ${filename}`);
  }
}

main();
