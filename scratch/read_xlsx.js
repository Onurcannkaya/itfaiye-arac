const xlsx = require('xlsx');
const path = require('path');

function readXlsx(filename) {
  const filePath = path.join(__dirname, '..', 'public', 'data', filename);
  console.log(`\n--- Reading ${filename} ---`);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);
  console.log(`Total rows: ${data.length}`);
  console.log('Sample rows:');
  console.log(data.slice(0, 5));
}

try {
  readXlsx('arac_tamir_takip.xlsx');
  readXlsx('yag_bakım_takip.xlsx');
} catch (err) {
  console.error(err);
}
