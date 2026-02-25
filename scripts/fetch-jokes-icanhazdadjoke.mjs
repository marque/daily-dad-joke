import { writeFileSync } from 'node:fs';

const target = Number(process.env.TARGET || 500);
const perPage = 30;
let page = 1;

function normalizeJoke(s) {
  return String(s || '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const jokes = [];
const seen = new Set();

while (jokes.length < target) {
  const url = `https://icanhazdadjoke.com/search?limit=${perPage}&page=${page}`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'daily-dad-joke (https://github.com/marque/daily-dad-joke)'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const json = await res.json();
  const results = json?.results || [];
  if (!results.length) break;

  for (const r of results) {
    const j = normalizeJoke(r?.joke);
    if (!j) continue;
    if (seen.has(j)) continue;
    seen.add(j);
    jokes.push(j);
    if (jokes.length >= target) break;
  }

  if (!json?.next_page || json.next_page === page) break;
  page = json.next_page;
}

if (jokes.length < target) {
  console.warn(`Only fetched ${jokes.length} unique jokes (target ${target}).`);
}

writeFileSync('jokes_icanhazdadjoke.txt', jokes.join('\n') + '\n');
console.log(`Wrote jokes_icanhazdadjoke.txt with ${jokes.length} unique jokes.`);
