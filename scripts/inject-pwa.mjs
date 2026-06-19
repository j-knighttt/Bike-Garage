/**
 * Post-build step for the web export: turns dist/index.html into an installable
 * PWA by injecting the manifest link, Apple home-screen meta tags, theme colour
 * and a notch-friendly viewport. Also writes a 404.html fallback so the SPA
 * works on static hosts (e.g. GitHub Pages).
 *
 * Run after `expo export --platform web`. Idempotent.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = join(root, 'dist', 'index.html');

if (!existsSync(indexPath)) {
  console.error('dist/index.html not found — run "expo export --platform web" first.');
  process.exit(1);
}

let html = readFileSync(indexPath, 'utf8');

// German document language.
html = html.replace('<html lang="en">', '<html lang="de">');

// Notch-friendly viewport.
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />',
);

const PWA_TAGS = `
    <meta name="description" content="Digitaler Zwilling, Verschleiß & Wartung deines Fahrrads – verbunden mit Strava." />
    <link rel="manifest" href="manifest.json" />
    <meta name="theme-color" content="#fc4c02" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Bike Garage" />
    <link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
    <link rel="icon" type="image/png" href="icons/favicon.png" />
`;

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `${PWA_TAGS}  </head>`);
}

writeFileSync(indexPath, html);

// SPA fallback for static hosts that 404 on unknown deep-link paths.
copyFileSync(indexPath, join(root, 'dist', '404.html'));

console.log('✓ Injected PWA tags into dist/index.html and wrote dist/404.html');
