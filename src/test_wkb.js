function parseWKBPoint(wkbHex) {
  if (!wkbHex || typeof wkbHex !== 'string') return null;
  // Clean string
  const cleanHex = wkbHex.trim();
  if (cleanHex.length < 50) return null; // A point is at least 21 bytes (42 hex chars) or 25 bytes (50 hex chars) with SRID
  
  // Little endian check
  const isLittleEndian = cleanHex.substring(0, 2) === '01';
  
  // Offset for coordinates
  // standard WKB: 1 byte byte-order + 4 bytes type + 8 bytes X + 8 bytes Y = 21 bytes (42 chars)
  // EWKB (with SRID): 1 byte byte-order + 4 bytes type + 4 bytes SRID + 8 bytes X + 8 bytes Y = 25 bytes (50 chars)
  // Let's determine by checking type
  const type = cleanHex.substring(2, 10);
  let coordsHex = '';
  if (type === '01000020' || type === '20000001') {
    // EWKB Point (with SRID)
    coordsHex = cleanHex.substring(18);
  } else if (type === '01000000' || type === '00000001') {
    // Standard WKB Point
    coordsHex = cleanHex.substring(10);
  } else {
    // Try to auto-detect based on length
    if (cleanHex.length === 50) {
      coordsHex = cleanHex.substring(18);
    } else if (cleanHex.length === 42) {
      coordsHex = cleanHex.substring(10);
    } else {
      return null;
    }
  }

  if (coordsHex.length < 32) return null;

  const xHex = coordsHex.substring(0, 16);
  const yHex = coordsHex.substring(16, 32);

  const hexToDouble = (hexStr) => {
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      const byteHex = hexStr.substring(i * 2, i * 2 + 2);
      bytes[isLittleEndian ? i : 7 - i] = parseInt(byteHex, 16);
    }
    const view = new DataView(bytes.buffer);
    return view.getFloat64(0, true);
  };

  const x = hexToDouble(xHex);
  const y = hexToDouble(yHex);

  return [x, y];
}

console.log("Parsed point:", parseWKBPoint('0101000020E610000018971AAAF47E42406041F41313DF4340'));
