import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

// ─── Turkish character normalization ────────────────────────────────────────
function removeTurkishChars(str: string): string {
  const map: Record<string, string> = {
    İ: "i", ı: "i", Ö: "o", ö: "o", Ü: "u", ü: "u",
    Ş: "s", ş: "s", Ç: "c", ç: "c", Ğ: "g", ğ: "g",
  };
  return str.replace(/[İıÖöÜüŞşÇçĞğ]/g, (ch) => map[ch] || ch);
}

// ─── Turkish Title Case ─────────────────────────────────────────────────────
function toTitleCase(str: string): string {
  return str.toLocaleLowerCase('tr-TR').split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1);
  }).join(' ');
}

// ─── Parse header for fleet number and call sign description ────────────────
function parseHeader(sheetName: string, rows: any[][]): { filo_no: number | null, aciklama: string } {
  if (sheetName.toLowerCase() === 'garaj') {
    return { filo_no: null, aciklama: "Garaj" };
  }

  let titleText = "";
  for (let i = 0; i < Math.min(4, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    const text = row.map(c => String(c || '').trim()).filter(Boolean).join(" ");
    if (!text) continue;
    if (
      text.includes("İTFAİYE MÜDÜRLÜĞÜ") || 
      text.includes("İTFAİYE MÜD ") || 
      text.includes("İTFAİYE MÜDÜRLÜGÜ") || 
      text.includes("ZİMMET LİSTESİ") || 
      text.includes("ZİMMET DOSYASI")
    ) {
      continue;
    }
    if (text.includes("S.NO") || text.includes("MALZEME") || text.includes("MİKTARI")) {
      continue;
    }
    titleText = text;
    break;
  }

  if (!titleText) {
    titleText = sheetName;
  }

  let filo_no: number | null = null;
  let aciklama = titleText;

  const noluMatch = titleText.match(/^(\d+)\s*(?:NOLU|NO'LU|NO)\s+(.*)$/i);
  if (noluMatch) {
    filo_no = parseInt(noluMatch[1], 10);
    aciklama = noluMatch[2];
  }

  aciklama = aciklama
    .replace(/\(\s*58\s*[A-Z]+\s*\d+\s*\)/gi, "")
    .replace(/58\s*[A-Z]+\s*\d+/gi, "")
    .replace(/-\s*$/g, "")
    .replace(/^\s*-\s*/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!aciklama) {
    aciklama = titleText;
  }

  return { filo_no, aciklama: toTitleCase(aciklama) };
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
  { fullName: "Ahmet Yıldız", expiry: "2029-04-24" },
  { fullName: "Ali Tumbul", expiry: "2030-12-08" },
  { fullName: "Batuhan Işık", expiry: "2027-08-01" },
  { fullName: "Abdullah Gelöz", expiry: "2026-12-27" },
  { fullName: "Bilal Öztaş", expiry: "2031-04-01" },
  { fullName: "Emre Ekici", expiry: "2030-07-04" },
  { fullName: "Emre Kalkan", expiry: "2027-06-01" },
  { fullName: "Emrullah Yücel", expiry: "2029-12-09" },
  { fullName: "Erman Bulut", expiry: "2030-10-09" },
  { fullName: "Fatih Çimen", expiry: "2029-12-16" },
  { fullName: "Fatih Kaya", expiry: "2029-03-06" },
  { fullName: "Furkan Halis", expiry: "2030-10-13" },
  { fullName: "Hanifi Karakaya", expiry: "2030-12-24" },
  { fullName: "Harun Aygün", expiry: "2027-02-16" },
  { fullName: "İkbal Bayat", expiry: "2030-05-20" },
  { fullName: "İlker Şahin", expiry: "2031-02-20" },
  { fullName: "Lütfi Toy", expiry: "2027-05-10" },
  { fullName: "M.Mustafa Arslan", expiry: "2027-12-14" },
  { fullName: "M.Raşit Akgül", expiry: "2029-12-18" },
  { fullName: "Mehmet Polat", expiry: "2029-03-28" },
  { fullName: "Metin Selvi", expiry: "2031-05-14" },
  { fullName: "Muhammet Elbay", expiry: "2029-02-27" },
  { fullName: "Muhlis Demir", expiry: "2030-07-31" },
  { fullName: "Murat Karapınar", expiry: "2030-02-19" },
  { fullName: "Mutlu Akbay", expiry: "2029-07-12" },
  { fullName: "Mücahit Coşkun", expiry: "2027-04-18" },
  { fullName: "Mücahit Koç", expiry: "2029-12-31" },
  { fullName: "Müjdat Demirci", expiry: "2029-10-23" },
  { fullName: "Necati Bulut", expiry: "2029-04-30" },
  { fullName: "Nizamettin Polat", expiry: "2029-12-13" },
  { fullName: "Oğuzhan Toprak", expiry: "2031-04-08" },
  { fullName: "Özgür Mercan", expiry: null },
  { fullName: "Pehlül Bektaş", expiry: null },
  { fullName: "Refik Beral Duman", expiry: "2026-11-02" },
  { fullName: "Selahattin Ildır", expiry: "2027-08-18" },
  { fullName: "Turan Uçan", expiry: "2026-08-23" },
  { fullName: "U.Güner Söğüt", expiry: "2030-07-09" },
  { fullName: "Umut Büyükçakmak", expiry: "2027-07-27" },
  { fullName: "Ümmet Gülmez", expiry: "2029-03-28" },
  { fullName: "Yaşar Çil", expiry: "2028-08-15" },
  { fullName: "Yasin Akyel", expiry: "2029-01-02" }
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

    log("Creating personnel_shifts_log table...");
    await query(`
      CREATE TABLE IF NOT EXISTS public.personnel_shifts_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
        personel_ad_soyad VARCHAR NOT NULL,
        istasyon VARCHAR NOT NULL,
        posta VARCHAR NOT NULL,
        giris_tarihi TIMESTAMPTZ NOT NULL,
        cikis_tarihi TIMESTAMPTZ DEFAULT NULL,
        durum VARCHAR NOT NULL CHECK (durum IN ('GÖREVDE', 'TAMAMLANDI'))
      )
    `);

    log("Dropping old vehicle_inventory table if exists...");
    await query(`DROP TABLE IF EXISTS public.vehicle_inventory CASCADE`);

    log("Dropping old inventory table if exists...");
    await query(`DROP TABLE IF EXISTS public.inventory CASCADE`);

    log("Creating inventory table...");
    await query(`
      CREATE TABLE IF NOT EXISTS public.inventory (
        id SERIAL PRIMARY KEY,
        malzeme_adi VARCHAR(255) UNIQUE NOT NULL,
        merkez INTEGER DEFAULT 0,
        esentepe INTEGER DEFAULT 0,
        organize INTEGER DEFAULT 0,
        depo INTEGER DEFAULT 0,
        toplam INTEGER DEFAULT 0
      )
    `);

    log("Creating vehicle_inventory table...");
    await query(`
      CREATE TABLE IF NOT EXISTS public.vehicle_inventory (
        id SERIAL PRIMARY KEY,
        plaka VARCHAR(20) NOT NULL REFERENCES public.vehicles(plaka) ON DELETE CASCADE,
        inventory_id INTEGER NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
        adet INTEGER DEFAULT 0,
        durum VARCHAR(50) DEFAULT 'Tam',
        bolme_kapak VARCHAR(100) DEFAULT 'Araç İçi',
        CONSTRAINT uq_plaka_inventory_bolme UNIQUE(plaka, inventory_id, bolme_kapak)
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
      unvan: "Geliştirici",
      rol: "Admin",
      posta_no: 0,
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

    // Build a lookup map: "ad soyad" → sicil_no (preferring drivers/officers to resolve duplicate names)
    const nameToSicil: Record<string, string> = {};
    for (const p of personnelWithUsernames) {
      const fullName = `${p.ad} ${p.soyad}`;
      const isDriverOrOfficer = p.unvan.toLowerCase().includes("şoför") || p.unvan.toLowerCase().includes("çvş") || p.unvan.toLowerCase().includes("çavuş") || p.unvan.toLowerCase().includes("başçavuş");
      if (!nameToSicil[fullName] || isDriverOrOfficer) {
        nameToSicil[fullName] = p.sicil_no;
      }
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

    // ── 8. Seed inventory from Excel ───────────────────────────────────
    log("Seeding inventory from Excel sheet...");
    let seededInventoryCount = 0;
    const xlsPath = path.join(process.cwd(), "public", "data", "ARAÇLAR VE MALZEMELER 2026.xls");
    if (fs.existsSync(xlsPath)) {
      const workbook = XLSX.readFile(xlsPath);
      const sheetName = workbook.SheetNames.includes('S   T   O   K') ? 'S   T   O   K' : workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = jsonData[0] || [];
      const colMappings: Record<number, { type: 'branch'; name: string } | { type: 'vehicle'; plaka: string }> = {};
      const vehiclePlates: string[] = [];

      const parseVal = (val: any) => {
        if (val === undefined || val === null) return 0;
        const str = String(val).trim();
        if (str === '-' || str === '' || str === '?') return 0;
        const parsed = parseInt(str, 10);
        return isNaN(parsed) ? 0 : parsed;
      };

      for (let c = 2; c < headers.length; c++) {
        const headerVal = String(headers[c] || '').trim().toUpperCase();
        const headerLower = headerVal.toLowerCase();
        if (headerLower === 'merkez') {
          colMappings[c] = { type: 'branch', name: 'merkez' };
        } else if (headerLower === 'esentepe') {
          colMappings[c] = { type: 'branch', name: 'esentepe' };
        } else if (headerLower.includes('organi')) {
          colMappings[c] = { type: 'branch', name: 'organize' };
        } else if (headerLower === 'depo') {
          colMappings[c] = { type: 'branch', name: 'depo' };
        } else if (headerLower === 'toplam') {
          colMappings[c] = { type: 'branch', name: 'toplam' };
        } else if (headerVal) {
          let plaka = headerVal;
          if (plaka === '58 TL T37') plaka = '58 TL 737';
          colMappings[c] = { type: 'vehicle', plaka: plaka };
          vehiclePlates.push(plaka);
        }
      }

      // Check existing vehicles in DB
      const existingVehiclesRes = await query(`SELECT plaka FROM public.vehicles`);
      const existingPlates = new Set(existingVehiclesRes.rows.map((r: any) => r.plaka));

      // Create dummy/placeholder entries for missing vehicles
      for (const plaka of vehiclePlates) {
        if (!existingPlates.has(plaka)) {
          log(`Vehicle ${plaka} not found in DB. Inserting placeholder...`);
          await query(`
            INSERT INTO public.vehicles (plaka, arac_tipi, marka, model, durum, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (plaka) DO NOTHING
          `, [plaka, 'Diğer', 'Bilinmeyen', plaka, 'Aktif', 'aktif']);
        }
      }

      for (let r = 1; r < jsonData.length; r++) {
        const row = jsonData[r];
        if (row && row[1] && String(row[1]).trim()) {
          const materialName = String(row[1]).trim();
          
          let merkezVal = 0;
          let esentepeVal = 0;
          let organizeVal = 0;
          let depoVal = 0;
          let toplamVal = 0;

          for (let c = 2; c < row.length; c++) {
            const mapping = colMappings[c];
            if (!mapping) continue;
            const val = parseVal(row[c]);
            if (mapping.type === 'branch') {
              if (mapping.name === 'merkez') merkezVal = val;
              else if (mapping.name === 'esentepe') esentepeVal = val;
              else if (mapping.name === 'organize') organizeVal = val;
              else if (mapping.name === 'depo') depoVal = val;
              else if (mapping.name === 'toplam') toplamVal = val;
            }
          }

          // Insert into public.inventory
          await query(`
            INSERT INTO public.inventory (malzeme_adi, merkez, esentepe, organize, depo, toplam)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (malzeme_adi) DO UPDATE SET
              merkez = EXCLUDED.merkez,
              esentepe = EXCLUDED.esentepe,
              organize = EXCLUDED.organize,
              depo = EXCLUDED.depo,
              toplam = EXCLUDED.toplam
          `, [materialName, merkezVal, esentepeVal, organizeVal, depoVal, toplamVal]);
          seededInventoryCount++;
        }
      }
      log(`Seeded ${seededInventoryCount} master inventory items from Excel.`);

      // ── 8.2 Seed individual vehicle inventories ──────────────────────
       log("Seeding individual vehicle inventories from sheets...");
      const excludeSheets = ['S   T   O   K', 'Sayfa2', 'Sayfa26'];
      const vehicleSheets = workbook.SheetNames.filter((name: string) => !excludeSheets.includes(name));

      const extractPlate = (sheetName: string, rows: any[][]) => {
        if (sheetName.toLowerCase() === 'garaj') return 'GARAJ';

        let plateMatch = sheetName.match(/(58\s+[A-Z]+\s+\d+)/i);
        if (plateMatch) return plateMatch[1].replace(/\s+/g, ' ').trim().toUpperCase();

        for (let i = 0; i < Math.min(4, rows.length); i++) {
          const rowStr = JSON.stringify(rows[i]);
          const match = rowStr.match(/(58\s+[A-Z]+\s+\d+)/i);
          if (match) {
            return match[1].replace(/\s+/g, ' ').trim().toUpperCase();
          }
        }
        if (sheetName === 'yeni İveco') return '58 AEL 289';
        if (sheetName === 'RENAULT') return '58 AGF 355';
        return null;
      };

      const extractQuantity = (val: any) => {
        if (val === undefined || val === null) return 1;
        if (typeof val === 'number') return val;
        const str = String(val).trim().toUpperCase();
        const match = str.match(/^(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
        return 1;
      };

      const normalizeLocation = (loc: any) => {
        if (!loc) return 'Araç İçi';
        const str = String(loc)
          .replace(/[\r\n]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase();
        
        if (!str) return 'Araç İçi';

        if (str.includes("KABİN İÇİ") || str.includes("ARAÇ İÇİ") || str.includes("ARAÇ ICI") || str.includes("KABIN ICI")) {
          return "Araç İçi";
        }
        if (str.includes("SOL ÖN") || str.includes("SOL ON")) {
          return "Sol Ön Kapak";
        }
        if (str.includes("SOL ORTA")) {
          return "Sol Orta Kapak";
        }
        if (str.includes("SOL ARKA")) {
          return "Sol Arka Kapak";
        }
        if (str.includes("SAĞ ÖN") || str.includes("SAĞ ON") || str.includes("SAG ON") || str.includes("SAG ÖN")) {
          return "Sağ Ön Kapak";
        }
        if (str.includes("SAĞ ORTA") || str.includes("SAG ORTA")) {
          return "Sağ Orta Kapak";
        }
        if (str.includes("SAĞ ARKA") || str.includes("SAG ARKA")) {
          return "Sağ Arka Kapak";
        }
        if (str.includes("ARAÇ ÜSTÜ") || str.includes("ARAC USTU") || str.includes("ARAÇ ÜZERİ") || str.includes("ARAC UZERI")) {
          return "Araç Üstü";
        }
        if (str.includes("ARKA KAPAK") || str.includes("ARKA BÖLME") || str.includes("ARKA BOLME") || str.includes("ARAÇ ARKA KAPAK")) {
          return "Arka Kapak";
        }
        if (str.includes("SOL 1.") || str.includes("SOL 1")) return "Sol Ön Kapak";
        if (str.includes("SOL 2.") || str.includes("SOL 2")) return "Sol Orta Kapak";
        if (str.includes("SOL 3.") || str.includes("SOL 3")) return "Sol Orta Kapak";
        if (str.includes("SOL 4.") || str.includes("SOL 4")) return "Sol Arka Kapak";

        if (str.includes("SAĞ 1.") || str.includes("SAĞ 1") || str.includes("SAG 1")) return "Sağ Ön Kapak";
        if (str.includes("SAĞ 2.") || str.includes("SAĞ 2") || str.includes("SAG 2")) return "Sağ Orta Kapak";
        if (str.includes("SAĞ 3.") || str.includes("SAĞ 3") || str.includes("SAG 3")) return "Sağ Arka Kapak";

        if (str.includes("HALAT")) return "Halat Çantası";
        if (str.includes("KÜÇÜK KAPAK") || str.includes("KUCUK KAPAK")) return "Küçük Kapak";
        if (str.includes("YÜKSEK AÇI") || str.includes("YUKSEK ACI")) return "Yüksek Açı Kurtarma Çantası";

        return str.charAt(0) + str.slice(1).toLowerCase();
      };

      // Create a cache of material_name -> id
      const inventoryCache: Record<string, number> = {};
      const allInvRes = await query(`SELECT id, malzeme_adi FROM public.inventory`);
      allInvRes.rows.forEach((r: any) => {
        inventoryCache[r.malzeme_adi.toUpperCase()] = r.id;
      });

      let vehicleInventoryInserted = 0;

      for (const sheetName of vehicleSheets) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const plaka = extractPlate(sheetName, jsonData);
        if (!plaka) {
          log(`Skipping sheet ${sheetName}: Could not extract plate`);
          continue;
        }

        // Find or create vehicle in DB to satisfy foreign key constraint
        const vehRes = await query(`SELECT plaka FROM public.vehicles WHERE plaka = $1`, [plaka]);
        if (vehRes.rows.length === 0) {
          log(`Vehicle ${plaka} not found in DB. Inserting placeholder...`);
          await query(`
            INSERT INTO public.vehicles (plaka, arac_tipi, marka, model, durum, status)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [plaka, 'Diğer', 'Bilinmeyen', plaka, 'Aktif', 'aktif']);
        }

        // Update vehicle with filo_no and aciklama
        const { filo_no, aciklama } = parseHeader(sheetName, jsonData);
        await query(
          `UPDATE public.vehicles SET filo_no = $1, aciklama = $2 WHERE plaka = $3`,
          [filo_no, aciklama, plaka]
        );

        // Find header row
        let headerRowIdx = -1;
        for (let r = 0; r < Math.min(12, jsonData.length); r++) {
          const row = jsonData[r];
          if (row && row.length >= 2) {
            const col0 = String(row[0] || '').toUpperCase();
            const col1 = String(row[1] || '').toUpperCase();
            if ((col0.includes('S.N') || col0.includes('S. NO') || col0.includes('NO')) && 
                (col1.includes('MALZEME') || col1.includes('CİNSİ') || col1.includes('ADI'))) {
              headerRowIdx = r;
              break;
            }
          }
        }

        if (headerRowIdx === -1) {
          log(`Skipping sheet ${sheetName}: Could not find header row`);
          continue;
        }

        const sheetHeaders = jsonData[headerRowIdx];
        let qtyColIdx = 2;
        let locColIdx = -1;

        for (let c = 2; c < sheetHeaders.length; c++) {
          const head = String(sheetHeaders[c] || '').toUpperCase();
          if (head.includes('MİKTAR') || head.includes('ADET') || head.includes('ADEDİ')) {
            qtyColIdx = c;
          }
          if (head.includes('BULUNDUĞU') || head.includes('YER')) {
            locColIdx = c;
          }
        }

        let currentLocation = sheetName.toLowerCase() === 'garaj' ? 'Garaj' : 'Araç İçi';

        for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
          const row = jsonData[r];
          if (!row || row.length === 0) continue;

          const matName = String(row[1] || '').trim();
          if (!matName) continue;

          const qtyVal = row[qtyColIdx];
          const locVal = locColIdx !== -1 ? String(row[locColIdx] || '').trim() : '';

          if (locVal) {
            currentLocation = normalizeLocation(locVal);
          }

          const qty = extractQuantity(qtyVal);
          
          const matUpper = matName.toUpperCase();
          let invId = inventoryCache[matUpper];
          
          if (!invId) {
            // Dynamic insert
            const insRes = await query(`
              INSERT INTO public.inventory (malzeme_adi)
              VALUES ($1)
              ON CONFLICT (malzeme_adi) DO UPDATE SET malzeme_adi = EXCLUDED.malzeme_adi
              RETURNING id
            `, [matName]);
            invId = insRes.rows[0].id;
            inventoryCache[matUpper] = invId;
          }

          await query(`
            INSERT INTO public.vehicle_inventory (plaka, inventory_id, adet, durum, bolme_kapak)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (plaka, inventory_id, bolme_kapak)
            DO UPDATE SET adet = EXCLUDED.adet, durum = EXCLUDED.durum
          `, [plaka, invId, qty, 'Tam', currentLocation]);

          vehicleInventoryInserted++;
        }
      }
      log(`Seeded ${vehicleInventoryInserted} individual vehicle inventory rows.`);

      // ── 8.3 Rebuild vehicles.bolmeler JSON for backward compatibility ──
      log("Rebuilding vehicles.bolmeler JSON column for deep link compatibility...");
      const COMPARTMENT_NAMES_SEDI: Record<string, string> = {
        kabin_ici: "Kabin İçi",
        arac_ici: "Araç İçi",
        sol_on_kapak: "Sol Ön Kapak",
        sol_orta_kapak: "Sol Orta Kapak",
        sol_arka_kapak: "Sol Arka Kapak",
        sag_on_kapak: "Sağ Ön Kapak",
        sag_orta_kapak: "Sağ Orta Kapak",
        sag_arka_kapak: "Sağ Arka Kapak",
        arac_ustu: "Araç Üstü",
        arka_bolme: "Arka Bölme",
        arka_kapak: "Arka Kapak",
        sol_dolap: "Sol Malzeme Dolabı",
        sag_dolap: "Sağ Malzeme Dolabı",
        bagaj_ici: "Bagaj İçi",
        kasa_ici: "Kasa İçi",
      };

      const allVehInv = await query(`
        SELECT vi.plaka, vi.adet, vi.durum, vi.bolme_kapak, i.malzeme_adi
        FROM public.vehicle_inventory vi
        JOIN public.inventory i ON vi.inventory_id = i.id
      `);

      const vehicleMap: Record<string, Record<string, any[]>> = {};
      allVehInv.rows.forEach((row: any) => {
        const plaka = row.plaka;
        if (!vehicleMap[plaka]) vehicleMap[plaka] = {};
        
        const rawLoc = row.bolme_kapak || "Araç İçi";
        const key = Object.keys(COMPARTMENT_NAMES_SEDI).find(
          k => COMPARTMENT_NAMES_SEDI[k].toLowerCase() === rawLoc.toLowerCase()
        ) || rawLoc.replace(/\s+/g, "_").toLowerCase();
        
        if (!vehicleMap[plaka][key]) vehicleMap[plaka][key] = [];
        vehicleMap[plaka][key].push({
          malzeme: row.malzeme_adi,
          adet: row.adet,
          durum: row.durum || "Tam"
        });
      });

      for (const [plaka, bolmeler] of Object.entries(vehicleMap)) {
        await query(
          `UPDATE public.vehicles SET bolmeler = $1 WHERE plaka = $2`,
          [JSON.stringify(bolmeler), plaka]
        );
      }
      log("Updated vehicles.bolmeler JSON field for all vehicles.");

      // Collect all real plates
      const allRealPlates = new Set<string>();
      vehiclePlates.forEach(p => allRealPlates.add(p));
      for (const sName of vehicleSheets) {
        const ws = workbook.Sheets[sName];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        const plaka = extractPlate(sName, json);
        if (plaka) {
          allRealPlates.add(plaka);
        }
      }
      allRealPlates.add('GARAJ');
      
      const realPlatesArray = Array.from(allRealPlates);
      log(`Total real vehicles identified from Excel: ${realPlatesArray.length}`);
      
      // Clean up any vehicles in the DB that are not in the Excel file
      const deleteRes = await query(`
        DELETE FROM public.vehicles 
        WHERE plaka NOT IN (${realPlatesArray.map((_, i) => `$${i + 1}`).join(', ')})
      `, realPlatesArray);
      log(`Cleaned up old mock/test vehicles. Deleted count: ${deleteRes.rowCount || 0}`);
    } else {
      log(`Excel file NOT found at: ${xlsPath}`);
    }

    // ── 9. Summary ──────────────────────────────────────────────────────
    const summary = {
      success: true,
      totalPersonnel: insertedCount,
      memurKadro: memurWithSicil.length,
      ozbelKadro: ozbelWithSicil.length,
      developer: 1,
      driverLicenses: driverCount,
      driverErrors,
      inventoryCount: seededInventoryCount,
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
