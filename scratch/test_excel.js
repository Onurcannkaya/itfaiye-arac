const xlsx = require('xlsx');
const path = require('path');

function testExcel() {
  // 1. TAMİR TAKİP
  const tamirPath = path.join(__dirname, '..', 'public', 'data', 'arac_tamir_takip.xlsx');
  const tamirWb = xlsx.readFile(tamirPath);
  const tamirSheet = tamirWb.Sheets[tamirWb.SheetNames[0]];
  const tamirRange = xlsx.utils.decode_range(tamirSheet['!ref']);

  console.log('--- TAMİR ARTIKLARI VE ARAÇLAR ---');
  let vehicles = [];
  for (let c = 0; c <= tamirRange.e.c; c++) {
    const headerCell = tamirSheet[xlsx.utils.encode_cell({r: 0, c})];
    if (headerCell && headerCell.v) {
      const val = String(headerCell.v).trim();
      // Extract plate, brand, name
      vehicles.push({ col: c, raw: val });
    }
  }
  console.log(`Tamir takip dosyasında ${vehicles.length} sütun (araç) var:`);
  vehicles.forEach(v => {
    console.log(`Col ${v.col}: ${v.raw.replace(/\n/g, ' | ')}`);
  });

  // 2. YAĞ BAKIM
  const yagPath = path.join(__dirname, '..', 'public', 'data', 'yag_bakım_takip.xlsx');
  const yagWb = xlsx.readFile(yagPath);
  const yagSheet = yagWb.Sheets[yagWb.SheetNames[0]];
  const yagRange = xlsx.utils.decode_range(yagSheet['!ref']);

  console.log('\n--- YAĞ BAKIM VE ARAÇLAR ---');
  let yagVehicles = [];
  for (let c = 0; c <= yagRange.e.c; c++) {
    const headerCell = yagSheet[xlsx.utils.encode_cell({r: 0, c})];
    if (headerCell && headerCell.v) {
      const val = String(headerCell.v).trim();
      yagVehicles.push({ col: c, raw: val });
    }
  }
  console.log(`Yağ bakım dosyasında ${yagVehicles.length} sütun var:`);
  yagVehicles.forEach(v => {
    console.log(`Col ${v.col}: ${v.raw.replace(/\n/g, ' | ')}`);
  });
}

testExcel();
