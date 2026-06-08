const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  }
});

async function main() {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    for (const table of ['incident_vehicles', 'incident_personnel', 'personnel_details']) {
      const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}';
      `);
      console.log(`=== Columns for ${table} ===`);
      console.log(res.rows);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
main();
