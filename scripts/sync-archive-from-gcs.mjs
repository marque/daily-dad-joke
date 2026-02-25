import { execSync } from 'node:child_process';

const days = Number(process.env.DAYS || 10);
const dataBucket = process.env.GCS_DATA_BUCKET;
const imagesBucket = process.env.GCS_IMAGES_BUCKET;
if (!dataBucket || !imagesBucket) throw new Error('Missing GCS_DATA_BUCKET or GCS_IMAGES_BUCKET');

function yyyyMmDdUTC(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit', env: process.env });
    return true;
  } catch (e) {
    return false;
  }
}

const start = new Date();
start.setUTCHours(0,0,0,0);
// include today and previous days

for (let i = 0; i < days; i++) {
  const d = new Date(start);
  d.setUTCDate(start.getUTCDate() - i);
  const date = yyyyMmDdUTC(d);
  console.log(`\nSync ${date}`);
  const okJson = run(`gcloud storage cp gs://${dataBucket}/archive/${date}.json public/archive/${date}.json`);
  const okPng = run(`gcloud storage cp gs://${imagesBucket}/archive/${date}.png public/archive/${date}.png`);
  if (!okJson || !okPng) console.log(`(skip) Missing one or more objects for ${date}`);
}
