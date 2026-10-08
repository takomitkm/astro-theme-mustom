// Generates PWA PNG icons (192/512 + maskable 512) from public/images/favicon.svg.
// Run: npm run icons:pwa
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const svgPath = join(root, 'public', 'images', 'favicon.svg');
const outDir = join(root, 'public', 'images');
const svg = readFileSync(svgPath);

// 常规图标：直出
await sharp(svg, { density: 1200 }).resize(192, 192).png().toFile(join(outDir, 'pwa-192.png'));
await sharp(svg, { density: 1200 }).resize(512, 512).png().toFile(join(outDir, 'pwa-512.png'));

// maskable 图标：四周留 10% 安全边距（内容缩到 80% 居中）
const padded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000000"/>
  <g transform="translate(51.2 51.2) scale(6.4)">${svg.toString().replace(/<\?xml[^>]*\?>/, '')}</g>
</svg>`;
await sharp(Buffer.from(padded), { density: 1200 }).resize(512, 512).png().toFile(join(outDir, 'pwa-512-maskable.png'));

console.log('[icons:pwa] pwa-192.png / pwa-512.png / pwa-512-maskable.png generated');
