import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const OUT = resolve(process.cwd(), "public/icons");
mkdirSync(OUT, { recursive: true });

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <g fill="none" stroke="white" stroke-width="32" stroke-linecap="round" stroke-linejoin="round">
    <!-- wallet -->
    <rect x="120" y="180" width="272" height="180" rx="28"/>
    <path d="M120 220 H 392"/>
    <circle cx="328" cy="290" r="18" fill="white"/>
  </g>
  <text x="256" y="450" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-weight="800"
        font-size="76" fill="white" letter-spacing="-2">₹</text>
</svg>`;

for (const size of [192, 512]) {
  const buf = Buffer.from(svg(size));
  await sharp(buf).resize(size, size).png().toFile(`${OUT}/icon-${size}.png`);
  console.log(`wrote ${OUT}/icon-${size}.png`);
}

// Apple touch + favicon
await sharp(Buffer.from(svg(180))).resize(180, 180).png().toFile(`${OUT}/apple-touch-icon.png`);
await sharp(Buffer.from(svg(64))).resize(64, 64).png().toFile(resolve(process.cwd(), "public/favicon.ico"));
console.log("done");
