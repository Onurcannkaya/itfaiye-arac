import { Vehicle, Personnel, MaintenanceLog, FuelLog, TaskLog } from "@/types";

export const mockVehicles: Vehicle[] = [
  {
    plaka: "58 ACT 367",
    aracTipi: "Ford Arazöz",
    aktifPersonel: ["Mustafa Köse", "Onurcan Kaya"],
    km: 78420,
    motorSaatiPTO: 2145,
    durum: "aktif",
    sigortaBitis: "2026-11-20",
    muayeneBitis: "2026-08-15",
    bolmeler: {
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
    }
  },
  {
    plaka: "58 TH 256",
    aracTipi: "İlk Müdahale Atego",
    aktifPersonel: ["Melih Arslan", "Selahattin Tosun"],
    km: 45230,
    motorSaatiPTO: 1287,
    durum: "aktif",
    sigortaBitis: "2026-09-15",
    muayeneBitis: "2026-07-20",
    bolmeler: {
      sol_on_kapak: [
        { malzeme: "Holmatro Güç Ünitesi", adet: 1, durum: "Tam" },
        { malzeme: "Holmatro Kesici", adet: 1, durum: "Tam" },
        { malzeme: "Holmatro Ayırıcı", adet: 1, durum: "Tam" },
        { malzeme: "Hilti", adet: 2, durum: "Eksik - 1 adet var" },
        { malzeme: "Amir Baltası", adet: 1, durum: "Tam" }
      ],
      sol_arka_kapak: [
        { malzeme: "85'lik Yangın Hortumu", adet: 5, durum: "Tam" },
        { malzeme: "110'luk Turbo Lans", adet: 2, durum: "Tam" },
        { malzeme: "Ala Hortum Süzgeci", adet: 1, durum: "Kayıp/Yok" },
        { malzeme: "Hava Yastığı (Pompa Üzeri)", adet: 4, durum: "Tam" }
      ],
      arac_ustu: [
        { malzeme: "Alıcı Hortum", adet: 2, durum: "Tam" },
        { malzeme: "Dalgıç Pompa", adet: 1, durum: "Tam" },
        { malzeme: "Seyyar Merdiven", adet: 1, durum: "Tam" }
      ]
    }
  },
  {
    plaka: "58 TH 257",
    aracTipi: "5 Nolu Atego Arama-Kurtarma",
    aktifPersonel: ["İsmail Aslan", "Muhammed Enes Yıldırım"],
    km: 32150,
    motorSaatiPTO: 940,
    durum: "aktif",
    sigortaBitis: "2026-10-10",
    muayeneBitis: "2026-05-12",
    bolmeler: {
      sol_on_kapak: [
        { malzeme: "Kaşık Sedye", adet: 1, durum: "Tam" },
        { malzeme: "Tripot", adet: 1, durum: "Tam" },
        { malzeme: "Jeneratör", adet: 3, durum: "Tam" },
        { malzeme: "Kıyma Makinesi Açma Aparatları", adet: 1, durum: "Tam" }
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
        { malzeme: "Tahta Takoz", adet: 4, durum: "Ek Not" },
        { malzeme: "Sapan", adet: 1, durum: "Ek Not" }
      ]
    }
  },
  {
    plaka: "58 AEH 221",
    aracTipi: "42 Metre MAN",
    aktifPersonel: ["Uğur Budak", "Mustafa Demir"],
    km: 18400,
    motorSaatiPTO: 450,
    durum: "aktif",
    sigortaBitis: "2026-12-01",
    muayeneBitis: "2026-11-15",
    bolmeler: {
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
    }
  },
  {
    plaka: "58 FP 968",
    aracTipi: "BMC Fatih Arazöz",
    aktifPersonel: ["Muhammed Yasir İnce", "Muhammed Kara"],
    km: 145000,
    motorSaatiPTO: 5600,
    durum: "aktif",
    sigortaBitis: "2026-06-25",
    muayeneBitis: "2026-03-10",
    bolmeler: {
      sol_on_kapak: [
        { malzeme: "Kazma", adet: 1, durum: "Tam" },
        { malzeme: "Kürek", adet: 3, durum: "Tam" },
        { malzeme: "Tank Isıtma Kablosu", adet: 1, durum: "Tam" }
      ],
      sol_arka_kapak: [
        { malzeme: "Daraltma", adet: 1, durum: "Tam" },
        { malzeme: "Demir Kesme Makası", adet: 1, durum: "Tam" },
        { malzeme: "T Anahtarı", adet: 1, durum: "Tam" }
      ]
    }
  }
];

