import { readFileSync, writeFileSync } from 'node:fs';

const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId) throw new Error('Missing GCP project id in env (GCP_PROJECT/GCLOUD_PROJECT/GOOGLE_CLOUD_PROJECT)');

const location = process.env.VERTEX_LOCATION || 'us-central1';
const model = process.env.IMAGEN_MODEL || 'imagen-3.0-fast-generate-001';

const data = JSON.parse(readFileSync('public/joke-of-the-day.json', 'utf8'));
const joke = String(data.joke || '').trim();
if (!joke) throw new Error('No joke found in public/joke-of-the-day.json');

// Prompt: keep it safe + kid-friendly, no text in image
const prompt = [
  'Create a playful, wholesome, kid-friendly illustration inspired by this dad joke.',
  'No text, no captions, no letters, no watermarks, no logos.',
  'Bright colors, clean composition, simple shapes, high quality.',
  `Dad joke: "${joke}"`
].join(' ');

const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;

// Use gcloud access token (works with Workload Identity in GitHub Actions)
const { execSync } = await import('node:child_process');
const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();

const body = {
  instances: [{ prompt }],
  parameters: {
    sampleCount: 1,
    aspectRatio: '1:1'
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastErr;
for (let attempt = 1; attempt <= 6; attempt++) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    lastErr = new Error(`Imagen request failed: HTTP ${res.status} ${res.statusText}\n${text}`);
  } else {
    const json = await res.json();
    const b64 = json?.predictions?.[0]?.bytesBase64Encoded;
    if (b64) {
      const buf = Buffer.from(b64, 'base64');
      writeFileSync('public/image-of-the-day.png', buf);
      console.log(`Wrote public/image-of-the-day.png (${buf.length} bytes) using model ${model} @ ${location}`);
      process.exit(0);
    }
    lastErr = new Error(`Unexpected response (no bytesBase64Encoded): ${JSON.stringify(json).slice(0, 1000)}`);
  }

  // backoff: 1s, 2s, 4s, 8s...
  const wait = Math.min(16000, 1000 * (2 ** (attempt - 1)));
  console.warn(`[imagen] attempt ${attempt}/6 failed; retrying in ${wait}ms`);
  await sleep(wait);
}

throw lastErr || new Error('Imagen request failed');
