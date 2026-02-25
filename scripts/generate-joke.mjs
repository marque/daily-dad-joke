import { readFileSync, writeFileSync } from 'node:fs';

function yyyyMmDdUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapLines(text, maxChars = 34) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 6); // keep it tidy
}

function buildSvgCard({ date, joke, subtitle = 'Daily Dad Joke' }) {
  const width = 1200;
  const height = 630;
  const padding = 80;

  const lines = wrapLines(joke, 34);
  const lineHeight = 64;
  const startY = 240;

  const tspans = lines
    .map((ln, i) => {
      const y = startY + i * lineHeight;
      return `<text x="${padding}" y="${y}" font-size="56" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" fill="#0B1220">${escapeXml(ln)}</text>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFF7E6" />
      <stop offset="100%" stop-color="#E6F3FF" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000" flood-opacity="0.18"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)" />
  <rect x="40" y="40" width="${width - 80}" height="${height - 80}" rx="28" fill="#ffffff" filter="url(#shadow)" />

  <text x="${padding}" y="140" font-size="44" font-weight="700" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" fill="#0B1220">${escapeXml(subtitle)}</text>
  <text x="${padding}" y="190" font-size="26" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" fill="#334155">${escapeXml(date)}</text>

  ${tspans}

  <text x="${padding}" y="560" font-size="22" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" fill="#64748b">marque.github.io/daily-dad-joke</text>
</svg>`;
}

const date = process.env.JOKE_DATE || yyyyMmDdUTC();
const jokes = readFileSync(new URL('../jokes.txt', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .map(s => s.trim())
  .filter(Boolean);

if (!jokes.length) throw new Error('No jokes found in jokes.txt');

// Stable, non-repeating rotation for sequential days (for up to jokes.length days)
const [yy, mm, dd] = date.split("-").map(Number);
const dayNumber = Math.floor(Date.UTC(yy, mm - 1, dd) / 86400000);
const idx = ((dayNumber % jokes.length) + jokes.length) % jokes.length;

const payload = {
  date,
  joke: jokes[idx],
  source: 'local:jokes.txt'
};

writeFileSync('public/joke-of-the-day.json', JSON.stringify(payload, null, 2) + '\n');

const svg = buildSvgCard({ date, joke: payload.joke });
writeFileSync('public/image-of-the-day.svg', svg);

console.log(`Generated joke for ${date}: #${idx + 1}/${jokes.length}`);
