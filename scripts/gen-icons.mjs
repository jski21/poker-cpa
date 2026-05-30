// One-off: rasterize public/icon.svg into the PNG sizes a PWA / iOS needs.
// Run with `node scripts/gen-icons.mjs`. The generated PNGs are committed; sharp
// is only needed to (re)generate them.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(resolve(root, 'public/icon.svg'));
const out = resolve(root, 'public/icons');

const BG = '#143728';

// A maskable icon needs the glyph inside a ~80% safe zone with full-bleed bg.
const maskableSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
     <rect width="512" height="512" fill="${BG}"/>
     <g transform="translate(56,56) scale(0.78)">
       ${readFileSync(resolve(root, 'public/icon.svg'), 'utf8').replace(/<\/?svg[^>]*>/g, '')}
     </g>
   </svg>`
);

const tasks = [
  { src: svg, size: 192, name: 'pwa-192.png' },
  { src: svg, size: 512, name: 'pwa-512.png' },
  { src: maskableSvg, size: 512, name: 'pwa-maskable-512.png' },
  // iOS home-screen icon: no transparency, square (iOS rounds it itself).
  { src: svg, size: 180, name: 'apple-touch-icon.png', flatten: true },
  { src: svg, size: 32, name: 'favicon-32.png' },
];

for (const t of tasks) {
  let img = sharp(t.src).resize(t.size, t.size);
  if (t.flatten) img = img.flatten({ background: BG });
  await img.png().toFile(resolve(out, t.name));
  console.log('wrote', t.name);
}
