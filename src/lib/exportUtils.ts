import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Personnel } from '@/types';

// ─── Hiyerarşik Rütbe Sıralaması ───────────────────────────
function getUnvanPriority(unvan: string): number {
  const u = (unvan || '').toLowerCase().replace(/\./g, '');
  if (u.includes('müdür')) return 0;
  if (u.includes('amir')) return 1;
  if (u.includes('başçavuş') || u.includes('baş çvş') || u === 'başçvş') return 2;
  if (u.includes('eğitim çavuşu')) return 3;
  if (u.includes('çavuş') || u.includes('çvş')) return 3;
  if (u.includes('santral')) return 4;
  if (u.includes('baş şoför') || u.includes('başşoför') || u.includes('posbaş şof') || u.includes('posbaş şoför')) return 5;
  if (u.includes('şoför') || u.includes('şof')) return 6;
  if (u.includes('er') || u.includes('itfaiye eri')) return 7;
  return 8;
}

function sortByHierarchy(list: Personnel[]): Personnel[] {
  return [...list].sort((a, b) => {
    const pa = getUnvanPriority(a.unvan);
    const pb = getUnvanPriority(b.unvan);
    if (pa !== pb) return pa - pb;
    return (a.ad || '').localeCompare(b.ad || '', 'tr');
  });
}

// ─── Station definitions ──────────────────────────────────
interface StationDef {
  label: string;
  match: (istasyon?: string) => boolean;
}

const STATIONS: StationDef[] = [
  { label: 'Merkez İtfaiye Müdürlüğü', match: (ist) => !ist || ist.includes('Merkez') },
  { label: 'Esentepe Şubesi', match: (ist) => !!ist && ist.includes('Esentepe') },
  { label: 'Organize Sanayi Bölgesi Şubesi', match: (ist) => !!ist && (ist.includes('Organize') || ist.includes('OSB')) },
];

function groupByStation(personnelList: Personnel[]): { label: string; personnel: Personnel[] }[] {
  return STATIONS
    .map(s => ({
      label: s.label,
      personnel: sortByHierarchy(personnelList.filter(p => s.match(p.istasyon))),
    }))
    .filter(g => g.personnel.length > 0);
}

// ═══════════════════════════════════════════════════════════
// PDF Export — Station-Grouped
// ═══════════════════════════════════════════════════════════
export const exportShiftListToPDF = (personnelList: Personnel[], activePosta: number) => {
  const doc = new jsPDF();
  const groups = groupByStation(personnelList);

  // Title
  doc.setFontSize(18);
  doc.text('SİVAS İTFAİYE MÜDÜRLÜĞÜ', 14, 22);

  doc.setFontSize(14);
  doc.text(`Günlük Nöbet Listesi - ${activePosta}. Posta`, 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Oluşturulma Tarihi: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: tr })}`, 14, 36);

  let startY = 44;
  const tableColumn = ["Sıra", "Sicil No", "Ad Soyad", "Ünvan", "Durum"];

  groups.forEach((group) => {
    // Station section header
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`📍 ${group.label}`, 14, startY);
    startY += 4;

    const tableRows: any[] = [];
    group.personnel.forEach((person, index) => {
      tableRows.push([
        (index + 1).toString(),
        person.sicil_no,
        `${person.ad} ${person.soyad}`,
        person.unvan,
        person.durum || 'Görevde'
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'İzinli' || data.cell.raw === 'Raporlu') {
            data.cell.styles.textColor = [220, 53, 69];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [40, 167, 69];
          }
        }
      },
      didDrawPage: function(data) {
        startY = (data.cursor?.y ?? startY) + 12;
      }
    });

    // Get final Y after table
    startY = (doc as any).lastAutoTable?.finalY + 12 || startY + 12;

    // Check if we need a new page
    if (startY > 260) {
      doc.addPage();
      startY = 20;
    }
  });

  const fileName = `Nobet_Listesi_Posta_${activePosta}_${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(fileName);
};

// ═══════════════════════════════════════════════════════════
// Excel Export — Station-Grouped with separate sheets
// ═══════════════════════════════════════════════════════════
export const exportShiftListToExcel = (personnelList: Personnel[], activePosta: number) => {
  const groups = groupByStation(personnelList);
  const workbook = XLSX.utils.book_new();

  const wscols = [
    { wch: 5 },  // Sıra
    { wch: 15 }, // Sicil No
    { wch: 20 }, // Ad
    { wch: 20 }, // Soyad
    { wch: 20 }, // Ünvan
    { wch: 12 }, // İstasyon
    { wch: 15 }  // Durum
  ];

  groups.forEach((group) => {
    const exportData = group.personnel.map((person, index) => ({
      "Sıra": index + 1,
      "Sicil No": person.sicil_no,
      "Ad": person.ad,
      "Soyad": person.soyad,
      "Ünvan": person.unvan,
      "İstasyon": group.label,
      "Durum": person.durum || 'Görevde'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = wscols;

    // Sheet name max 31 chars
    const sheetName = group.label.length > 31 ? group.label.substring(0, 31) : group.label;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const fileName = `Nobet_Listesi_Posta_${activePosta}_${format(new Date(), "yyyyMMdd")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
