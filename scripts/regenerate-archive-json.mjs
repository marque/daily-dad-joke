import { readdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

// Regenerates ONLY the archived JSON files using the current deterministic mapping.
// Leaves existing archived PNGs untouched (so you don't need Imagen locally).
//
// Usage:
//   node scripts/regenerate-archive-json.mjs            # all dates in public/archive
//   FROM=2026-02-01 TO=2026-02-28 node scripts/regenerate-archive-json.mjs

const archiveDir = join(process.cwd(), 'public', 'archive');
if (!existsSync(archiveDir)) {
  throw new Error(`Missing ${archiveDir}`);
}

const from = process.env.FROM || null;
const to = process.env.TO || null;

function inRange(date) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

const files = readdirSync(archiveDir)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .map((f) => f.slice(0, 10))
  .filter(inRange)
  .sort();

if (!files.length) {
  console.log('No archive JSON files matched the requested range.');
  process.exit(0);
}

let updated = 0;
for (const date of files) {
  console.log(`Regenerating ${date}...`);
  execFileSync('node', ['scripts/generate-joke.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, JOKE_DATE: date },
  });

  // Copy the freshly generated JSON into the archive date slot.
  copyFileSync(join(process.cwd(), 'public', 'joke-of-the-day.json'), join(archiveDir, `${date}.json`));
  updated++;
}

console.log(`Done. Updated ${updated} archived JSON files.`);
