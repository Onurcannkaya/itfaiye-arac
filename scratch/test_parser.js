const xlsx = require('xlsx');
const path = require('path');

// Extract plate from a string
function extractPlate(str) {
  if (!str) return null;
  // Normalize Turkish characters and uppercase
  let s = str.replace(/ı/gi, 'i').replace(/ş/gi, 's').replace(/ğ/gi, 'g').replace(/ç/gi, 'c').replace(/ö/gi, 'o').replace(/ü/gi, 'u').toUpperCase();
  
  if (s.includes('DOBLO') && s.includes('58 NN 694')) return '58 NN 694';
  if (s.includes('DOBLO')) return '58 NN 694';
  if (s.includes('ACCENT') || s.includes('HYUNDAI ACCENT')) return '58 TD 315';
  if (s.includes('58 AY 164')) return '58 AY 164';
  if (s.includes('1936 MODEL') || s.includes('58 AC 113')) return '58 AC 113';
  if (s.includes('JENERATOR')) return 'JENERATOR';
  
  const match = s.match(/(\d{2})\s*([A-Z]{1,3})\s*(\d{2,4})/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return null;
}

function parseDate(str) {
  if (!str) return null;
  const match = str.match(/(\d{2})[./-](\d{2})[./-](\d{4})/);
  if (match) {
    // Format as YYYY-MM-DD
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return null;
}

function testParser() {
  const tamirPath = path.join(__dirname, '..', 'public', 'data', 'arac_tamir_takip.xlsx');
  const tamirWb = xlsx.readFile(tamirPath);
  const tamirSheet = tamirWb.Sheets[tamirWb.SheetNames[0]];
  const tamirRange = xlsx.utils.decode_range(tamirSheet['!ref']);

  console.log('--- TESTING TAMİR PARSING ---');
  let tamirLogsCount = 0;
  for (let c = 0; c <= tamirRange.e.c; c++) {
    const headerVal = tamirSheet[xlsx.utils.encode_cell({r: 0, c})]?.v;
    if (!headerVal) continue;
    const plate = extractPlate(String(headerVal)) || 'Bilinmeyen';
    
    for (let r = 1; r <= tamirRange.e.r; r++) {
      const cellVal = tamirSheet[xlsx.utils.encode_cell({r, c})]?.v;
      if (!cellVal) continue;
      
      const txt = String(cellVal).trim();
      if (!txt) continue;
      
      const date = parseDate(txt) || '2024-01-01'; // Default fallback
      tamirLogsCount++;
      if (tamirLogsCount <= 10) {
        console.log(`[Tamir] Vehicle: ${plate} | Date: ${date} | Text: ${txt.substring(0, 80).replace(/\n/g, ' ')}...`);
      }
    }
  }
  console.log(`Total Tamir Logs parsed: ${tamirLogsCount}`);

  console.log('\n--- TESTING YAĞ BAKIM PARSING ---');
  const yagPath = path.join(__dirname, '..', 'public', 'data', 'yag_bakım_takip.xlsx');
  const yagWb = xlsx.readFile(yagPath);
  const yagSheet = yagWb.Sheets[yagWb.SheetNames[0]];
  const yagRange = xlsx.utils.decode_range(yagSheet['!ref']);

  let yagLogsCount = 0;
  for (let c = 0; c <= yagRange.e.c; c++) {
    const headerVal = yagSheet[xlsx.utils.encode_cell({r: 0, c})]?.v;
    if (!headerVal) continue;
    const plate = extractPlate(String(headerVal)) || 'Bilinmeyen';
    
    // Row 1 is baseline oil maintenance info
    const baselineVal = yagSheet[xlsx.utils.encode_cell({r: 1, c})]?.v;
    if (baselineVal) {
      const txt = String(baselineVal).trim();
      const date = parseDate(String(headerVal)) || '2024-09-01'; // Try to get date from header (e.g. 28/08/2024)
      yagLogsCount++;
      if (yagLogsCount <= 5) {
        console.log(`[Yag Baseline] Vehicle: ${plate} | Date: ${date} | Text: ${txt.substring(0, 80).replace(/\n/g, ' ')}...`);
      }
    }

    // Rows 2 to 9 are follow-up logs
    for (let r = 2; r <= yagRange.e.r; r++) {
      const cellVal = yagSheet[xlsx.utils.encode_cell({r, c})]?.v;
      if (!cellVal) continue;
      
      const txt = String(cellVal).trim();
      if (!txt) continue;
      
      // Let's split this cell into multiple blocks by dates
      // Dates look like: DD.MM.YYYY or DD/MM/YYYY or *DD/MM/YYYY* or *DD.MM.YYYY*
      // We can use a regex to find all dates and their indexes, then split the text
      const dateRegex = /(\d{2})[./-](\d{2})[./-](\d{4})/g;
      let matches = [];
      let match;
      while ((match = dateRegex.exec(txt)) !== null) {
        matches.push({
          index: match.index,
          dateStr: match[0],
          formattedDate: `${match[3]}-${match[2]}-${match[1]}`
        });
      }

      if (matches.length === 0) {
        // Just one log without a clear date, use header date or fallback
        const date = parseDate(String(headerVal)) || '2024-09-01';
        yagLogsCount++;
        if (yagLogsCount <= 10) {
          console.log(`[Yag Log No-Date] Vehicle: ${plate} | Date: ${date} | Text: ${txt.substring(0, 80).replace(/\n/g, ' ')}...`);
        }
      } else {
        // Split text by matches
        for (let i = 0; i < matches.length; i++) {
          const current = matches[i];
          const next = matches[i + 1];
          const start = current.index + current.dateStr.length;
          const end = next ? next.index : txt.length;
          let blockText = txt.substring(start, end).trim();
          // Remove leading/trailing asterisks or symbols
          blockText = blockText.replace(/^[\s*:*,*-]*|[\s*:*,*-]*$/g, '').trim();
          
          if (!blockText) {
            // If block text is empty, maybe the content is actually BEFORE the date or it's just a marker
            blockText = `Yağ/Antifriz kaydı: ${current.dateStr}`;
          }

          yagLogsCount++;
          if (yagLogsCount <= 15) {
            console.log(`[Yag Multi-Log] Vehicle: ${plate} | Date: ${current.formattedDate} | Text: ${blockText.substring(0, 80).replace(/\n/g, ' ')}...`);
          }
        }
      }
    }
  }
  console.log(`Total Yag Logs parsed: ${yagLogsCount}`);
}

testParser();
