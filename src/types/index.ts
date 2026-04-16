export interface InventoryItem {
  malzeme: string;
  adet: number;
  durum: "Tam" | "Eksik" | "Kayıp/Yok" | string;
}

export type CompartmentMap = Record<string, InventoryItem[]>;

export interface Vehicle {
  plaka: string;
  aracTipi: string;
  aktifPersonel: string[];
  bolmeler: CompartmentMap;
  km?: number;
  motorSaatiPTO?: number;
  durum?: "aktif" | "bakimda" | "arizali" | "pasif";
  sigortaBitis?: string;
  muayeneBitis?: string;
}

export interface Personnel {
  sicil_no: string;
  ad: string;
  soyad: string;
  rol: "sistem_yoneticisi" | "vardiya_cavusu" | "sofor" | "itfaiye_eri" | string;
  posta: string;
}

export interface MaintenanceLog {
  id: string;
  plaka: string;
  tip: "periyodik" | "ariza" | "kaza" | "revizyon";
  kmAt: number;
  ptoAt: number;
  aciklama: string;
  maliyet?: number;
  tarih: string;
  yapanKisi: string;
}

export interface FuelLog {
  id: string;
  plaka: string;
  litre: number;
  tutar: number;
  kmAt: number;
  istasyon: string;
  tarih: string;
  kayitEden: string;
}

export type ChecklistItem = {
  label: string;
  checked: boolean;
};

export interface TaskLog {
  id: string;
  plaka: string;
  tip: "devir_teslim" | "gunluk_kontrol" | "ariza_bildirimi" | "envanter_sayim";
  checklist: ChecklistItem[];
  durum: "beklemede" | "devam_ediyor" | "tamamlandi" | "iptal";
  notlar?: string;
  atanan: string;
  tarih: string;
  tamamlanmaTarihi?: string;
}
