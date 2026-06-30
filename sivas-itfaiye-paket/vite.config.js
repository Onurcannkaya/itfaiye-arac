import { defineConfig } from 'vite';

// İtfaiye Yönetim Sistemi — geliştirme/önizleme sunucusu yapılandırması.
// support.js (çalışma zamanı) `public/` altında olduğundan Vite tarafından
// dönüştürülmeden, olduğu gibi /support.js adresinden sunulur.
export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  preview: {
    port: 4173,
  },
});
