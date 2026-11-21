// Generates the app icons (PNG) with no dependencies: node scripts/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

// ---- PNG encoder ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---- shapes (normalised 0..1 coordinates) ----
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
function inBell(x, y) {
  if (inCircle(x, y, 0.5, 0.215, 0.032)) return true;              // top knob
  if (y >= 0.24 && y < 0.44) return inCircle(x, y, 0.5, 0.44, 0.19) || (Math.abs(x - 0.5) <= 0.19 && y >= 0.44);
  if (y >= 0.44 && y < 0.665) {                                      // flaring body
    const t = (y - 0.44) / 0.225;
    return Math.abs(x - 0.5) <= 0.19 + t * 0.09;
  }
  if (y >= 0.665 && y < 0.705) {                                     // lip with rounded ends
    const hw = 0.32;
    return Math.abs(x - 0.5) <= hw - 0.02 || inCircle(x, y, 0.5 - hw + 0.02, 0.685, 0.02) || inCircle(x, y, 0.5 + hw - 0.02, 0.685, 0.02);
  }
  return inCircle(x, y, 0.5, 0.765, 0.052);                          // clapper
}
function inRoundRect(x, y, r) {
  const dx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0), dy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0);
  return dx * dx + dy * dy <= r * r;
}
const mix = (a, b, t) => a + (b - a) * t;
function gradient(x, y) {                                            // cyan -> blue -> violet, diagonal
  const t = Math.min(1, Math.max(0, (x * 0.45 + y * 0.75)));
  const stops = [[90, 200, 250], [10, 132, 255], [94, 92, 230]];
  const s = t < 0.5 ? [stops[0], stops[1], t / 0.5] : [stops[1], stops[2], (t - 0.5) / 0.5];
  return [mix(s[0][0], s[1][0], s[2]), mix(s[0][1], s[1][1], s[2]), mix(s[0][2], s[1][2], s[2])];
}

// mode: 'app' rounded glossy icon, 'full' full-bleed (maskable / apple), 'badge' white bell on transparent
function render(size, mode) {
  const SS = 3;
  const buf = Buffer.alloc(size * size * 4);
  const bellScale = mode === 'full' ? 0.78 : mode === 'badge' ? 0.9 : 1; // keep maskable bell inside the safe zone
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = (px + (sx + 0.5) / SS) / size, y = (py + (sy + 0.5) / SS) / size;
        let cr = 0, cg = 0, cb = 0, ca = 0;
        const bx = (x - 0.5) / bellScale + 0.5, by = (y - 0.5) / bellScale + 0.5;
        if (mode === 'badge') {
          if (inBell(bx, by)) { cr = cg = cb = 255; ca = 1; }
        } else if (mode === 'full' || inRoundRect(x, y, 0.225)) {
          [cr, cg, cb] = gradient(x, y); ca = 1;
          // soft glass highlight on the upper part + subtle bottom vignette
          const hl = Math.max(0, 1 - Math.hypot((x - 0.3) / 0.75, (y - 0.0) / 0.5));
          cr = mix(cr, 255, hl * 0.35); cg = mix(cg, 255, hl * 0.35); cb = mix(cb, 255, hl * 0.35);
          const vg = Math.max(0, y - 0.7) * 0.5;
          cr *= 1 - vg; cg *= 1 - vg; cb *= 1 - vg;
          if (inBell(bx, by)) {
            // bell shadow, then frosted white fill with a vertical sheen
            const sh = inBell(bx - 0.008, by - 0.016);
            if (sh) { cr *= 0.82; cg *= 0.82; cb *= 0.82; }
            cr = 255; cg = mix(255, 232, Math.max(0, by - 0.4)); cb = 255;
            cg = Math.min(255, cg); 
          }
        }
        r += cr * ca; g += cg * ca; b += cb * ca; a += ca;
      }
      const n = SS * SS, i = (py * size + px) * 4;
      buf[i] = a ? Math.round(r / a) : 0; buf[i + 1] = a ? Math.round(g / a) : 0; buf[i + 2] = a ? Math.round(b / a) : 0;
      buf[i + 3] = Math.round((a / n) * 255);
    }
  }
  return png(size, size, buf);
}

const files = [
  ['icon-192.png', 192, 'app'],
  ['icon-512.png', 512, 'app'],
  ['icon-maskable-512.png', 512, 'full'],
  ['apple-touch-icon.png', 180, 'full'],
  ['favicon-32.png', 32, 'app'],
  ['badge-96.png', 96, 'badge']
];
for (const [name, size, mode] of files) {
  fs.writeFileSync(path.join(OUT, name), render(size, mode));
  console.log('wrote', name);
}
