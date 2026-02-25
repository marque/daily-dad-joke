import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const days = Number(process.env.DAYS || 10);
const project = process.env.GCP_PROJECT || 'daily-dad-joke-472514';
const vertexLocation = process.env.VERTEX_LOCATION || 'us-central1';
const imagenModel = process.env.IMAGEN_MODEL || 'imagen-3.0-fast-generate-001';

const dataBucket = process.env.GCS_DATA_BUCKET;
const imagesBucket = process.env.GCS_IMAGES_BUCKET;
if (!dataBucket || !imagesBucket) {
  throw new Error('Missing GCS_DATA_BUCKET or GCS_IMAGES_BUCKET env');
}

function yyyyMmDdUTC(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function run(cmd, env = {}) {
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

// Start from yesterday UTC (so we don't fight with today's live file), go back N days
const start = new Date();
start.setUTCHours(0, 0, 0, 0);
start.setUTCDate(start.getUTCDate() - 1);

console.log(`Backfilling ${days} days starting from ${yyyyMmDdUTC(start)} (UTC)`);

for (let i = 0; i < days; i++) {
  const d = new Date(start);
  d.setUTCDate(start.getUTCDate() - i);
  const date = yyyyMmDdUTC(d);
  console.log(`\n=== ${date} ===`);

  run('npm run generate', { JOKE_DATE: date });
  run('node scripts/generate-image.mjs', {
    JOKE_DATE: date,
    GCP_PROJECT: project,
    VERTEX_LOCATION: vertexLocation,
    IMAGEN_MODEL: imagenModel,
  });

  const json = JSON.parse(readFileSync('public/joke-of-the-day.json', 'utf8'));
  if (json.date !== date) throw new Error(`Date mismatch: expected ${date}, got ${json.date}`);

  // Upload to dated paths
  run(
    `gcloud storage cp public/joke-of-the-day.json gs://${dataBucket}/archive/${date}.json`
  );
  run(
    `gcloud storage cp public/image-of-the-day.png gs://${imagesBucket}/archive/${date}.png`
  );
}

console.log('\nBackfill complete.');
