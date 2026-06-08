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
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables:');
    console.log(res.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
main();
