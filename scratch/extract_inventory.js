const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '..', 'public', 'data', 'ARAÇLAR VE MALZEMELER 2026.xls');
const workbook = xlsx.readFile(filePath);

console.log('All sheet names:');
workbook.SheetNames.forEach((n, i) => console.log(`  ${i}: "${n}" (len=${n.length})`));

// Find the stok sheet - it might have spaces like "S   T   O   K"
const stokName = workbook.SheetNames.find(n => {
  const normalized = n.replace(/\s+/g, '').toLowerCase();
  return normalized === 'stok';
});
console.log('\nFound stok sheet:', JSON.stringify(stokName));

if (!stokName) {
  console.log('ERROR: Could not find Stok sheet!');
  process.exit(1);
}

const sheet = workbook.Sheets[stokName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
console.log('Total rows:', data.length);

// Show rows
for (let r = 0; r <= Math.min(5, data.length - 1); r++) {
  console.log(`\nRow ${r}:`);
  const row = data[r];
  if (!row) { console.log('  (empty)'); continue; }
  for (let c = 0; c < Math.min(row.length, 25); c++) {
    const v = row[c];
    if (v !== '' && v !== undefined && v !== null) {
      console.log(`  C${c} [${typeof v}]: ${JSON.stringify(v)}`);
    }
  }
}

// Extract all item data
const VEHICLE_COLS = [
  { col: 2, plaka: '58 TL 737' },
  { col: 3, plaka: '58 TH 256' },
  { col: 4, plaka: '58 AP 614' },
  { col: 5, plaka: '58 AP 601' },
  { col: 6, plaka: '58 TH 257' },
  { col: 7, plaka: '58 FR 021' },
  { col: 8, plaka: '58 AF 240' },
  { col: 9, plaka: '58 NC 182' },
  { col: 10, plaka: '58 AT 105' },
  { col: 11, plaka: '58 FP 968' },
  { col: 12, plaka: '58 TU 817' },
  { col: 13, plaka: '58 FP 852' },
  { col: 14, plaka: '58 NC 184' },
  { col: 15, plaka: '58 FP 851' },
  { col: 16, plaka: '58 AP 734' },
  { col: 17, plaka: '58 FP 148' },
  { col: 18, plaka: '58 DK 650' },
];

const DEPOT_COLS = [
  { col: 19, name: 'Merkez' },
  { col: 20, name: 'Esentepe' },
  { col: 21, name: 'Organize' },
];

function parseQty(val) {
  if (val === undefined || val === null || val === '' || val === '-') return 0;
  if (val === '?') return 0;
  const s = String(val).trim();
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

const items = [];
const stockDistribution = [];

// Header at row 0, data starts at row 1
for (let r = 1; r < data.length; r++) {
  const row = data[r];
  if (!row) continue;
  
  const malzeme = row[1];
  if (!malzeme) continue;
  const name = String(malzeme).trim();
  if (!name || name.match(/^TOPLAM/i) || name.match(/^S\.NO/i)) continue;
  
  items.push({ id: r, sno: parseQty(row[0]), name });
  
  VEHICLE_COLS.forEach(v => {
    const qty = parseQty(row[v.col]);
    if (qty > 0) {
      stockDistribution.push({
        item_name: name,
        location_type: 'vehicle',
        location_name: v.plaka,
        quantity: qty,
      });
    }
  });
  
  DEPOT_COLS.forEach(d => {
    const qty = parseQty(row[d.col]);
    if (qty > 0) {
      stockDistribution.push({
        item_name: name,
        location_type: 'depot',
        location_name: d.name,
        quantity: qty,
      });
    }
  });
  
  const depoQty = parseQty(row[23]);
  if (depoQty > 0) {
    stockDistribution.push({
      item_name: name,
      location_type: 'depot',
      location_name: 'Genel Depo',
      quantity: depoQty,
    });
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Total unique items: ${items.length}`);
console.log(`Total stock distributions: ${stockDistribution.length}`);

// Write JSON
const output = { items, stockDistribution, vehiclePlates: VEHICLE_COLS.map(v => v.plaka), depots: ['Merkez', 'Esentepe', 'Organize', 'Genel Depo'] };
fs.writeFileSync(path.join(__dirname, 'inventory_data.json'), JSON.stringify(output, null, 2), 'utf8');
console.log('JSON saved to scratch/inventory_data.json');

// Show first 10 items  
console.log('\n=== FIRST 10 ITEMS ===');
items.slice(0, 10).forEach(item => {
  const dists = stockDistribution.filter(s => s.item_name === item.name);
  console.log(`  #${item.sno} ${item.name}: ${dists.map(d => `${d.location_name}=${d.quantity}`).join(', ') || '(none)'}`);
});

// Show last 5 items
console.log('\n=== LAST 5 ITEMS ===');
items.slice(-5).forEach(item => {
  const dists = stockDistribution.filter(s => s.item_name === item.name);
  console.log(`  #${item.sno} ${item.name}: ${dists.map(d => `${d.location_name}=${d.quantity}`).join(', ') || '(none)'}`);
});

// Vehicle summary
console.log('\n=== ITEMS PER VEHICLE ===');
VEHICLE_COLS.forEach(v => {
  const count = stockDistribution.filter(s => s.location_name === v.plaka).length;
  const total = stockDistribution.filter(s => s.location_name === v.plaka).reduce((sum, s) => sum + s.quantity, 0);
  console.log(`  ${v.plaka}: ${count} types, ${total} total items`);
});
