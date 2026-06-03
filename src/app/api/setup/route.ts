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

// ─── MEMUR KADRO (92 people, SB5801–SB5892) ────────────────────────────────
// Developer (Onurcan Kaya) is at SB5826, so index 26 (1-based) in the sequence.
// We place the developer separately and assign sicil numbers carefully.

const MEMUR_LIST_RAW: Omit<PersonnelEntry, "sicil_no">[] = [
  { ad: "İbrahim", soyad: "Alaçam", unvan: "Müdür", rol: "Admin", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Ahmet", soyad: "Çelimli", unvan: "Amir", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Ahmet", soyad: "Yıldız", unvan: "Amir", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Ebubekir", soyad: "Kuzgun", unvan: "Amir", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "İrfan", soyad: "Kandur", unvan: "Amir", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Ömer", soyad: "Çakmak", unvan: "Çavuş", rol: "Shift_Leader", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Muhsin", soyad: "Güzey", unvan: "Çavuş", rol: "Shift_Leader", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Ahmet", soyad: "Boztaş", unvan: "Amir", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Seyfi Ali", soyad: "Gül", unvan: "Amir", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Fatih", soyad: "Bahşi", unvan: "Şoför", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Bilal", soyad: "Demir", unvan: "BAŞ Şoför", rol: "Editor", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: true },
  { ad: "Sercan", soyad: "Karaca", unvan: "Şoför", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Beyza", soyad: "Durak", unvan: "Santral", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Beyza", soyad: "Kılıç", unvan: "Santral", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Talip", soyad: "Kozan", unvan: "Şoför", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Yusuf", soyad: "Erdoğan", unvan: "Şoför", rol: "User", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Hasan", soyad: "Yıldız", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Hasan", soyad: "Kırmalı", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Osman", soyad: "Keçeci", unvan: "Başçavuş", rol: "Shift_Leader", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Ebru", soyad: "Acet", unvan: "Santral", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Refik Beral", soyad: "Duman", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Umut", soyad: "Büyükçakmak", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Oğuzhan", soyad: "Toprak", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mücahit", soyad: "Koç", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Batuhan", soyad: "Işık", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  // ── index 25 (0-based) → SB5826 is reserved for developer, inserted separately ──
  { ad: "Oğuz", soyad: "Kılıç", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Samet", soyad: "Hizar", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Berat", soyad: "Yılmaz", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhammed Emre", soyad: "Soylu", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Oktay", soyad: "Arkaz", unvan: "Çavuş", rol: "Shift_Leader", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Zekeriya", soyad: "İnce", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mücahit", soyad: "Coşkun", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Köksal", soyad: "Çelik", unvan: "Pos.Baş Şof.", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhammed", soyad: "Kavak", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Halil İbrahim", soyad: "Yılmaz", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Turan", soyad: "Uçan", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Fatih", soyad: "Kaya", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "İsa", soyad: "Demirkıran", unvan: "Başçavuş", rol: "Shift_Leader", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Emir Furkan", soyad: "Taşdelen", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Fatih", soyad: "Güler", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mustafa Metin", soyad: "Bıçakcigil", unvan: "Pos.Baş Şof.", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Hidayet", soyad: "Yücekaya", unvan: "Başçavuş", rol: "Shift_Leader", posta_no: 0, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Enver", soyad: "Gürdaş", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Hasan", soyad: "Arslan", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Kenan", soyad: "Duman", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Zekeriya", soyad: "Akbaş", unvan: "Çavuş", rol: "Shift_Leader", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Furkan", soyad: "Halis", unvan: "Santral", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mustafa", soyad: "Sarı", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Musa", soyad: "Günay", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mehmet Esat", soyad: "Şahin", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Faruk", soyad: "Özdere", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "İlker", soyad: "Şahin", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Müjdat", soyad: "Demirci", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Murat", soyad: "Karapınar", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Cengiz", soyad: "Aslan", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Faruk", soyad: "Öztürk", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Bayram", soyad: "Kalkan", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Haydar Kerem", soyad: "Dokuzluoğlu", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Gazi", soyad: "Gül", unvan: "Başçavuş", rol: "Shift_Leader", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Hanifi", soyad: "Karakaya", unvan: "Pos.Baş Şof.", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Suat", soyad: "Zileli", unvan: "Santral", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Fatih", soyad: "Aydın", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mehmet", soyad: "Polat", unvan: "Çavuş", rol: "Shift_Leader", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: false, can_approve: true, can_print: false },
  { ad: "Pehlül", soyad: "Bektaş", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Sencer", soyad: "Yıldız", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhammed Emin", soyad: "Kara", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mustafa", soyad: "Köse", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Şeref", soyad: "Uçar", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Güven", soyad: "Navruz", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "İlyas", soyad: "Saygın", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhsin", soyad: "Boyraz", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Gazi Osman", soyad: "Şahin", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Uğur Güner", soyad: "Söğüt", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Sezgin", soyad: "Darıcı", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Burak", soyad: "Çeper", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Emre", soyad: "Ekici", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhammet Mücahit", soyad: "Koç", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Ertuğrul", soyad: "Öztürk", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "İsmail", soyad: "Kartal", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Selahattin", soyad: "Ildır", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Emrullah", soyad: "Yücel", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Esentepe Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhsin", soyad: "Demir", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Emre", soyad: "Kalkan", unvan: "Şoför", rol: "User", posta_no: 1, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Serkan", soyad: "Yangın", unvan: "Şoför", rol: "User", posta_no: 2, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Mehmet", soyad: "Solmaz", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "İsmail", soyad: "Gökçek", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "İbrahim", soyad: "Akyol", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Organize Sanayi Bölgesi Şubesi", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhammed", soyad: "Elbay", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ahmet", soyad: "Toplu", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Hasan Çınar", soyad: "Kuzu", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Abdullah Übeyde", soyad: "Özkur", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Melih", soyad: "Arslan", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
];

// ─── ÖZBELSAN KADRO (42 people, SB6801–SB6842) ─────────────────────────────
const OZBELSAN_LIST: Omit<PersonnelEntry, "sicil_no">[] = [
  { ad: "Abdullah", soyad: "Gelöz", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ahmet", soyad: "Haral", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ahmet", soyad: "Yıldız", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ali", soyad: "Tumbul", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Akın", soyad: "Anlar", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Fatih", soyad: "Çimen", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "İkbali Lütfullah", soyad: "Bayat", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "İsmail", soyad: "Aslan", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Kaan", soyad: "Demir", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Kadir", soyad: "Kuru", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Metin", soyad: "Selvi", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhammed", soyad: "Kara", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhammed Raşit", soyad: "Akgül", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhammed Mustafa", soyad: "Arslan", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhammed Enes", soyad: "Yıldırım", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhlis", soyad: "Demir", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mücahid", soyad: "Baydir", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Murat", soyad: "Nergiz", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Muhammed Yasir", soyad: "İnce", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mustafa", soyad: "Demir", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Onurcan", soyad: "Ünal", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Onur", soyad: "Aksu", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Özgür", soyad: "Mercan", unvan: "Şoför", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ramazan", soyad: "Temiz", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Selahattin", soyad: "Tosun", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Serhat", soyad: "Albayrak", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Taha", soyad: "Terzi", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Uğur", soyad: "Budak", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Yağmur", soyad: "Aydın", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Yaşar", soyad: "Çil", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Elif", soyad: "Tunçer", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Fatmanur", soyad: "Kişi", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Gülenay", soyad: "Koçak", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Selahattin", soyad: "Altıntaş", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Dursun", soyad: "Arslan", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Furkan", soyad: "Toğuz", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Osman", soyad: "Özdemir", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Hüseyin", soyad: "Atasoy", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Recep", soyad: "Çevik", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Yusuf", soyad: "Kılıç", unvan: "İtfaiye Eri", rol: "User", posta_no: 2, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Ersin", soyad: "Demirtaş", unvan: "İtfaiye Eri", rol: "User", posta_no: 3, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
  { ad: "Mehmet", soyad: "Demir", unvan: "İtfaiye Eri", rol: "User", posta_no: 1, istasyon: "Merkez İstasyonu", view_only: true, can_approve: false, can_print: false },
];

// ─── DRIVER LICENSE DATA ───────────────────────────────────────────────────
// Map driver full name → expiry date (ISO string or null)
const DRIVER_LICENSES: { fullName: string; expiry: string | null }[] = [
  { fullName: "Bilal Demir", expiry: "2028-12-20" },
  { fullName: "Sercan Karaca", expiry: "2032-01-29" },
  { fullName: "Talip Kozan", expiry: "2032-03-27" },
  { fullName: "Yusuf Erdoğan", expiry: "2032-07-29" },
  { fullName: "Fatih Bahşi", expiry: "2027-10-28" },
  { fullName: "Oğuzhan Toprak", expiry: "2033-06-09" },
  { fullName: "Mücahit Koç", expiry: "2033-06-16" },
  { fullName: "Köksal Çelik", expiry: "2028-11-14" },
  { fullName: "Halil İbrahim Yılmaz", expiry: "2034-01-26" },
  { fullName: "Turan Uçan", expiry: "2030-12-05" },
  { fullName: "Emir Furkan Taşdelen", expiry: "2033-06-16" },
  { fullName: "Mustafa Metin Bıçakcigil", expiry: "2031-05-15" },
  { fullName: "Hasan Arslan", expiry: "2029-07-13" },
  { fullName: "Mehmet Esat Şahin", expiry: "2032-01-29" },
  { fullName: "Faruk Özdere", expiry: "2033-09-01" },
  { fullName: "Murat Karapınar", expiry: "2028-09-07" },
  { fullName: "Haydar Kerem Dokuzluoğlu", expiry: "2033-06-16" },
  { fullName: "Hanifi Karakaya", expiry: "2028-12-27" },
  { fullName: "Pehlül Bektaş", expiry: null },
  { fullName: "Sencer Yıldız", expiry: "2027-06-03" },
  { fullName: "Gazi Osman Şahin", expiry: "2026-11-27" },
  { fullName: "Muhammet Mücahit Koç", expiry: "2033-06-16" },
  { fullName: "İsmail Kartal", expiry: "2028-06-22" },
  { fullName: "Serkan Yangın", expiry: "2033-06-09" },
  { fullName: "Emre Kalkan", expiry: "2034-07-12" },
  { fullName: "Özgür Mercan", expiry: null },
  { fullName: "Muhammed Mustafa Arslan", expiry: "2033-06-16" },
  { fullName: "Yaşar Çil", expiry: "2027-05-13" },
  { fullName: "Furkan Toğuz", expiry: "2033-06-16" },
  { fullName: "Ersin Demirtaş", expiry: "2033-06-16" },
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
    // Memur kadro: SB5801–SB5892 (92 slots, SB5826 = developer)
    // The MEMUR_LIST_RAW has 91 entries (developer excluded).
    // We need to assign SB5801..SB5825 to indices 0..24, then SB5827..SB5892 to indices 25..90.

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
        driverErrors.push(`Driver not found: ${dl.fullName}`);
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
