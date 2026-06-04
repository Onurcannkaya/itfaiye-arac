const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'data', 'ARAÇLAR VE MALZEMELER 2026.xls');
console.log('=== READING FILE:', filePath, '===\n');

const workbook = xlsx.readFile(filePath);

// 1. List all sheet names
console.log('=== 1. ALL SHEET NAMES ===');
workbook.SheetNames.forEach((name, i) => {
  const sheet = workbook.Sheets[name];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`  Sheet ${i}: "${name}" (${data.length} rows)`);
});
console.log('');

// 2. Analyze each sheet's first rows
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const range = sheet['!ref'] ? xlsx.utils.decode_range(sheet['!ref']) : null;
  console.log(`\n--- Sheet: "${sheetName}" ---`);
  console.log(`  Range: ${sheet['!ref'] || 'N/A'}, Rows: ${data.length}, Cols: ${range ? range.e.c + 1 : 0}`);
  const previewRows = Math.min(data.length, 6);
  for (let r = 0; r < previewRows; r++) {
    const row = data[r];
    const cells = [];
    for (let c = 0; c < Math.min(row.length, 20); c++) {
      const v = row[c];
      if (v !== undefined && v !== null && v !== '') {
        cells.push(`[${c}]=${String(v).substring(0, 35).replace(/\n/g, '|')}`);
      }
    }
    if (cells.length > 0) console.log(`  Row ${r}: ${cells.join(' | ')}`);
  }
});

console.log('\n\n=== STOK SHEET DEEP ANALYSIS ===');
// Find Stok sheet
let stokName = workbook.SheetNames.find(n => n.toLowerCase().includes('stok'));
if (!stokName) {
  // Use sheet with most rows
  let maxR = 0;
  for (const n of workbook.SheetNames) {
    const d = xlsx.utils.sheet_to_json(workbook.Sheets[n], { header: 1 });
    if (d.length > maxR) { maxR = d.length; stokName = n; }
  }
}
console.log('Using sheet:', stokName);

const stokSheet = workbook.Sheets[stokName];
const stokData = xlsx.utils.sheet_to_json(stokSheet, { header: 1, defval: '' });
const stokRange = xlsx.utils.decode_range(stokSheet['!ref']);
console.log(`Rows: ${stokData.length}, Cols: ${stokRange.e.c + 1}\n`);

// Show ALL header rows (0-3)
console.log('=== COMPLETE HEADERS (rows 0-3) ===');
for (let r = 0; r <= Math.min(3, stokData.length - 1); r++) {
  console.log(`\nRow ${r}:`);
  for (let c = 0; c <= stokRange.e.c; c++) {
    const v = stokData[r]?.[c];
    if (v !== undefined && v !== null && v !== '') {
      console.log(`  Col ${c}: "${String(v).replace(/\n/g, ' | ')}"`);
    }
  }
}

// Column classification
console.log('\n=== COLUMN CLASSIFICATION ===');
const plateRegex = /(\d{2})\s*([A-ZÇĞİÖŞÜ]{1,4})\s*(\d{2,4})/;
for (let c = 0; c <= stokRange.e.c; c++) {
  let texts = [];
  for (let r = 0; r <= 3; r++) {
    const v = stokData[r]?.[c];
    if (v) texts.push(String(v).replace(/\n/g, ' ').trim());
  }
  const combined = texts.join(' / ');
  if (!combined) continue;
  let type = c <= 1 ? 'ITEM' : 'DATA';
  if (plateRegex.test(combined)) type = 'VEHICLE';
  else if (/depo|merkez|esentepe|osb|organize|toplam|stok|genel/i.test(combined)) type = 'DEPOT';
  console.log(`  Col ${c} [${type}]: ${combined.substring(0, 100)}`);
}

// Show data rows 3-10
console.log('\n=== DATA ROWS (3-10) ===');
for (let r = 3; r <= Math.min(12, stokData.length - 1); r++) {
  const cells = [];
  for (let c = 0; c <= Math.min(stokRange.e.c, 18); c++) {
    const v = stokData[r]?.[c];
    cells.push(v !== undefined && v !== null && v !== '' ? String(v).substring(0, 20) : '-');
  }
  console.log(`  Row ${r}: ${cells.join(' | ')}`);
}

// Count unique items
console.log('\n=== ALL ITEM NAMES ===');
const items = [];
for (let r = 3; r < stokData.length; r++) {
  // Try col 0 and col 1
  let name = stokData[r]?.[1]; // Usually col B has names
  if (!name || typeof name !== 'string' || !name.trim() || !isNaN(Number(name))) {
    name = stokData[r]?.[0];
  }
  if (name && typeof name === 'string' && name.trim() && isNaN(Number(name))) {
    items.push({ row: r, name: name.trim() });
  }
}
console.log(`Total items found: ${items.length}`);
items.forEach((item, i) => {
  console.log(`  ${i + 1}. [Row ${item.row}] ${item.name}`);
});

// Last few rows
console.log('\n=== LAST 5 ROWS ===');
for (let r = Math.max(3, stokData.length - 5); r < stokData.length; r++) {
  const cells = [];
  for (let c = 0; c <= Math.min(stokRange.e.c, 18); c++) {
    const v = stokData[r]?.[c];
    cells.push(v !== undefined && v !== null && v !== '' ? String(v).substring(0, 20) : '-');
  }
  console.log(`  Row ${r}: ${cells.join(' | ')}`);
}

console.log('\n=== ANALYSIS COMPLETE ===');
