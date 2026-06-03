import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// ─── Turkish character normalization ────────────────────────────────────────
function removeTurkishChars(str: string): string {
  const map: Record<string, string> = {
    İ: "i", ı: "i", Ö: "o", ö: "o", Ü: "u", ü: "u",
    Ş: "s", ş: "s", Ç: "c", ç: "c", Ğ: "g", ğ: "g",
  };
  return str.replace(/[İıÖöÜüŞşÇçĞğ]/g, (ch) => map[ch] || ch);
}

// ─── Username generator ────────────────────────────────────────────────────
function generateUsername(ad: string, soyad: string): string {
  const firstLetter = removeTurkishChars(ad.charAt(0)).toLowerCase();
  const surname = removeTurkishChars(soyad).toLowerCase();
  return firstLetter + surname;
}

// ─── Random 6-char password (lowercase + digits) ───────────────────────────
function generateRandomPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let pw = "";
  for (let i = 0; i < 6; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

// ─── Posta mapping ─────────────────────────────────────────────────────────
function postaFromNo(postaNo: number): string {
  switch (postaNo) {
    case 0: return "İdari Kadro";
    case 1: return "1. Posta";
    case 2: return "2. Posta";
    case 3: return "3. Posta";
    default: return "İdari Kadro";
  }
}

// ─── Personnel type definition ─────────────────────────────────────────────
interface PersonnelEntry {
  sicil_no: string;
  ad: string;
  soyad: string;
  unvan: string;
  rol: string;
  posta_no: number;
  istasyon: string;
  view_only: boolean;
  can_approve: boolean;
  can_print: boolean;
}

// ─── MEMUR KADRO (92 people, SB5801–SB5893, SB5826 is developer) ──────────
const MEMUR_LIST_RAW: Omit<PersonnelEntry, "sicil_no">[] = [
  // İDARİ CADRO (17 people)
  { ad: "İbrahim", soyad: "Alaçam", unvan: "Müdür", rol: "Admin", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Ahmet", soyad: "Çelimli", unvan: "Amir", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Ahmet", soyad: "Yıldız", unvan: "Amir", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "İrfan", soyad: "Kandur", unvan: "Amir", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Seyfi Ali", soyad: "Gül", unvan: "Amir", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Ahmet", soyad: "Boztaş", unvan: "Amir", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Ebubekir", soyad: "Kuzgun", unvan: "İdari İşler", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Bilal", soyad: "Demir", unvan: "Baş Şoför", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Ömer", soyad: "Çakmak", unvan: "Eğitim Çavuşu", rol: "Shift_Leader", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Muhsin", soyad: "Güzey", unvan: "Yazı İşleri", rol: "Shift_Leader", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Fatih", soyad: "Bahşi", unvan: "Denetim", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Beyza", soyad: "Kılıç", unvan: "Memur", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Sercan", soyad: "Karaca", unvan: "Memur", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Beyza", soyad: "Durak", unvan: "Memur", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mücahit", soyad: "Baydır", unvan: "Çay Ocağı", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Yasin", soyad: "Akyel", unvan: "Kalem", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muammer", soyad: "Ertegen", unvan: "Şoför", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },

  // 1. POSTA (29 people)
  { ad: "Talip", soyad: "Kozan", unvan: "Baş.Çvş.", rol: "Shift_Leader", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Yusuf", soyad: "Erdoğan", unvan: "Çvş.", rol: "Shift_Leader", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Hasan", soyad: "Yıldız", unvan: "Çvş.", rol: "Shift_Leader", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Hasan", soyad: "Kırmalı", unvan: "Çvş.", rol: "Shift_Leader", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Osman", soyad: "Keçeci", unvan: "Santral", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ebru", soyad: "Acet", unvan: "Santral Opr.", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Gazi", soyad: "Gümüşgöz", unvan: "Santral Opr.", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Refik Beral", soyad: "Duman", unvan: "Pos.Baş.Şof.", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mücahit", soyad: "Koç", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Oğuzhan", soyad: "Toprak", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Umut", soyad: "Büyükçakmak", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Batuhan", soyad: "Işık", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Metin", soyad: "Selvi", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "İkbal", soyad: "Bayat", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Harun", soyad: "Aygün", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Nizamettin", soyad: "Polat", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mutlu", soyad: "Akbay", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Oğuz", soyad: "Kılıç", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Samet", soyad: "Hizar", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Berat", soyad: "Yılmaz", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "M.Emre", soyad: "Soylu", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "İsa", soyad: "Demirkıran", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Emir Furkan", soyad: "Taşdelen", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Fatih", soyad: "Güler", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mustafa Metin", soyad: "Bıçakcigil", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Süleyman", soyad: "Koçak", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Hikmet", soyad: "Kodaz", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Akın", soyad: "Anlar", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Oktay", soyad: "Arkaz", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },

  // 2. POSTA (28 people)
  { ad: "Hidayet", soyad: "Yücekaya", unvan: "Baş.Çvş.", rol: "Shift_Leader", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Enver", soyad: "Gürdaş", unvan: "Çvş.", rol: "Shift_Leader", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Kenan", soyad: "Duman", unvan: "Çvş.", rol: "Shift_Leader", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Hasan", soyad: "Arslan", unvan: "Çvş.", rol: "Shift_Leader", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Zekeriya", soyad: "Akbaş", unvan: "Santral", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "M.Esat", soyad: "Şahin", unvan: "Santral Opr.", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ahmet", soyad: "Haral", unvan: "Santral Opr.", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Furkan", soyad: "Halis", unvan: "Pos.Baş.Şof.", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "İlker", soyad: "Şahin", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Müjdat", soyad: "Demirci", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Murat", soyad: "Karapınar", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Pehlül", soyad: "Bektaş", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Abdullah", soyad: "Gelöz", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Erman", soyad: "Bulut", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Necati", soyad: "Bulut", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ahmet", soyad: "Yıldız", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Musa", soyad: "Günay", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Cengiz", soyad: "Aslan", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Faruk", soyad: "Öztürk", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  // Row 20 in 2.POSTA is empty in the official print
  { ad: "Bayram", soyad: "Kalkan", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mustafa", soyad: "Sarı", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Sencer", soyad: "Yıldız", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhammed Emin", soyad: "Kara", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mustafa", soyad: "Köse", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mustafa", soyad: "Yıldız", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ülker", soyad: "Höbekkaya", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Sinan", soyad: "Karaca", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Gazi", soyad: "Gül", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },

  // 3. POSTA (18 people assigned here to sum to 92 total in memurs)
  { ad: "Şeref", soyad: "Uçar", unvan: "Baş.Çvş.", rol: "Shift_Leader", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Güven", soyad: "Navruz", unvan: "Çvş.", rol: "Shift_Leader", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Sezgin", soyad: "Darıcı", unvan: "Çvş.", rol: "Shift_Leader", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Muhsin", soyad: "Boyraz", unvan: "Çvş.", rol: "Shift_Leader", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Burak", soyad: "Çeper", unvan: "Santral", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Kaan", soyad: "Demir", unvan: "Santral Opr.", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ebubekir", soyad: "Tağızade", unvan: "Santral Opr.", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Emre", soyad: "Ekici", unvan: "Pos.Baş.Şof.", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Emrullah", soyad: "Yücel", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Selahattin", soyad: "Ildır", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "U.Güner", soyad: "Söğüt", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Lütfi", soyad: "Toy", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ali", soyad: "Tumbul", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhlis", soyad: "Demir", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Özgür", soyad: "Mercan", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Bilal", soyad: "Öztaş", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhsin", soyad: "Demir", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ahmet", soyad: "Toplu", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false }
];

// ─── ÖZBELSAN KADRO (42 people, SB6801–SB6842) ─────────────────────────────
const OZBELSAN_LIST: Omit<PersonnelEntry, "sicil_no">[] = [
  // 3. POSTA (remaining 12 of 30)
  { ad: "G.Osman", soyad: "Şahin", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mehmet", soyad: "Solmaz", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Serkan", soyad: "Yangın", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Murat", soyad: "Nergiz", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Hasan", soyad: "Çınar Kuzu", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Abdullah Ubeyde", soyad: "Özkur", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Melih", soyad: "Arslan", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Resul", soyad: "Gülmez", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Fatih", soyad: "Eker", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mehmet", soyad: "Toy", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Halil", soyad: "Çaşut", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "İlyas", soyad: "Saygın", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },

  // ESENTEPE ŞUBESİ (15 people)
  // 1. Posta (5)
  { ad: "Zekeriya", soyad: "İnce", unvan: "Çvş", rol: "Shift_Leader", posta_no: 1, istasyon: "Esentepe Şubesi", view_only: false, can_approve: true, can_print: false },
  { ad: "Mücahit", soyad: "Coşkun", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Fatih", soyad: "Kaya", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Köksal", soyad: "Çelik", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhammed", soyad: "Kavak", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  // 2. Posta (5)
  { ad: "Suat", soyad: "Zileli", unvan: "Çvş", rol: "Shift_Leader", posta_no: 2, istasyon: "Esentepe Şubesi", view_only: false, can_approve: true, can_print: false },
  { ad: "Hanifi", soyad: "Karakaya", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Fatih", soyad: "Çimen", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Fatih", soyad: "Aydın", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Volkan", soyad: "Bellek", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  // 3. Posta (5)
  { ad: "Ertuğrul", soyad: "Öztürk", unvan: "Çvş", rol: "Shift_Leader", posta_no: 3, istasyon: "Esentepe Şubesi", view_only: false, can_approve: true, can_print: false },
  { ad: "Muhammet", soyad: "Elbay", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "M.Raşit", soyad: "Akgül", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "İsmail", soyad: "Gökçek", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Hasan", soyad: "Üngör", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },

  // ORGANİZE SANAYİ BÖLGESİ ŞUBESİ (15 people)
  // 1. Posta (5)
  { ad: "H.İbrahim", soyad: "Yılmaz", unvan: "Çvş", rol: "Shift_Leader", posta_no: 1, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: false, can_approve: true, can_print: false },
  { ad: "Turan", soyad: "Uçan", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Ümmet", soyad: "Gülmez", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Fatih", soyad: "Kaya", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Murat", soyad: "Can Bağlar", unvan: "Er", rol: "User", posta_no: 1, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  // 2. Posta (5)
  { ad: "Faruk", soyad: "Özdere", unvan: "Çvş", rol: "Shift_Leader", posta_no: 2, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: false, can_approve: true, can_print: false },
  { ad: "Mehmet", soyad: "Polat", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "M.Mustafa", soyad: "Arslan", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "H.Kerem", soyad: "Dokuzluoğlu", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Yunus", soyad: "Kalkan", unvan: "Er", rol: "User", posta_no: 2, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  // 3. Posta (5)
  { ad: "İsmail", soyad: "Kartal", unvan: "Çvş", rol: "Shift_Leader", posta_no: 3, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: false, can_approve: true, can_print: false },
  { ad: "Emre", soyad: "Kalkan", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Yaşar", soyad: "Çil", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "İbrahim", soyad: "Akyol", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "M.Mücahit", soyad: "Koç", unvan: "Er", rol: "User", posta_no: 3, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false }
];

// ─── DRIVER LICENSE DATA ───────────────────────────────────────────────────
const DRIVER_LICENSES: { fullName: string; expiry: string | null }[] = [
  { fullName: "Bilal Demir", expiry: "2028-12-20" },
  { fullName: "Sercan Karaca", expiry: "2032-01-29" },
  { fullName: "Talip Kozan", expiry: "2032-03-27" },
  { fullName: "Yusuf Erdoğan", expiry: "2032-07-29" },
  { fullName: "Fatih Bahşi", expiry: "2027-10-28" },
  { fullName: "Oğuzhan Toprak", expiry: "2033-06-09" },
  { fullName: "Mücahit Koç", expiry: "2033-06-16" },
  { fullName: "Köksal Çelik", expiry: "2028-11-14" },
  { fullName: "H.İbrahim Yılmaz", expiry: "2034-01-26" },
  { fullName: "Turan Uçan", expiry: "2030-12-05" },
  { fullName: "Emir Furkan Taşdelen", expiry: "2033-06-16" },
  { fullName: "Mustafa Metin Bıçakcigil", expiry: "2031-05-15" },
  { fullName: "Hasan Arslan", expiry: "2029-07-13" },
  { fullName: "M.Esat Şahin", expiry: "2032-01-29" },
  { fullName: "Faruk Özdere", expiry: "2033-09-01" },
  { fullName: "Murat Karapınar", expiry: "2028-09-07" },
  { fullName: "H.Kerem Dokuzluoğlu", expiry: "2033-06-16" },
  { fullName: "Hanifi Karakaya", expiry: "2028-12-27" },
  { fullName: "Pehlül Bektaş", expiry: null },
  { fullName: "Sencer Yıldız", expiry: "2027-06-03" },
  { fullName: "G.Osman Şahin", expiry: "2026-11-27" },
  { fullName: "M.Mücahit Koç", expiry: "2033-06-16" },
  { fullName: "İsmail Kartal", expiry: "2028-06-22" },
  { fullName: "Serkan Yangın", expiry: "2033-06-09" },
  { fullName: "Emre Kalkan", expiry: "2034-07-12" },
  { fullName: "Özgür Mercan", expiry: null },
  { fullName: "M.Mustafa Arslan", expiry: "2033-06-16" },
  { fullName: "Yaşar Çil", expiry: "2027-05-13" }
];

// ════════════════════════════════════════════════════════════════════════════
// POST /api/setup — Seed all personnel
// ════════════════════════════════════════════════════════════════════════════
export async function POST() {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(`[SETUP] ${msg}`);
  };

  try {
    // ── 1. Schema migrations ────────────────────────────────────────────
    log("Adding istasyon column if not exists...");
    await query(`ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS istasyon VARCHAR`);

    log("Adding username column if not exists...");
    await query(`ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS username VARCHAR`);

    log("Creating temp_passwords table...");
    await query(`
      CREATE TABLE IF NOT EXISTS public.temp_passwords (
        id SERIAL PRIMARY KEY,
        sicil_no VARCHAR UNIQUE NOT NULL,
        username VARCHAR,
        ad VARCHAR,
        soyad VARCHAR,
        plain_password VARCHAR(10) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by VARCHAR(20),
        used BOOLEAN DEFAULT false,
        used_at TIMESTAMPTZ
      )
    `);

    // ── 2. Delete existing data ─────────────────────────────────────────
    log("Deleting existing personnel...");
    await query(`DELETE FROM public.personnel`);

    log("Truncating temp_passwords...");
    await query(`TRUNCATE TABLE public.temp_passwords`);

    log("Deleting existing staff_certifications for Ehliyet...");
    await query(`DELETE FROM public.staff_certifications WHERE tip = 'Ehliyet'`);

    // ── 3. Build full personnel list with sicil numbers ─────────────────
    const DEVELOPER: PersonnelEntry = {
      sicil_no: "SB5826",
      ad: "Onurcan",
      soyad: "Kaya",
      unvan: "İtfaiye Eri / Geliştirici",
      rol: "Admin",
      posta_no: 1,
      istasyon: "Merkez İstasyonu",
      view_only: false,
      can_approve: true,
      can_print: true,
    };

    // Assign sicil numbers to memur list (skipping SB5826)
    const memurWithSicil: PersonnelEntry[] = [];
    let memurSicilCounter = 5801;
    for (let i = 0; i < MEMUR_LIST_RAW.length; i++) {
      if (memurSicilCounter === 5826) {
        memurSicilCounter++; // skip developer's number
      }
      memurWithSicil.push({
        ...MEMUR_LIST_RAW[i],
        sicil_no: `SB${memurSicilCounter}`,
      });
      memurSicilCounter++;
    }

    // Assign sicil numbers to özbelsan list
    const ozbelWithSicil: PersonnelEntry[] = OZBELSAN_LIST.map((p, i) => ({
      ...p,
      sicil_no: `SB${6801 + i}`,
    }));

    // Full list: developer first, then memur, then özbelsan
    const allPersonnel: PersonnelEntry[] = [
      DEVELOPER,
      ...memurWithSicil,
      ...ozbelWithSicil,
    ];

    log(`Total personnel to seed: ${allPersonnel.length}`);

    // ── 4. Generate usernames with collision handling ────────────────────
    const usernameCount: Record<string, number> = {};
    const personnelWithUsernames: (PersonnelEntry & { username: string; plainPassword: string })[] = [];

    for (const p of allPersonnel) {
      const baseUsername = generateUsername(p.ad, p.soyad);

      // Track collisions
      if (usernameCount[baseUsername] === undefined) {
        usernameCount[baseUsername] = 0;
      }
      usernameCount[baseUsername]++;

      personnelWithUsernames.push({
        ...p,
        username: baseUsername, // will fix collisions in second pass
        plainPassword: "", // placeholder
      });
    }

    // Second pass: resolve collisions
    const usernameAssigned: Record<string, number> = {};
    for (const p of personnelWithUsernames) {
      const baseUsername = generateUsername(p.ad, p.soyad);
      const totalWithThisBase = usernameCount[baseUsername];

      if (totalWithThisBase > 1) {
        if (usernameAssigned[baseUsername] === undefined) {
          usernameAssigned[baseUsername] = 0;
        }
        usernameAssigned[baseUsername]++;
        // First occurrence gets no suffix, subsequent ones get 1, 2, etc.
        if (usernameAssigned[baseUsername] === 1) {
          p.username = baseUsername;
        } else {
          p.username = baseUsername + (usernameAssigned[baseUsername] - 1);
        }
      } else {
        p.username = baseUsername;
      }
    }

    // ── 5. Generate passwords and hash them ─────────────────────────────
    log("Generating passwords and hashing...");

    for (const p of personnelWithUsernames) {
      // Developer gets known password '1234'
      if (p.sicil_no === "SB5826") {
        p.plainPassword = "1234";
      } else {
        p.plainPassword = generateRandomPassword();
      }
    }

    // Hash all passwords (batch for performance)
    const hashedPasswords: string[] = [];
    for (const p of personnelWithUsernames) {
      const hash = await hashPassword(p.plainPassword);
      hashedPasswords.push(hash);
    }

    // ── 6. Insert all personnel ─────────────────────────────────────────
    log("Inserting personnel...");
    let insertedCount = 0;

    for (let i = 0; i < personnelWithUsernames.length; i++) {
      const p = personnelWithUsernames[i];
      const passwordHash = hashedPasswords[i];
      const posta = postaFromNo(p.posta_no);
      const durum = "Aktif";

      await query(
        `INSERT INTO public.personnel
          (sicil_no, ad, soyad, unvan, rol, posta, posta_no, durum, password_hash, view_only, can_approve, can_print, aktif, istasyon, username)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          p.sicil_no,
          p.ad,
          p.soyad,
          p.unvan,
          p.rol,
          posta,
          p.posta_no,
          durum,
          passwordHash,
          p.view_only,
          p.can_approve,
          p.can_print,
          true, // aktif
          p.istasyon,
          p.username,
        ]
      );

      // Store plain password in temp_passwords
      await query(
        `INSERT INTO public.temp_passwords (sicil_no, username, ad, soyad, plain_password)
         VALUES ($1, $2, $3, $4, $5)`,
        [p.sicil_no, p.username, p.ad, p.soyad, p.plainPassword]
      );

      insertedCount++;
    }

    log(`Inserted ${insertedCount} personnel records.`);

    // ── 7. Seed driver licenses into staff_certifications ───────────────
    log("Seeding driver licenses...");

    // Build a lookup map: "ad soyad" → sicil_no
    const nameToSicil: Record<string, string> = {};
    for (const p of personnelWithUsernames) {
      const fullName = `${p.ad} ${p.soyad}`;
      nameToSicil[fullName] = p.sicil_no;
    }

    let driverCount = 0;
    const driverErrors: string[] = [];

    for (const dl of DRIVER_LICENSES) {
      const sicilNo = nameToSicil[dl.fullName];
      if (!sicilNo) {
        driverErrors.push(`Driver not found in roster: ${dl.fullName}`);
        continue;
      }

      if (!dl.expiry) {
        log(`Skipping driver license for ${dl.fullName} because expiry is null`);
        continue;
      }

      await query(
        `INSERT INTO public.staff_certifications (sicil_no, tip, gecerlilik_tarihi, belge_no)
         VALUES ($1, $2, $3, $4)`,
        [
          sicilNo,
          "Ehliyet",
          dl.expiry,
          null, // belge_no not provided
        ]
      );
      driverCount++;
    }

    log(`Inserted ${driverCount} driver license records.`);
    if (driverErrors.length > 0) {
      log(`Driver errors: ${driverErrors.join(", ")}`);
    }

    // ── 8. Summary ──────────────────────────────────────────────────────
    const summary = {
      success: true,
      totalPersonnel: insertedCount,
      memurKadro: memurWithSicil.length,
      ozbelKadro: ozbelWithSicil.length,
      developer: 1,
      driverLicenses: driverCount,
      driverErrors,
      logs,
    };

    log("Setup complete!");
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[SETUP] Error:", error);
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json(
      {
        success: false,
        error: message,
        logs,
      },
      { status: 500 }
    );
  }
}
