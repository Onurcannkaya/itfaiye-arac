import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sivas İtfaiye Araç ve Envanter Yönetimi",
  description: "Mobil öncelikli İtfaiye Görev ve Envanter Yönetim Portalı",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-full flex flex-col pt-safe bg-background text-foreground antialiased selection:bg-primary/20 font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
