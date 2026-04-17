export const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sivas-itfaiye.vercel.app";

export const COMPARTMENT_NAMES: Record<string, string> = {
  kabin_ici: "Kabin İçi",
  arac_ici: "Araç İçi",
  sag_on_kapak: "Sağ Ön Kapak",
  sol_on_kapak: "Sol Ön Kapak",
  sol_orta_kapak: "Sol Orta Kapak",
  sol_arka_kapak: "Sol Arka Kapak",
  sag_arka_kapak: "Sağ Arka Kapak",
  arac_ustu: "Araç Üstü",
};

export const COMPARTMENT_SLUGS: Record<string, string> = Object.fromEntries(
  Object.entries(COMPARTMENT_NAMES).map(([key, label]) => [key, key])
);
