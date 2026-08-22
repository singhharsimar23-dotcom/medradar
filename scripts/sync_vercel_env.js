const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const lines = envContent.split('\n');
const envMap = {};

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (key && val) {
      envMap[key] = val;
    }
  }
}

for (const [key, val] of Object.entries(envMap)) {
  console.log(`Setting Vercel env var: ${key}...`);
  try {
    try {
      execSync(`npx -y vercel env rm ${key} production preview development -y`, { stdio: 'ignore' });
    } catch (e) {}
    
    // Add across production, preview, development
    execSync(`npx -y vercel env add ${key} production preview development --value "${val}" --yes`, {
      stdio: 'inherit'
    });
    console.log(`✓ ${key} set across all environments.`);
  } catch (err) {
    console.error(`Failed ${key}:`, err.message);
  }
}

console.log('All environment variables synced to Vercel!');
