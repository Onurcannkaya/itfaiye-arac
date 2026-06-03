const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
let databaseUrl = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) {
    databaseUrl = match[1];
  }
}

async function main() {
  if (!databaseUrl) return;
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const resCol = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'personnel_details'
    `);
    console.log('personnel_details columns:', resCol.rows.map(r => r.column_name));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