export const mockPersonnel: Personnel[] = [
  { sicil_no: "SIV-0042", ad: "Ömer", soyad: "Çakmak", rol: "vardiya_cavusu", posta: "A Postası" },
  { sicil_no: "SIV-0087", ad: "Hidayet", soyad: "Yücekaya", rol: "vardiya_cavusu", posta: "B Postası" },
  { sicil_no: "SIV-0103", ad: "Mustafa", soyad: "Köse", rol: "sofor", posta: "A Postası" },
  { sicil_no: "SIV-0115", ad: "Onurcan", soyad: "Kaya", rol: "itfaiye_eri", posta: "A Postası" },
  { sicil_no: "SIV-0120", ad: "Melih", soyad: "Arslan", rol: "sofor", posta: "B Postası" },
  { sicil_no: "SIV-0125", ad: "Selahattin", soyad: "Tosun", rol: "itfaiye_eri", posta: "B Postası" },
  { sicil_no: "SIV-0130", ad: "İsmail", soyad: "Aslan", rol: "itfaiye_eri", posta: "A Postası" },
  { sicil_no: "SIV-0131", ad: "Muhammed", soyad: "Enes Yıldırım", rol: "itfaiye_eri", posta: "A Postası" },
  { sicil_no: "SIV-0132", ad: "Uğur", soyad: "Budak", rol: "itfaiye_eri", posta: "B Postası" },
  { sicil_no: "SIV-0133", ad: "Mustafa", soyad: "Demir", rol: "sofor", posta: "B Postası" },
  { sicil_no: "SIV-0134", ad: "Muhammed", soyad: "Yasir İnce", rol: "itfaiye_eri", posta: "C Postası" },
  { sicil_no: "SIV-0135", ad: "Muhammed", soyad: "Kara", rol: "itfaiye_eri", posta: "C Postası" },

];

export const mockMaintenanceLogs: MaintenanceLog[] = [
  {
    id: "m-001",
    plaka: "58 ACT 367",
    tip: "periyodik",
    kmAt: 75000,
    ptoAt: 2000,
    aciklama: "Motor yağı ve filtre değişimi. Fren balataları kontrol edildi.",
    maliyet: 4500,
    tarih: "2026-03-10",
    yapanKisi: "Mustafa Köse"
  },
  {
    id: "m-002",
    plaka: "58 TH 256",
    tip: "ariza",
    kmAt: 44800,
    ptoAt: 1280,
    aciklama: "Pompa valfinde sızıntı tespit edildi. Conta değiştirildi.",
    maliyet: 1200,
    tarih: "2026-03-22",
    yapanKisi: "Melih Arslan"
  },
  {
    id: "m-003",
    plaka: "58 ACT 367",
    tip: "periyodik",
    kmAt: 70000,
    ptoAt: 1850,
    aciklama: "PTO 1800 saat periyodik bakımı. Hidrolik yağ değişimi yapıldı.",
    maliyet: 7800,
    tarih: "2026-01-15",
    yapanKisi: "Mustafa Köse"
  },
  {
    id: "m-004",
    plaka: "58 TH 256",
    tip: "revizyon",
    kmAt: 40000,
    ptoAt: 1100,
    aciklama: "Şanzıman revizyonu. Debriyaj seti komple değiştirildi.",
    maliyet: 18500,
    tarih: "2025-11-05",
    yapanKisi: "Selahattin Tosun"
  }
];

