import { readFileSync, writeFileSync } from 'node:fs';

function yyyyMmDdUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const date = process.env.JOKE_DATE || yyyyMmDdUTC();
const jokes = readFileSync(new URL('../jokes.txt', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .map(s => s.trim())
  .filter(Boolean);

if (!jokes.length) throw new Error('No jokes found in jokes.txt');

// Stable rotation by date string
let hash = 0;
for (const ch of date) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
const idx = hash % jokes.length;

const payload = {
  date,
  joke: jokes[idx],
  source: 'local:jokes.txt'
};

writeFileSync('public/joke-of-the-day.json', JSON.stringify(payload, null, 2) + '\n');
console.log(`Generated joke for ${date}: #${idx + 1}/${jokes.length}`);
