// Verifies every app icon is a real PNG of the right size and the manifest points at them.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'public');
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

const expected = {
  'icon-192.png': 192, 'icon-512.png': 512, 'icon-maskable-512.png': 512,
  'apple-touch-icon.png': 180, 'favicon-32.png': 32, 'badge-96.png': 96
};
for (const [name, size] of Object.entries(expected)) {
  const f = path.join(root, 'icons', name);
  if (!fs.existsSync(f)) { ok(false, `${name} exists`); continue; }
  const b = fs.readFileSync(f);
  const sig = b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  ok(sig && w === size && h === size, `${name} is a ${size}x${size} PNG (got ${w}x${h}, ${b.length} bytes)`);
  // icon must not be blank: count opaque pixels is hard without decoding, so require a non-trivial size
  ok(b.length > 200, `${name} has image data`);
}
let manifest;
try { manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8')); ok(true, 'manifest is valid JSON'); }
catch (e) { ok(false, 'manifest is valid JSON: ' + e.message); }
if (manifest) {
  ok(manifest.display === 'standalone', 'manifest display is standalone');
  ok(manifest.start_url === '/', 'manifest start_url is /');
  for (const ic of manifest.icons || []) ok(fs.existsSync(path.join(root, ic.src)), `manifest icon ${ic.src} exists`);
  ok((manifest.icons || []).some(i => i.purpose === 'maskable'), 'manifest has a maskable icon');
  ok((manifest.icons || []).some(i => i.sizes === '512x512'), 'manifest has a 512px icon');
}
console.log(fail ? `\n${fail} check(s) failed` : '\nAll icon checks passed');
process.exit(fail ? 1 : 0);
