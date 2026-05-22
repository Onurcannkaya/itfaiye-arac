const xlsx = require('xlsx');
const path = require('path');

function inspectTamir() {
  const filePath = path.join(__dirname, '..', 'public', 'data', 'arac_tamir_takip.xlsx');
  console.log(`\n========================================`);
  console.log(`FILE: arac_tamir_takip.xlsx`);
  console.log(`========================================`);
  
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const range = xlsx.utils.decode_range(sheet['!ref']);
  console.log(`Dimensions: Col 0..${range.e.c}, Row 0..${range.e.r}`);
  
  // Print row 0 (headers)
  let headers = [];
  for (let c = 0; c <= range.e.c; c++) {
    const cell = sheet[xlsx.utils.encode_cell({r: 0, c})];
    headers.push(`Col ${c}: ${cell ? cell.v : '(empty)'}`);
  }
  console.log('Headers (Row 0):', headers.join('\n'));
  
  // Print rows 1 to 5 to understand data cells
  for (let r = 1; r <= 5; r++) {
    let rowParts = [];
    for (let c = 0; c <= Math.min(5, range.e.c); c++) {
      const cell = sheet[xlsx.utils.encode_cell({r, c})];
      rowParts.push(`Col ${c}: ${cell ? String(cell.v).substring(0, 50).replace(/\n/g, ' ') : '(empty)'}`);
    }
    console.log(`Row ${r}:`, rowParts.join('  |  '));
  }
}

try {
  inspectTamir();
} catch (err) {
  console.error(err);
}
