// Build the favicons from the crest artwork in public/brand.
//
// No dependencies: decodes the source PNG with zlib, trims its transparent
// edges, area-resamples it, composites onto a square canvas and re-encodes.
//
//   npm run icons
//
// Re-run this after replacing ube-logo-black.png or ube-logo-white.png.
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

/* ------------------------------------------------------------------ */
/* CRC32                                                               */
/* ------------------------------------------------------------------ */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ */
/* Decode                                                              */
/* ------------------------------------------------------------------ */
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePNG(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) throw new Error('not a PNG');
  }

  let pos = 8;
  let ihdr = null;
  const idat = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }

  if (!ihdr) throw new Error('no IHDR');
  if (ihdr.bitDepth !== 8) throw new Error(`unsupported bit depth ${ihdr.bitDepth}`);
  if (ihdr.interlace !== 0) throw new Error('interlaced PNG not supported');
  const ch = CHANNELS[ihdr.colorType];
  if (!ch || ihdr.colorType === 3) throw new Error(`unsupported colour type ${ihdr.colorType}`);

  const { width, height } = ihdr;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const out = Buffer.alloc(stride * height);

  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const row = raw.subarray(rp, rp + stride);
    rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= ch ? prev[x - ch] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      cur[x] = v & 0xff;
    }
  }

  // Normalise everything to RGBA.
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * ch;
    const d = i * 4;
    if (ihdr.colorType === 6) {
      rgba[d] = out[s]; rgba[d + 1] = out[s + 1]; rgba[d + 2] = out[s + 2]; rgba[d + 3] = out[s + 3];
    } else if (ihdr.colorType === 2) {
      rgba[d] = out[s]; rgba[d + 1] = out[s + 1]; rgba[d + 2] = out[s + 2]; rgba[d + 3] = 255;
    } else if (ihdr.colorType === 0) {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = out[s]; rgba[d + 3] = 255;
    } else {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = out[s]; rgba[d + 3] = out[s + 1];
    }
  }

  return { width, height, data: rgba };
}

/* ------------------------------------------------------------------ */
/* Encode                                                              */
/* ------------------------------------------------------------------ */
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG({ width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    Buffer.from(data.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type RGBA
  ihdr[10] = 0;  // deflate
  ihdr[11] = 0;  // adaptive filtering
  ihdr[12] = 0;  // non-interlaced

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ */
/* Trim, resample, compose                                             */
/* ------------------------------------------------------------------ */

/** Crops away fully transparent edges so the margin we add is the real one. */
function trim(img) {
  const { width, height, data } = img;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return img;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((y + minY) * width + (x + minX)) * 4;
      const d = (y * w + x) * 4;
      out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3];
    }
  }
  return { width: w, height: h, data: out };
}

/** Area-average resample. Premultiplies so transparent edges stay clean. */
function resample(img, tw, th) {
  const { width: sw, height: sh, data } = img;
  const out = new Uint8ClampedArray(tw * th * 4);
  const xr = sw / tw;
  const yr = sh / th;

  for (let y = 0; y < th; y++) {
    const y0 = y * yr;
    const y1 = Math.min(sh, (y + 1) * yr);
    for (let x = 0; x < tw; x++) {
      const x0 = x * xr;
      const x1 = Math.min(sw, (x + 1) * xr);
      let r = 0, g = 0, b = 0, a = 0, wsum = 0;

      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        const wy = Math.min(y1, sy + 1) - Math.max(y0, sy);
        if (wy <= 0) continue;
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const wx = Math.min(x1, sx + 1) - Math.max(x0, sx);
          if (wx <= 0) continue;
          const w = wx * wy;
          const s = (sy * sw + sx) * 4;
          const sa = data[s + 3] / 255;
          r += data[s] * sa * w;
          g += data[s + 1] * sa * w;
          b += data[s + 2] * sa * w;
          a += data[s + 3] * w;
          wsum += w;
        }
      }

      const d = (y * tw + x) * 4;
      if (wsum === 0 || a === 0) {
        out[d] = out[d + 1] = out[d + 2] = out[d + 3] = 0;
      } else {
        const alpha = a / wsum;
        const un = alpha / 255;
        out[d] = Math.round(r / wsum / un);
        out[d + 1] = Math.round(g / wsum / un);
        out[d + 2] = Math.round(b / wsum / un);
        out[d + 3] = Math.round(alpha);
      }
    }
  }
  return { width: tw, height: th, data: out };
}

/**
 * Centres the crest on a square canvas. `bg` is null for transparent, or
 * [r,g,b] to flatten onto an opaque background.
 */
function square(img, size, marginRatio, bg) {
  const box = Math.round(size * (1 - marginRatio * 2));
  const scale = Math.min(box / img.width, box / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const small = resample(img, w, h);

  const out = new Uint8ClampedArray(size * size * 4);
  if (bg) {
    for (let i = 0; i < size * size; i++) {
      out[i * 4] = bg[0]; out[i * 4 + 1] = bg[1]; out[i * 4 + 2] = bg[2]; out[i * 4 + 3] = 255;
    }
  }

  const ox = Math.round((size - w) / 2);
  const oy = Math.round((size - h) / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      const d = ((y + oy) * size + (x + ox)) * 4;
      const a = small.data[s + 3] / 255;
      if (a === 0) continue;
      const br = out[d], bgc = out[d + 1], bb = out[d + 2], ba = out[d + 3] / 255;
      const oa = a + ba * (1 - a);
      out[d] = Math.round((small.data[s] * a + br * ba * (1 - a)) / oa);
      out[d + 1] = Math.round((small.data[s + 1] * a + bgc * ba * (1 - a)) / oa);
      out[d + 2] = Math.round((small.data[s + 2] * a + bb * ba * (1 - a)) / oa);
      out[d + 3] = Math.round(oa * 255);
    }
  }
  return { width: size, height: size, data: out };
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */
const root = process.argv[2] ?? process.cwd();
const black = trim(decodePNG(readFileSync(`${root}/public/brand/ube-logo-black.png`)));
const white = trim(decodePNG(readFileSync(`${root}/public/brand/ube-logo-white.png`)));

console.log(`source black ${black.width}x${black.height}, white ${white.width}x${white.height}`);

const targets = [
  // Browser tab. White ground so the black crest reads on dark browser chrome.
  // Tight margin: the crest is portrait, so fitting it by height already
  // leaves side padding, and at 16px every pixel of height counts.
  [`${root}/src/app/icon.png`, square(black, 512, 0.03, [255, 255, 255])],
  // iOS home screen. Must be opaque, iOS renders transparency as black, and
  // gets more breathing room because iOS masks the corners.
  [`${root}/src/app/apple-icon.png`, square(black, 180, 0.1, [255, 255, 255])],
  // Transparent variants for anything that composites its own background.
  [`${root}/public/brand/crest-square-black.png`, square(black, 512, 0.06, null)],
  [`${root}/public/brand/crest-square-white.png`, square(white, 512, 0.06, null)],
];

for (const [path, img] of targets) {
  const buf = encodePNG(img);
  writeFileSync(path, buf);
  console.log(`${path}  ${img.width}x${img.height}  ${(buf.length / 1024).toFixed(1)} kB`);
}
