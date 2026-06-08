const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
let databaseUrl = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) {
    databaseUrl = match[1];
  }
}

async function main() {
  if (!databaseUrl) {
    console.error("DATABASE_URL not found in .env.local");
    return;
  }
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const res = await pool.query(`
      SELECT DISTINCT durum FROM public.personnel
    `);
    console.log('Distinct personnel durum values in database:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
