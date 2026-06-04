const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '..', 'public', 'data', 'ARAÇLAR VE MALZEMELER 2026.xls');
const workbook = xlsx.readFile(filePath);
const stokName = workbook.SheetNames.find(n => n.toLowerCase().includes('stok'));
const sheet = workbook.Sheets[stokName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('Sheet name:', stokName);
console.log('Total rows:', data.length);
console.log('Row 0 col1:', JSON.stringify(data[0]?.[1]));
console.log('Row 1 col1:', JSON.stringify(data[1]?.[1]));
console.log('Row 2 col1:', JSON.stringify(data[2]?.[1]));

// Check: Row 0 has "MALZEME (CİNSİ)" as header, Row 1 is first data
// So data rows start at index 1
console.log('\nFirst 5 data entries (rows 1-5):');
for (let r = 1; r <= 5; r++) {
  const sno = data[r]?.[0];
  const name = data[r]?.[1];
  const c2 = data[r]?.[2];
  const c3 = data[r]?.[3];
  console.log(`  Row ${r}: sno="${sno}" name="${name}" c2="${c2}" c3="${c3}" type_name=${typeof name} type_c2=${typeof c2}`);
}

// The issue might be that values are numbers, not strings
// Check types
for (let r = 1; r <= 3; r++) {
  const name = data[r]?.[1];
  console.log(`  Row ${r} col1 type: ${typeof name}, value: ${JSON.stringify(name)}`);
  for (let c = 2; c <= 5; c++) {
    const v = data[r]?.[c];
    console.log(`    col ${c} type: ${typeof v}, value: ${JSON.stringify(v)}`);
  }
}
