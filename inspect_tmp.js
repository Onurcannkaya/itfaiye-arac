const { Pool } = require('pg');
const fs = require('fs');

function getDbUrl() {
  const content = fs.readFileSync('.env.local', 'utf8');
  const match = content.match(/^DATABASE_URL\s*=\s*["']?(.*?)["']?$/m);
  return match ? match[1] : null;
}

async function run() {
  const connectionString = getDbUrl();
  const pool = new Pool({ connectionString });

  const res1 = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'scba_cylinders'
    );
  `);
  console.log('scba_cylinders exists:', res1.rows[0].exists);

  const res2 = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'scba_fill_logs'
    );
  `);
  console.log('scba_fill_logs exists:', res2.rows[0].exists);

  await pool.end();
}

run().catch(console.error);
