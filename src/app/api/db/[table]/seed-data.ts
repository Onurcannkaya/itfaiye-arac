/**
 * Araç filosu seed verisi ve araç tipine göre varsayılan bölme/malzeme setleri.
 * (Eskiden route.ts içindeydi; okunabilirlik için ayrıldı.)
 */

export interface SeedVehicle {
  plaka: string;
  arac_tipi: string;
  marka: string;
  model: string;
  yil: number;
  su_kapasite: number;
  kopuk_kapasite: number;
  istasyon: string;
}

export const REAL_VEHICLES: SeedVehicle[] = [
  { plaka: "58 AEL 289", arac_tipi: "Arazöz", marka: "IVECO", model: "Iveco Eurocargo", yil: 2020, su_kapasite: 6000, kopuk_kapasite: 500, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AP 614", arac_tipi: "Merdivenli", marka: "FORD", model: "Ford Cargo Merdiven", yil: 2015, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Esentepe Şubesi" },
  { plaka: "58 FR 021", arac_tipi: "Tanker", marka: "BMC", model: "BMC Fatih Tanker", yil: 2016, su_kapasite: 18000, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 FP 968", arac_tipi: "Arazöz", marka: "BMC", model: "BMC Profesyonel Arazöz", yil: 2014, su_kapasite: 8000, kopuk_kapasite: 800, istasyon: "Fatih İstasyonu" },
  { plaka: "58 NN 694", arac_tipi: "Lojistik", marka: "FIAT", model: "Fiat Doblo", yil: 2018, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 FR 872", arac_tipi: "Arazöz", marka: "HINO", model: "Hino Arazöz", yil: 2008, su_kapasite: 4000, kopuk_kapasite: 300, istasyon: "Merkez İstasyonu" },
  { plaka: "58 TU 817", arac_tipi: "Merdivenli", marka: "FORD", model: "Ford Platform Merdivenli", yil: 2019, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Kılavuz İstasyonu" },
  { plaka: "58 TL 737", arac_tipi: "Lojistik", marka: "FORD", model: "Ford Transit Klavuz", yil: 2012, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "34 UP 2541", arac_tipi: "Kurtarma", marka: "MERCEDES", model: "Mercedes Sprinter Kurtarma", yil: 2017, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 ACT 367", arac_tipi: "Arazöz", marka: "FORD", model: "Ford Arazöz", yil: 2021, su_kapasite: 6000, kopuk_kapasite: 500, istasyon: "Merkez İstasyonu" },
  { plaka: "58 ACU 765", arac_tipi: "Arazöz", marka: "MAN", model: "MAN Arazöz", yil: 2018, su_kapasite: 10000, kopuk_kapasite: 1000, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AP 601", arac_tipi: "Merdivenli", marka: "FORD", model: "Ford Cargo Merdiven", yil: 2010, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AY 164", arac_tipi: "Antika", marka: "FORD", model: "Antika Merdiven", yil: 1960, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AC 113", arac_tipi: "Antika", marka: "DODGE", model: "Antika Dodge 1936", yil: 1936, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 DK 650", arac_tipi: "Merdivenli", marka: "MERCEDES", model: "Organize Sanayi Merdivenli", yil: 2015, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Organize İstasyonu" },
  { plaka: "58 TH 256", arac_tipi: "Kurtarma", marka: "IVECO", model: "Iveco Daily Hızlı Müdahale", yil: 2022, su_kapasite: 1000, kopuk_kapasite: 100, istasyon: "Merkez İstasyonu" },
  { plaka: "58 TH 257", arac_tipi: "Kurtarma", marka: "IVECO", model: "Iveco Arama Kurtarma", yil: 2022, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AF 240", arac_tipi: "Tanker", marka: "BMC", model: "BMC Organize Tanker", yil: 2013, su_kapasite: 15000, kopuk_kapasite: 0, istasyon: "Organize İstasyonu" },
  { plaka: "58 NC 182", arac_tipi: "Kurtarma", marka: "MERCEDES", model: "Mercedes 8 Numara Arazöz", yil: 2005, su_kapasite: 3000, kopuk_kapasite: 200, istasyon: "Merkez İstasyonu" },
  { plaka: "58 NC 184", arac_tipi: "Merdivenli", marka: "MERCEDES", model: "Mercedes 54 Metre Dev Merdiven", yil: 2012, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 TD 315", arac_tipi: "Lojistik", marka: "HYUNDAI", model: "Hyundai Accent Lojistik", yil: 2011, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AGF 355", arac_tipi: "Arazöz", marka: "RENAULT", model: "Renault Midlum Arazöz", yil: 2020, su_kapasite: 7000, kopuk_kapasite: 600, istasyon: "Merkez İstasyonu" },
  { plaka: "58 AEH 221", arac_tipi: "Merdivenli", marka: "MAN", model: "MAN 42m Merdivenli", yil: 2016, su_kapasite: 0, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" },
  { plaka: "58 HD 458", arac_tipi: "Tanker", marka: "MERCEDES", model: "Mercedes Actros 22 Ton Tanker", yil: 2018, su_kapasite: 22000, kopuk_kapasite: 0, istasyon: "Merkez İstasyonu" }
];

export function getPresetCompartments(type: string) {
  switch (type) {
    case "Arazöz":
      return {
        kabin_ici: [
          { malzeme: "Kriko", adet: 1, durum: "Tam" },
          { malzeme: "Lastik Şişirme Aparatı", adet: 1, durum: "Tam" },
          { malzeme: "Çeki Demiri", adet: 1, durum: "Tam" },
          { malzeme: "Şarjlı Projektör", adet: 1, durum: "Tam" }
        ],
        sag_on_kapak: [
          { malzeme: "Ayaklı Aydınlatma Lambası", adet: 1, durum: "Tam" },
          { malzeme: "Jeneratör", adet: 1, durum: "Tam" },
          { malzeme: "Hidrolik Güç Ünitesi", adet: 1, durum: "Tam" },
          { malzeme: "Hidrolik Kesici", adet: 1, durum: "Tam" },
          { malzeme: "Hidrolik Ayırıcı", adet: 2, durum: "Tam" }
        ],
        sol_arka_kapak: [
          { malzeme: "85'lik Hortum", adet: 5, durum: "Tam" },
          { malzeme: "85'lik Turbo Lans", adet: 2, durum: "Tam" },
          { malzeme: "85'lik Kollu Lans", adet: 2, durum: "Tam" },
          { malzeme: "Ağır Köpük Lansı", adet: 1, durum: "Tam" }
        ]
      };
    case "Hızlı Müdahale":
      return {
        sol_on_kapak: [
          { malzeme: "Holmatro Güç Ünitesi", adet: 1, durum: "Tam" },
          { malzeme: "Holmatro Kesici", adet: 1, durum: "Tam" },
          { malzeme: "Holmatro Ayırıcı", adet: 1, durum: "Tam" },
          { malzeme: "Hilti", adet: 1, durum: "Tam" },
          { malzeme: "Amir Baltası", adet: 1, durum: "Tam" }
        ],
        sol_arka_kapak: [
          { malzeme: "85'lik Hortum", adet: 5, durum: "Tam" },
          { malzeme: "85'lik Turbo Lans", adet: 2, durum: "Tam" },
          { malzeme: "Ala Hortum Süzgeci", adet: 1, durum: "Tam" }
        ],
        arac_ustu: [
          { malzeme: "Alıcı Hortum", adet: 2, durum: "Tam" },
          { malzeme: "Dalgıç Pompa", adet: 1, durum: "Tam" },
          { malzeme: "Seyyar Merdiven", adet: 1, durum: "Tam" }
        ]
      };
    case "Kurtarma":
      return {
        sol_on_kapak: [
          { malzeme: "Kaşık Sedye", adet: 1, durum: "Tam" },
          { malzeme: "Tripot", adet: 1, durum: "Tam" },
          { malzeme: "Jeneratör", adet: 2, durum: "Tam" }
        ],
        sol_orta_kapak: [
          { malzeme: "Hidrolik El Manueli ve Hortumu", adet: 1, durum: "Tam" },
          { malzeme: "Manuel Kapı Açma", adet: 1, durum: "Tam" },
          { malzeme: "Cam Kırma Aparatı", adet: 1, durum: "Tam" }
        ],
        sol_arka_kapak: [
          { malzeme: "Beton Kesme Motoru", adet: 1, durum: "Tam" },
          { malzeme: "Kıvılcımsız Testere", adet: 1, durum: "Tam" },
          { malzeme: "Trifor ve Halatı", adet: 1, durum: "Tam" }
        ],
        sag_on_kapak: [
          { malzeme: "Holmatro Ayırma Şarjlı", adet: 1, durum: "Tam" },
          { malzeme: "Holmatro Kesici Şarjlı", adet: 1, durum: "Tam" },
          { malzeme: "Tahta Takoz", adet: 4, durum: "Tam" },
          { malzeme: "Sapan", adet: 1, durum: "Tam" }
        ]
      };
    case "Merdivenli":
      return {
        arac_ici: [
          { malzeme: "El Feneri", adet: 3, durum: "Tam" },
          { malzeme: "Yangın Battaniyesi", adet: 1, durum: "Tam" },
          { malzeme: "Yaralı Sabitleme Sargısı", adet: 2, durum: "Tam" }
        ],
        sag_on_kapak: [
          { malzeme: "6 KG YSK Tüpü", adet: 2, durum: "Tam" },
          { malzeme: "Temiz Hava Solunum Cihazı", adet: 2, durum: "Tam" }
        ],
        sol_on_kapak: [
          { malzeme: "Büyük Amir Baltası", adet: 1, durum: "Tam" },
          { malzeme: "Büyük Balta", adet: 1, durum: "Tam" },
          { malzeme: "Duba", adet: 2, durum: "Tam" }
        ]
      };
    case "Lojistik":
    case "Tanker":
    default:
      return {
        kabin_ici: [
          { malzeme: "İlk Yardım Çantası", adet: 1, durum: "Tam" },
          { malzeme: "El Feneri", adet: 2, durum: "Tam" }
        ],
        arka_bolme: [
          { malzeme: "85'lik Hortum", adet: 4, durum: "Tam" },
          { malzeme: "Alıcı Hortum Süzgeci", adet: 1, durum: "Tam" },
          { malzeme: "85'lik Kollu Lans", adet: 2, durum: "Tam" }
        ]
      };
  }
}
