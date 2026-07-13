const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envLocalContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const lines = envLocalContent.split('\n');
const env = {};
for (const line of lines) {
  const cleanLine = line.trim();
  if (cleanLine && !cleanLine.startsWith('#')) {
    const idx = cleanLine.indexOf('=');
    if (idx !== -1) {
      const key = cleanLine.substring(0, idx).trim();
      const val = cleanLine.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  }
}

process.env.DATABASE_URL = env.DATABASE_URL;

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const plaka = '58 TL 737';
    const res = await pool.query("SELECT id, model, aciklama, marka, arac_tipi, plaka FROM vehicles WHERE plaka ILIKE $1", [`%${plaka}%`]);
    console.log("58 TL 737 Info:", res.rows);

    const res2 = await pool.query("SELECT id, model, aciklama, marka, arac_tipi, plaka FROM vehicles WHERE plaka ILIKE '%aeh%' OR model ILIKE '%hyundai%' OR model ILIKE '%accent%'");
    console.log("Hyundai Info:", res2.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
