import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Personnel } from '@/types';

// PDF Export Function
export const exportShiftListToPDF = (personnelList: Personnel[], activePosta: number) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('SİVAS İTFAİYE MÜDÜRLÜĞÜ', 14, 22);
  
  doc.setFontSize(14);
  doc.text(`Günlük Nöbet Listesi - ${activePosta}. Posta`, 14, 30);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Oluşturulma Tarihi: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: tr })}`, 14, 36);
  
  // Table data
  const tableColumn = ["Sıra", "Sicil No", "Ad Soyad", "Ünvan", "Durum"];
  const tableRows: any[] = [];
  
  personnelList.forEach((person, index) => {
    const rowData = [
      (index + 1).toString(),
      person.sicil_no,
      `${person.ad} ${person.soyad}`,
      person.unvan,
      person.durum || 'Görevde'
    ];
    tableRows.push(rowData);
  });
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 42,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] }, // Blue theme for header
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didParseCell: function(data) {
      // Highlight absent personnel in red
      if (data.section === 'body' && data.column.index === 4) {
        if (data.cell.raw === 'İzinli' || data.cell.raw === 'Raporlu') {
          data.cell.styles.textColor = [220, 53, 69]; // Bootstrap danger red
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [40, 167, 69]; // Bootstrap success green
        }
      }
    }
  });
  
  const fileName = `Nobet_Listesi_Posta_${activePosta}_${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(fileName);
};

// Excel Export Function
export const exportShiftListToExcel = (personnelList: Personnel[], activePosta: number) => {
  const exportData = personnelList.map((person, index) => ({
    "Sıra": index + 1,
    "Sicil No": person.sicil_no,
    "Ad": person.ad,
    "Soyad": person.soyad,
    "Ünvan": person.unvan,
    "Durum": person.durum || 'Görevde'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  
  // Format header row (not fully supported by free version of sheetjs but setting widths is)
  const wscols = [
    { wch: 5 },  // Sıra
    { wch: 15 }, // Sicil No
    { wch: 20 }, // Ad
    { wch: 20 }, // Soyad
    { wch: 20 }, // Ünvan
    { wch: 15 }  // Durum
  ];
  worksheet['!cols'] = wscols;

  XLSX.utils.book_append_sheet(workbook, worksheet, `${activePosta}. Posta Nöbet`);
  
  const fileName = `Nobet_Listesi_Posta_${activePosta}_${format(new Date(), "yyyyMMdd")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
