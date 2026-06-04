const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'data', 'ARAÇLAR VE MALZEMELER 2026.xls');
const workbook = xlsx.readFile(filePath);

// Show sheet names
console.log('SHEETS:', workbook.SheetNames.join(', '));

// Find Stok sheet
let stokName = workbook.SheetNames.find(n => n.toLowerCase().includes('stok'));
if (!stokName) stokName = workbook.SheetNames[0];
console.log('STOK SHEET:', stokName);

const sheet = workbook.Sheets[stokName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
const range = xlsx.utils.decode_range(sheet['!ref']);
console.log(`TOTAL: ${data.length} rows, ${range.e.c + 1} cols\n`);

// HEADERS - first 4 rows, ALL columns
console.log('=== HEADERS ===');
for (let r = 0; r <= 3; r++) {
  console.log(`\nROW ${r}:`);
  for (let c = 0; c <= range.e.c; c++) {
    const v = data[r]?.[c];
    if (v !== undefined && v !== null && v !== '') {
      console.log(`  C${c}: "${String(v).replace(/\n/g, ' | ')}"`);
    }
  }
}

// FIRST 8 DATA ROWS
console.log('\n=== DATA ROWS 3-10 ===');
for (let r = 3; r <= 10; r++) {
  console.log(`\nROW ${r}:`);
  for (let c = 0; c <= range.e.c; c++) {
    const v = data[r]?.[c];
    if (v !== undefined && v !== null && v !== '') {
      console.log(`  C${c}: "${String(v).substring(0, 50).replace(/\n/g, ' | ')}"`);
    }
  }
}

// Extract unique item names from col 0 (which seems to be item name based on last rows)
console.log('\n=== UNIQUE ITEM NAMES (col 0) ===');
const items = [];
for (let r = 3; r < data.length; r++) {
  const v = data[r]?.[0];
  if (v && typeof v === 'string' && v.trim() && !v.match(/^\d+$/) && !v.match(/^TOPLAM/i)) {
    if (!items.includes(v.trim())) items.push(v.trim());
  }
}
console.log(`Count: ${items.length}`);
items.forEach((item, i) => console.log(`  ${i+1}. ${item}`));

// Identify vehicle sheets
console.log('\n=== VEHICLE-SPECIFIC SHEETS ===');
const plateRegex = /(\d{2})\s*([A-ZÇĞİÖŞÜ]{1,4})\s*(\d{2,4})/;
workbook.SheetNames.forEach(name => {
  if (plateRegex.test(name)) {
    const d = xlsx.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
    console.log(`  "${name}" - ${d.length} rows`);
    // Show first 5 rows
    for (let r = 0; r < Math.min(5, d.length); r++) {
      const cells = [];
      for (let c = 0; c < Math.min(d[r]?.length || 0, 8); c++) {
        const v = d[r]?.[c];
        if (v !== '' && v !== undefined && v !== null) cells.push(`C${c}=${String(v).substring(0,30)}`);
      }
      if (cells.length) console.log(`    R${r}: ${cells.join(' | ')}`);
    }
  }
});