export const mockFuelLogs: FuelLog[] = [
  {
    id: "f-001",
    plaka: "58 ACT 367",
    litre: 120,
    tutar: 5040,
    kmAt: 78200,
    istasyon: "Sivas Belediye Akaryakıt",
    tarih: "2026-04-14",
    kayitEden: "Mustafa Köse"
  },
  {
    id: "f-002",
    plaka: "58 TH 256",
    litre: 85,
    tutar: 3570,
    kmAt: 45100,
    istasyon: "Sivas Belediye Akaryakıt",
    tarih: "2026-04-13",
    kayitEden: "Melih Arslan"
  },
  {
    id: "f-003",
    plaka: "58 ACT 367",
    litre: 130,
    tutar: 5460,
    kmAt: 77500,
    istasyon: "Sivas Belediye Akaryakıt",
    tarih: "2026-04-05",
    kayitEden: "Onurcan Kaya"
  },
  {
    id: "f-004",
    plaka: "58 TH 256",
    litre: 90,
    tutar: 3780,
    kmAt: 44600,
    istasyon: "Petrol Ofisi Kaleardı",
    tarih: "2026-03-28",
    kayitEden: "Selahattin Tosun"
  }
];

export const mockTaskLogs: TaskLog[] = [
  {
    id: "t-001",
    plaka: "58 ACT 367",
    tip: "devir_teslim",
    checklist: [
      { label: "Motor yağ seviyesi kontrolü", checked: true },
      { label: "Antifriz/su seviyesi kontrolü", checked: true },
      { label: "Pompa çalışma testi", checked: true },
      { label: "Telsiz çalışma kontrolü", checked: true },
      { label: "Lastik basınçları kontrolü", checked: false },
      { label: "Farlar ve ikaz lambaları testi", checked: true },
    ],
    durum: "devam_ediyor",
    atanan: "Mustafa Köse",
    tarih: "2026-04-16",
    notlar: "Sağ arka lastik basıncı düşük, kompresörle şişirilecek."
  },
  {
    id: "t-002",
    plaka: "58 TH 256",
    tip: "devir_teslim",
    checklist: [
      { label: "Motor yağ seviyesi kontrolü", checked: true },
      { label: "Antifriz/su seviyesi kontrolü", checked: true },
      { label: "Pompa çalışma testi", checked: true },
      { label: "Telsiz çalışma kontrolü", checked: true },
      { label: "Lastik basınçları kontrolü", checked: true },
      { label: "Farlar ve ikaz lambaları testi", checked: true },
    ],
    durum: "tamamlandi",
    atanan: "Melih Arslan",
    tarih: "2026-04-16",
    tamamlanmaTarihi: "2026-04-16T08:30:00"
  },
  {
    id: "t-003",
    plaka: "58 TH 256",
    tip: "ariza_bildirimi",
    checklist: [
      { label: "Arıza tanımı yapıldı", checked: true },
      { label: "Fotoğraf eklendi", checked: false },
      { label: "Amire bildirildi", checked: true },
    ],
    durum: "tamamlandi",
    atanan: "Selahattin Tosun",
    tarih: "2026-04-15",
    tamamlanmaTarihi: "2026-04-15T14:20:00",
    notlar: "Sol ön kapaktaki Hilti'nin motoru yanmış. Yenisi talep edildi."
  },
  {
    id: "t-004",
    plaka: "58 ACT 367",
    tip: "envanter_sayim",
    checklist: [
      { label: "Kabin İçi sayıldı", checked: true },
      { label: "Sağ Ön Kapak sayıldı", checked: true },
      { label: "Sol Arka Kapak sayıldı", checked: true },
    ],
    durum: "tamamlandi",
    atanan: "Onurcan Kaya",
    tarih: "2026-04-14",
    tamamlanmaTarihi: "2026-04-14T16:00:00"
  }
];
