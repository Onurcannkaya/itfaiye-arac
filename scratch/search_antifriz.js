const xlsx = require('xlsx');
const path = require('path');

function searchAntifriz() {
  ['arac_tamir_takip.xlsx', 'yag_bakım_takip.xlsx'].forEach(filename => {
    const filePath = path.join(__dirname, '..', 'public', 'data', filename);
    const workbook = xlsx.readFile(filePath);
    console.log(`\n=== File: ${filename} ===`);
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
      data.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell && (String(cell).toLowerCase().includes('derece') || String(cell).toLowerCase().includes('antifiriz') || String(cell).toLowerCase().includes('antifriz'))) {
            console.log(`Cell [Row ${r}, Col ${c}]:`, String(cell).replace(/\n/g, ' '));
          }
        });
      });
    });
  });
}

try {
  searchAntifriz();
} catch (err) {
  console.error(err);
}
