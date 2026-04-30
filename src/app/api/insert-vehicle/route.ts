import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const vehicleData1 = {
    "marka": "Mercedes Atego",
    "aracTipi": "5 Nolu Arama-Kurtarma",
    "plaka": "58 TH 257",
    "bolmeler": {
      "sol_on_kapak": [
        { "malzeme": "Kaşık Sedye", "adet": 1, "durum": "Tam" },
        { "malzeme": "Tripot", "adet": 1, "durum": "Tam" },
        { "malzeme": "Amir Baltası", "adet": 1, "durum": "Tam" },
        { "malzeme": "Makaralı Kablo", "adet": 1, "durum": "Tam" },
        { "malzeme": "Jeneratör", "adet": 3, "durum": "Tam" },
        { "malzeme": "Projektör ve Ayağı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Şarjlı Projektör ve Ayağı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Kıyma Makinesi Açma Aparatları (Takım)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Hava Yastığı Şişirme Tüpü", "adet": 1, "durum": "Tam" },
        { "malzeme": "Spiral", "adet": 1, "durum": "Tam" },
        { "malzeme": "Küçük Spiral", "adet": 1, "durum": "Tam" },
        { "malzeme": "6 Kg'lık Yangın Söndürme Tüpü KKT", "adet": 2, "durum": "Tam" },
        { "malzeme": "Kurtarma Simidi", "adet": 2, "durum": "Tam" },
        { "malzeme": "Holigan", "adet": 1, "durum": "Tam" },
        { "malzeme": "Holmatro T1", "adet": 1, "durum": "Tam" },
        { "malzeme": "Holmatro Ayırıcı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Holmatro Kesici", "adet": 1, "durum": "Tam" }
      ],
      "sol_orta_kapak": [
        { "malzeme": "Rem (Kısa-Uzun Uzatma Desteği) (Takım)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Hidrant Anahtarı", "adet": 2, "durum": "Tam" },
        { "malzeme": "Hidrolik El Manueli ve Hortumu", "adet": 1, "durum": "Tam" },
        { "malzeme": "Küçük Hidrolik Manuel Güç Krikosu", "adet": 1, "durum": "Tam" },
        { "malzeme": "Hava Yastığı ve Şişirme Aparatları (Takım)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Manuel Debriyaj Kesme Aparatı (Takım)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Cam Kırma Aparatı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Emniyet Kemeri Kesme Aparatı", "adet": 2, "durum": "Tam" },
        { "malzeme": "Manuel Kapı Açma (Takım)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Ayırma Zinciri ve Uçları", "adet": 1, "durum": "Tam" },
        { "malzeme": "Direksiyon Airbag Koruyucusu", "adet": 1, "durum": "Tam" },
        { "malzeme": "Hidrolik Rem", "adet": 1, "durum": "Tam" },
        { "malzeme": "Ram Destekleyici", "adet": 1, "durum": "Tam" },
        { "malzeme": "Çoklu Şarjlı Alet Çantası", "adet": 1, "durum": "Tam" }
      ],
      "sol_arka_kapak": [
        { "malzeme": "Beton Kesme Motoru", "adet": 1, "durum": "Tam" },
        { "malzeme": "Kıvılcımsız Testere", "adet": 1, "durum": "Tam" },
        { "malzeme": "Holmatro Güç Ünitesi (Sabit)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Trifor ve Halatı", "adet": 1, "durum": "Tam" }
      ],
      "sag_orta_kapak": [
        { "malzeme": "85'lik Hortum", "adet": 5, "durum": "Tam" },
        { "malzeme": "85'lik Turbo Lans", "adet": 2, "durum": "Tam" },
        { "malzeme": "110'luk Turbo Lans", "adet": 2, "durum": "Tam" },
        { "malzeme": "110'luk Hortum", "adet": 5, "durum": "Tam" },
        { "malzeme": "Daraltma", "adet": 2, "durum": "Tam" },
        { "malzeme": "Alimünize Elbise (Takım)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Ağır Köpük Lansı -S2-", "adet": 1, "durum": "Tam" },
        { "malzeme": "Çıkrık ve Kolu", "adet": 1, "durum": "Tam" }
      ],
      "sag_arka_kapak": [
        { "malzeme": "Melanjör -Z4-", "adet": 1, "durum": "Tam" },
        { "malzeme": "85'lik Dirsek Lans", "adet": 1, "durum": "Tam" },
        { "malzeme": "85'lik Perde Lans", "adet": 1, "durum": "Tam" },
        { "malzeme": "Köpük Hortumu", "adet": 1, "durum": "Tam" },
        { "malzeme": "Figrasyon", "adet": 1, "durum": "Tam" },
        { "malzeme": "Dalgıç", "adet": 1, "durum": "Tam" }
      ],
      "arka_kapak_pompa_ustu": [
        { "malzeme": "Hava Yastığı 10-20-30-40 Ton Kapasiteli (Takım)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Yüz Koruma Levhası", "adet": 1, "durum": "Tam" },
        { "malzeme": "Rekor Anahtarı", "adet": 2, "durum": "Tam" }
      ],
      "arac_ustu": [
        { "malzeme": "Araç Zinciri (Takım)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Kanca", "adet": 2, "durum": "Tam" },
        { "malzeme": "Boyun Çizmesi", "adet": 1, "durum": "Tam" },
        { "malzeme": "Klepe", "adet": 2, "durum": "Tam" },
        { "malzeme": "Baltalı Kazma", "adet": 2, "durum": "Tam" },
        { "malzeme": "Kazma", "adet": 1, "durum": "Tam" },
        { "malzeme": "Balta", "adet": 3, "durum": "Tam" },
        { "malzeme": "Demir Kesme Makası (2 Büyük, 1 Küçük)", "adet": 3, "durum": "Tam" },
        { "malzeme": "Tekerlek Takozu (Metal)", "adet": 2, "durum": "Tam" },
        { "malzeme": "Manivela", "adet": 4, "durum": "Sonradan 4 olarak düzeltilmiş" },
        { "malzeme": "Balyoz (Takım)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Yılan Yakalama Aparatı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Kurtarma Sedye (2 Adet Süngerli)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Bez Sedye", "adet": 2, "durum": "Sandalye Sedye Notu Düşülmüş" },
        { "malzeme": "Kürek", "adet": 2, "durum": "Tam" },
        { "malzeme": "Alıcı Hortum", "adet": 1, "durum": "Tam" },
        { "malzeme": "Stepne ve Kurtarma Vinci", "adet": 1, "durum": "Tam" },
        { "malzeme": "Seyyar Merdiven", "adet": 1, "durum": "Tam" },
        { "malzeme": "Yer Altı T Anahtarı", "adet": 3, "durum": "Tam" },
        { "malzeme": "Tahta Takoz", "adet": 1, "durum": "Fazladan +1 Eklendi" },
        { "malzeme": "Battaniye", "adet": 1, "durum": "Tam" },
        { "malzeme": "Telsiz", "adet": 1, "durum": "Tam" },
        { "malzeme": "Tablet + Termal Kamera", "adet": 1, "durum": "Tam" },
        { "malzeme": "Şarjlı Ayaklı Projektör", "adet": 1, "durum": "Tam" },
        { "malzeme": "El Feneri", "adet": 1, "durum": "Çizilmiş / İptal" },
        { "malzeme": "Lastik Şişirme Hortumu", "adet": 5, "durum": "Tam" },
        { "malzeme": "Ceset Torbası", "adet": 1, "durum": "Tam" },
        { "malzeme": "Kriko", "adet": 2, "durum": "Tam" },
        { "malzeme": "Reflektör", "adet": 1, "durum": "Fazladan +2 Eklendi" }
      ],
      "arac_ici": [
        { "malzeme": "Yangın Battaniyesi", "adet": 1, "durum": "Fazladan +2 Eklendi" },
        { "malzeme": "Boyun Ateli", "adet": 5, "durum": "Tam" },
        { "malzeme": "Battaniye", "adet": 2, "durum": "Tam" },
        { "malzeme": "Kurtarma Bareti", "adet": 5, "durum": "Tam" },
        { "malzeme": "Kurtarma Eldiveni (Çift)", "adet": 5, "durum": "Fazladan +2 Eklendi" },
        { "malzeme": "Kurtarma Yeleği", "adet": 8, "durum": "Tam" },
        { "malzeme": "Dizlik (Çift)", "adet": 4, "durum": "Fazladan +1 Eklendi" },
        { "malzeme": "İlk Yardım Çantası", "adet": 1, "durum": "Tam" },
        { "malzeme": "220-380 Dönüştürücü Kablo", "adet": 1, "durum": "Tam" },
        { "malzeme": "Temiz Hava Solunum Cihazı", "adet": 4, "durum": "Tam" },
        { "malzeme": "Bez Çanta Anahtar Takımı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Emniyet Kemeri", "adet": 2, "durum": "El yazısı ile eklendi" },
        { "malzeme": "C Klos KBRNN Beyaz Tulum", "adet": 3, "durum": "El yazısı ile eklendi" }
      ],
      "sag_on_kapak": [
        { "malzeme": "Holmatro Ayırma Şarjlı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Holmatro Kesici Şarjlı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Holmatro Rem Şarjlı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Tahta Takoz", "adet": 4, "durum": "El yazısı ile eklendi" },
        { "malzeme": "Sapan", "adet": 1, "durum": "El yazısı ile eklendi" },
        { "malzeme": "Holmatro Rem Uzatma Başlığı", "adet": 2, "durum": "Tam" },
        { "malzeme": "Holmatro Rem Destek", "adet": 1, "durum": "Tam" },
        { "malzeme": "Hilti", "adet": 1, "durum": "Tam" },
        { "malzeme": "Statik İp (50 Metre)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Plastik Takoz", "adet": 4, "durum": "Tam" },
        { "malzeme": "Kulaklı 8 Demiri", "adet": 3, "durum": "Tam" },
        { "malzeme": "El Jumarı", "adet": 2, "durum": "Tam" },
        { "malzeme": "Karabina", "adet": 5, "durum": "Sonradan 5 olarak güncellenmiş" },
        { "malzeme": "Kurtarma Eldiveni", "adet": 5, "durum": "Eksik - 1 adet var" },
        { "malzeme": "Kapalı Perlon", "adet": 8, "durum": "Tam" },
        { "malzeme": "Kurtarma Makara (Tekli)", "adet": 2, "durum": "Tam" },
        { "malzeme": "Kurtarma Makara (Çiftli)", "adet": 2, "durum": "Tam" },
        { "malzeme": "Kurtarma Üçgeni", "adet": 2, "durum": "Tam" },
        { "malzeme": "Göğüs Jumarı", "adet": 2, "durum": "Tam" },
        { "malzeme": "Ekspres", "adet": 4, "durum": "Tam" },
        { "malzeme": "Kurtarma Kemeri (İsveç Oturağı ve Karabina)", "adet": 3, "durum": "Tam" },
        { "malzeme": "Bel Emniyet Kemeri", "adet": 2, "durum": "Tam" },
        { "malzeme": "Cam Kesme Testeresi", "adet": 1, "durum": "Tam" },
        { "malzeme": "Orta Köpük Lansı -M-", "adet": 1, "durum": "Tam" },
        { "malzeme": "Amir Baltası", "adet": 1, "durum": "Tam" },
        { "malzeme": "Tandem Makara", "adet": 2, "durum": "Tam" },
        { "malzeme": "Şan", "adet": 2, "durum": "Tam" },
        { "malzeme": "Anti Panik Sistemli İniş Aleti (ID)", "adet": 2, "durum": "1 araçta, 1 çantada var" },
        { "malzeme": "Ayak Perlonu", "adet": 1, "durum": "Tam" },
        { "malzeme": "8 Demiri", "adet": 2, "durum": "Tam" },
        { "malzeme": "Keser", "adet": 1, "durum": "Tam" },
        { "malzeme": "Çekiç", "adet": 1, "durum": "Tam" },
        { "malzeme": "Holmatro Şarj Kablosu", "adet": 3, "durum": "Tam" },
        { "malzeme": "Holmatro Ayırma Zinciri", "adet": 1, "durum": "Tam" },
        { "malzeme": "Kurtarma Üçgeni (Yeni)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Konumlandırılabilir Kurtarma Kemeri", "adet": 1, "durum": "Not: 2 adet isveç oturağı var" }
      ],
      "yuksek_aci_kurtarma_cantasi": [
        { "malzeme": "2'li Makara", "adet": 1, "durum": "Tam" },
        { "malzeme": "Tekli Makara", "adet": 1, "durum": "Tam" },
        { "malzeme": "Karabina", "adet": 3, "durum": "Tam" },
        { "malzeme": "Ekspres", "adet": 2, "durum": "Tam" },
        { "malzeme": "ATC", "adet": 1, "durum": "Tam" },
        { "malzeme": "Göğüs Jumarı", "adet": 1, "durum": "Tam" },
        { "malzeme": "El Jumarı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Ayak Jumarı", "adet": 1, "durum": "Tam" },
        { "malzeme": "8 Demiri", "adet": 1, "durum": "Tam" },
        { "malzeme": "Çift Emniyetli Karabina", "adet": 2, "durum": "Tam" }
      ],
      "halat_cantasi": [
        { "malzeme": "Kurtarma Halatı 12 MM (50 Metre)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Kurtarma Yardımcı Halatı 8 MM (50 Metre)", "adet": 1, "durum": "Tam" }
      ]
    }
  };

  const vehicleData2 = {
    "marka": "Mercedes Atego",
    "aracTipi": "2 Nolu İlk Müdahale",
    "plaka": "58 TH 256",
    "bolmeler": {
      "sag_on_kapak": [
        { "malzeme": "Jeneratör", "adet": 1, "durum": "Tam" },
        { "malzeme": "Rodex Şarjlı Alet Seti", "adet": 1, "durum": "Tam" },
        { "malzeme": "6 Kg'lık Yangın Söndürme Tüpü KKT", "adet": 2, "durum": "Tam" },
        { "malzeme": "Kare Kurtarma Takozu", "adet": 3, "durum": "Tam" },
        { "malzeme": "Kurtarma İpi", "adet": 2, "durum": "Tam" },
        { "malzeme": "Makaralı Kablo", "adet": 3, "durum": "Tam" },
        { "malzeme": "Elektrikli Araç Yangın Battaniyesi", "adet": 1, "durum": "Tam" },
        { "malzeme": "Baltalı Kemer", "adet": 1, "durum": "Tam" },
        { "malzeme": "Bel Emniyet Kemeri", "adet": 1, "durum": "Tam" },
        { "malzeme": "Kurtarma Kemeri (İsveç Oturağı)", "adet": 2, "durum": "Tam" },
        { "malzeme": "Büyük Makara", "adet": 2, "durum": "Tam" },
        { "malzeme": "Küçük Makara", "adet": 5, "durum": "Tam" },
        { "malzeme": "2'li Büyük Makara", "adet": 1, "durum": "Tam" },
        { "malzeme": "Karabina", "adet": 14, "durum": "Tam" },
        { "malzeme": "8 Demiri", "adet": 2, "durum": "Tam" },
        { "malzeme": "Kulaklı 8 Demiri", "adet": 1, "durum": "Tam" },
        { "malzeme": "Şan", "adet": 1, "durum": "Tam" },
        { "malzeme": "Göğüs Jumarı", "adet": 1, "durum": "Tam" },
        { "malzeme": "El Jumarı", "adet": 2, "durum": "Tam" },
        { "malzeme": "Perlon", "adet": 10, "durum": "Tam" },
        { "malzeme": "Anti Panik Sistemli İniş Aleti (ID)", "adet": 1, "durum": "Tam" }
      ],
      "sag_arka_kapak": [
        { "malzeme": "Kıvılcımsız Testere", "adet": 1, "durum": "Tam" },
        { "malzeme": "Araç Zincir Takımı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Spiral", "adet": 1, "durum": "Tam" },
        { "malzeme": "Perde Lans", "adet": 1, "durum": "Tam" },
        { "malzeme": "Figrasyon", "adet": 1, "durum": "Tam" },
        { "malzeme": "Melanjör", "adet": 1, "durum": "Tam" },
        { "malzeme": "Melanjör Hortumu", "adet": 1, "durum": "Tam" },
        { "malzeme": "Köpük Bidonu", "adet": 1, "durum": "Tam" }
      ],
      "sol_on_kapak": [
        { "malzeme": "Holmatro Güç Ünitesi", "adet": 1, "durum": "Tam" },
        { "malzeme": "Holmatro Kesici", "adet": 1, "durum": "Tam" },
        { "malzeme": "Holmatro Ayırıcı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Hava Yastığı Şişirme Aparatı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Kurtarma Kancası ve Uçları", "adet": 1, "durum": "Tam" },
        { "malzeme": "Hilti", "adet": 2, "durum": "Eksik - 1 adet var" },
        { "malzeme": "Amir Baltası", "adet": 1, "durum": "Tam" },
        { "malzeme": "Beton Kesme", "adet": 1, "durum": "Tam" },
        { "malzeme": "Çekiç", "adet": 1, "durum": "Tam" },
        { "malzeme": "Demir Kesme Makası", "adet": 1, "durum": "Tam" },
        { "malzeme": "Keser", "adet": 1, "durum": "Tam" },
        { "malzeme": "Rem Takımı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Hava Yastığı Şişirme Tüpü", "adet": 1, "durum": "Tam" },
        { "malzeme": "Rem Destek Takozu", "adet": 1, "durum": "Tam" },
        { "malzeme": "Holigan", "adet": 1, "durum": "Tam" }
      ],
      "sol_arka_kapak": [
        { "malzeme": "Holmatro T1", "adet": 1, "durum": "Tam" },
        { "malzeme": "85'lik Yangın Hortumu", "adet": 5, "durum": "Tam" },
        { "malzeme": "110'luk Yangın Hortumu", "adet": 5, "durum": "Tam" },
        { "malzeme": "110'luk Turbo Lans", "adet": 2, "durum": "Tam" },
        { "malzeme": "85'lik Turbo Lans", "adet": 5, "durum": "Tam" },
        { "malzeme": "Daraltma", "adet": 2, "durum": "Tam" },
        { "malzeme": "Ağır Köpük Lansı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Ala Hortum Süzgeci", "adet": 1, "durum": "Yok" },
        { "malzeme": "Rekor Anahtarı", "adet": 2, "durum": "Tam" },
        { "malzeme": "Ağaç Kesme Hızarı (Stihl)", "adet": 1, "durum": "Tam" },
        { "malzeme": "Hava Yastığı (Pompa Üzeri)", "adet": 4, "durum": "Tam" },
        { "malzeme": "Hidrant Anahtarı", "adet": 4, "durum": "Yok" }
      ],
      "arac_ustu": [
        { "malzeme": "Alıcı Hortum", "adet": 2, "durum": "Tam" },
        { "malzeme": "Redüksiyon", "adet": 1, "durum": "Tam" },
        { "malzeme": "Dalgıç Pompa", "adet": 1, "durum": "Tam" },
        { "malzeme": "Baltalı Kazma", "adet": 2, "durum": "Tam" },
        { "malzeme": "Kazma", "adet": 3, "durum": "Tam" },
        { "malzeme": "Kürek", "adet": 2, "durum": "Tam" },
        { "malzeme": "Yeraltı T Anahtarı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Seyyar Merdiven", "adet": 1, "durum": "Tam" },
        { "malzeme": "Kanca", "adet": 1, "durum": "Tam" },
        { "malzeme": "Manivela", "adet": 2, "durum": "Tam" },
        { "malzeme": "Tripot", "adet": 1, "durum": "Tam" },
        { "malzeme": "Çeki Halatı", "adet": 1, "durum": "Tam" },
        { "malzeme": "Sedye", "adet": 1, "durum": "Tam" },
        { "malzeme": "Kaşık Sedye", "adet": 1, "durum": "Tam" },
        { "malzeme": "Bez Sedye", "adet": 1, "durum": "Tam" },
        { "malzeme": "Balyoz", "adet": 2, "durum": "Tam" },
        { "malzeme": "Telsiz", "adet": 1, "durum": "Tam" }
      ],
      "arac_ici": [
        { "malzeme": "6 Kg'lık Yangın Söndürme Tüpü K.K.T", "adet": 1, "durum": "Tam" },
        { "malzeme": "Şarjlı Projektör", "adet": 1, "durum": "Tam" },
        { "malzeme": "Temiz Hava Solunum Cihazı", "adet": 4, "durum": "Tam" },
        { "malzeme": "Yangın Battaniyesi", "adet": 3, "durum": "Tam" },
        { "malzeme": "Arama Kurtarma Yeleği", "adet": 9, "durum": "Tam" },
        { "malzeme": "Kurtarma Kaskı", "adet": 4, "durum": "Tam" },
        { "malzeme": "110'luk Çarık", "adet": 1, "durum": "Tam" },
        { "malzeme": "Baltalı Emniyet Kemeri", "adet": 3, "durum": "Tam" },
        { "malzeme": "Küçük Fener", "adet": 1, "durum": "Tam" },
        { "malzeme": "İp", "adet": 1, "durum": "Tam" },
        { "malzeme": "Projektör", "adet": 1, "durum": "Tam" },
        { "malzeme": "Ceset Torbası", "adet": 1, "durum": "Tam" },
        { "malzeme": "Temiz Hava Solunum Cihazı Maske", "adet": 1, "durum": "Tam" },
        { "malzeme": "85'lik Çarık", "adet": 1, "durum": "Tam" }
      ]
    }
  };

  try {
    // 1. 58 TH 257 için FULL UPSERT
    const { data: data1, error: error1 } = await admin.from('vehicles').upsert({
      plaka: vehicleData1.plaka,
      arac_tipi: vehicleData1.aracTipi,
      bolmeler: vehicleData1.bolmeler,
      durum: 'aktif'
    }, { onConflict: 'plaka' }).select();

    if (error1) {
      return NextResponse.json({ success: false, error: error1.message }, { status: 500 });
    }

    // 2. 58 TH 256 için FULL UPSERT
    const { data: data2, error: error2 } = await admin.from('vehicles').upsert({
      plaka: vehicleData2.plaka,
      arac_tipi: vehicleData2.aracTipi,
      bolmeler: vehicleData2.bolmeler,
      durum: 'aktif'
    }, { onConflict: 'plaka' }).select();

    if (error2) {
      return NextResponse.json({ success: false, error: error2.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Araçlar 58 TH 257 ve 58 TH 256 tam kapasiteyle eklendi` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
