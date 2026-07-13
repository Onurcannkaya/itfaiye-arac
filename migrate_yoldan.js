const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(line => line.startsWith('DATABASE_URL')).split('=')[1].replace(/"/g, '').trim();
const { Client } = require('pg');
const client = new Client({ connectionString: dbUrl });

async function run() {
  await client.connect();
  try {
    await client.query('ALTER TABLE incidents ADD COLUMN yoldan_donuldu BOOLEAN DEFAULT false;');
    console.log('Column added');
  } catch (e) {
    if (e.code === '42701') console.log('Column already exists');
    else console.error(e);
  } finally {
    await client.end();
  }
}
run();
