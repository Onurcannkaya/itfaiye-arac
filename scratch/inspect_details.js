const xlsx = require('xlsx');
const path = require('path');

function inspectDetails(filename) {
  const filePath = path.join(__dirname, '..', 'public', 'data', filename);
  console.log(`\n========================================`);
  console.log(`FILE: ${filename}`);
  console.log(`========================================`);
  
  const workbook = xlsx.readFile(filePath);
  console.log('Sheet Names:', workbook.SheetNames);
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to a 2D array to see exact row/column coordinates
    const range = xlsx.utils.decode_range(sheet['!ref']);
    console.log(`Dimensions: Col 0..${range.e.c}, Row 0..${range.e.r}`);
    
    // Print first 5 rows and 5 columns
    for (let r = 0; r <= Math.min(10, range.e.r); r++) {
      let rowParts = [];
      for (let c = 0; c <= Math.min(10, range.e.c); c++) {
        const cellRef = xlsx.utils.encode_cell({r, c});
        const cell = sheet[cellRef];
        rowParts.push(`${cellRef}: ${cell ? cell.v : '(empty)'}`);
      }
      console.log(`Row ${r}:`, rowParts.join('  |  '));
    }
  });
}

try {
  inspectDetails('arac_tamir_takip.xlsx');
  inspectDetails('yag_bakım_takip.xlsx');
} catch (err) {
  console.error(err);
}
