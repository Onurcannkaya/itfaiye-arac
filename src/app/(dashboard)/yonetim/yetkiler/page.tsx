"use client"

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/authStore';
import { api } from '@/lib/api';
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";
import {
  Shield, Lock, Unlock, Flame, Users, Wrench, Combine,
  FileText, Loader2, Sparkles, ShieldAlert, Check,
  AlertTriangle, GraduationCap, ListChecks
} from 'lucide-react';

interface PermissionRow {
  id?: number;
  rol: string;
  sayfa_id: string;
  izinli: boolean;
}

const PAGE_METADATA = [
  { id: 'harita', title: 'Komuta Kontrol Haritası', desc: 'Saha yönetimi, yangın hidrantı ve anlık olay tespiti', icon: Flame, color: 'text-[#dc2626] bg-[rgba(220,38,38,0.1)]' },
  { id: 'personel_yonetimi', title: 'Personel Yönetimi', desc: 'Sicil kayıtları, aktif vardiya ve yeterlilik atamaları', icon: Users, color: 'text-[#0891b2] bg-[rgba(8,145,178,0.1)]' },
  { id: 'arac_bakim', title: 'Araç Bakım & Garaj', desc: 'Arıza ihbarları, teknik raporlama ve müdür onay adımları', icon: Wrench, color: 'text-[#16a34a] bg-[rgba(22,163,74,0.1)]' },
  { id: 'envanter', title: 'Malzeme Envanteri', desc: 'QR kod üretimi, araç malzeme zimmetleri ve durum sayımları', icon: Combine, color: 'text-[#f59e0b] bg-[rgba(245,158,11,0.1)]' },
  { id: 'raporlar', title: 'Sistem Raporları & Loglar', desc: 'Merkezi log sistemi, geçmiş denetimler, personel ve sistem hareket logları', icon: FileText, color: 'text-[#7c3aed] bg-[rgba(124,58,237,0.1)]' },
  { id: 'egitimler', title: 'Eğitim & Faaliyetler', desc: 'Resmi imza sirkülü eğitim raporları, tatbikat ve ziyaret kayıtları', icon: GraduationCap, color: 'text-[#2563eb] bg-[rgba(37,99,235,0.1)]' },
  { id: 'hizmet_basvurulari', title: 'Vatandaş Hizmetleri', desc: 'Baca temizliği, yangın önlem ruhsatları ve eğitim talepleri onay süreci', icon: Sparkles, color: 'text-[#4f46e5] bg-[rgba(79,70,229,0.1)]' },
  { id: 'gorevler', title: 'Görev & Devir-Teslim', desc: 'Dinamik araç devir-teslim, malzeme kontrol ve şablon oluşturma', icon: ListChecks, color: 'text-[#e11d48] bg-[rgba(225,29,72,0.1)]' },
];

const ROLES = [
  { id: 'Müdür', title: 'Müdür ve Sistem Yöneticisi', desc: 'İbrahim Alaçam, Onurcan KAYA, Seyfi Ali Gül' },
  { id: 'Amir', title: 'Amirler', desc: 'İstasyon ve operasyon amirleri' },
  { id: 'Başçavuş', title: 'Başçavuşlar ve Başşoför', desc: 'Başçavuş ve Başşoför rütbesindeki personel' },
  { id: 'Çavuş', title: 'Çavuşlar ve Posta Başşoförleri', desc: 'Saha sevk sorumlusu ve ekip çavuşları' },
  { id: 'Er', title: 'Müdahale Eri ve Şoför', desc: 'Saha operasyon ekibi ve araç müdahale kadrosu' },
  { id: 'Santral', title: 'Santral', desc: 'Kriz masası ve olay veri girişi operatörü' },
];

export default function YetkilerPage() {
  const { user } = useAuthStore();
  const isMudur = user?.rol === 'Admin' || user?.rol?.toLowerCase() === 'admin' || user?.unvan === 'Müdür' || user?.unvan?.toLowerCase() === 'müdür';

  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.from('role_permissions').select('*');
      if (error) throw error;
      if (data) {
        setPermissions(data as PermissionRow[]);
      }
    } catch (err) {
      console.error('Yetki matrisi çekilirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (rol: string, sayfa_id: string, currentVal: boolean) => {
    if (!isMudur) return;

    const key = `${rol}-${sayfa_id}`;
    setUpdatingId(key);
    setSaveStatus('idle');

    const newVal = !currentVal;

    try {
      const existing = permissions.find(p => p.rol === rol && p.sayfa_id === sayfa_id);
      let error;
      if (existing) {
        const res = await api.update('role_permissions', { izinli: newVal }, { rol, sayfa_id });
        error = res.error;
      } else {
        const res = await api.insert('role_permissions', [{ rol, sayfa_id, izinli: newVal }]);
        error = res.error;
      }
      if (error) throw error;

      if (existing) {
        setPermissions(prev => prev.map(p =>
          (p.rol === rol && p.sayfa_id === sayfa_id) ? { ...p, izinli: newVal } : p
        ));
      } else {
        setPermissions(prev => [...prev, { rol, sayfa_id, izinli: newVal }]);
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);

      // Audit Log loglama
      fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'role_permission_change',
          actor_sicil_no: user?.sicilNo || 'unknown',
          actor_name: user ? `${user.ad} ${user.soyad}` : 'Bilinmeyen',
          target: `${rol} / ${sayfa_id}`,
          details: { rol, sayfa_id, izinli: newVal },
        }),
      }).catch(err => console.error('[AuditLog] Yetki matrisi logu gönderilemedi:', err));

    } catch (err) {
      console.error('Yetki güncelleme hatası:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setUpdatingId(null);
    }
  };

  const getPermission = (rol: string, sayfa_id: string): boolean => {
    const perm = permissions.find(p => p.rol === rol && p.sayfa_id === sayfa_id);
    return perm ? perm.izinli : false;
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--fd-accent)]" />
        <p className="text-[var(--fd-text3)] text-sm">Rol ve Ekran Yetkilendirme Matrisi yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full max-w-full px-2 md:px-4 pb-[max(4rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] animate-in fade-in duration-300">

      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--fd-border)] pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[var(--fd-text)]">
              Dinamik Rol & Ekran Yetkileri
            </h1>
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Shield className="w-3.5 h-3.5" /> Karargâh Paneli
            </Badge>
          </div>
          <p className="text-[var(--fd-text3)] mt-1 text-xs">
            Sivas İtfaiye Otomasyonu bünyesindeki 8 ana kontrol panelinin, 5 ana rütbe grubuna göre erişim kuralları.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          {saveStatus === 'success' && (
            <Badge variant="success" className="gap-1 px-3 py-1.5 text-[10px]">
              <Check className="w-3.5 h-3.5" /> Veritabanına Yazıldı
            </Badge>
          )}
          {saveStatus === 'error' && (
            <Badge variant="danger" className="gap-1 px-3 py-1.5 text-[10px]">
              <AlertTriangle className="w-3.5 h-3.5" /> Hata Oluştu!
            </Badge>
          )}
          <Badge variant={isMudur ? "success" : "warning"} className="gap-1.5 px-3 py-1.5 text-[10px]">
            {isMudur ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {isMudur ? "Müdür Yetkisi: Açık" : "Salt Okunur Mod"}
          </Badge>
        </div>
      </div>

      {/* ═══ Read-only Warning ═══ */}
      {!isMudur && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--fd-r)] border border-[var(--fd-warning)]/20 bg-[rgba(245,158,11,0.05)]">
          <ShieldAlert className="w-5 h-5 text-[var(--fd-warning)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[var(--fd-warning)]">Sayfa Yetkisi Sınırı Bilgilendirmesi</h4>
            <p className="text-xs text-[var(--fd-text3)] leading-relaxed">
              Şu an sisteme <span className="text-[var(--fd-warning)] font-semibold">{user?.unvan || 'Kullanıcı'}</span> unvanıyla giriş yaptınız.
              Sivas İtfaiyesi kuralları gereği yetki matrisi üzerindeki düzenlemeler sadece <strong>İbrahim Müdür (Müdür)</strong> yetkisiyle yapılabilir.
              Değişiklikleri görmek için Müdür hesabı ile giriş yapabilirsiniz; bu ekran size salt-okunur (read-only) hiyerarşide sunulmaktadır.
            </p>
          </div>
        </div>
      )}

      {/* ═══ Desktop Matrix Table (md+) ═══ */}
      <div className="hidden md:block bg-[var(--fd-surface)] border border-[var(--fd-border)] rounded-[var(--fd-r)] shadow-[var(--fd-shadow-sm)] overflow-hidden">
        {/* Table Header */}
        <div className="border-b border-[var(--fd-border)] bg-[var(--fd-surface2)]/30 px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-[11px] font-black tracking-[.06em] uppercase text-[var(--fd-text3)]">
            YETKİLENDİRME GRİD MATRİSİ
          </h2>
          <span className="text-[10px] text-[var(--fd-text3)] font-mono">
            {PAGE_METADATA.length} EKRAN × {ROLES.length} RÜTBE GRUBU
          </span>
        </div>

        <div className="overflow-x-auto pb-4 scrollbar-thin">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--fd-border)] bg-[var(--fd-surface2)]/20">
                <th className="p-4 text-left font-bold text-[10px] uppercase tracking-[.04em] text-[var(--fd-text3)] w-[260px]">
                  KONTROL PANELLERİ
                </th>
                {ROLES.map(role => (
                  <th key={role.id} className="p-4 text-center font-bold text-[10px] uppercase tracking-[.04em] text-[var(--fd-text3)] align-top">
                    <div className="space-y-1">
                      <div className="text-[var(--fd-text2)] font-black text-[11px] leading-tight text-balance">{role.title}</div>
                      <div className="text-[9px] text-[var(--fd-text3)] font-medium normal-case tracking-normal max-w-[150px] mx-auto text-balance leading-snug">
                        {role.desc}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--fd-border)]/50">
              {PAGE_METADATA.map(page => {
                const PageIcon = page.icon;
                return (
                  <tr key={page.id} className="hover:bg-[var(--fd-surface2)]/40 transition duration-150 group">
                    <td className="p-4 align-middle">
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2.5 rounded-[var(--fd-r-sm)] shrink-0 mt-0.5 transition duration-300 group-hover:scale-105", page.color)}>
                          <PageIcon className="w-[18px] h-[18px]" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-[var(--fd-text)] text-[13px] group-hover:text-[var(--fd-accent)] transition duration-150">
                            {page.title}
                          </h4>
                          <p className="text-[11px] text-[var(--fd-text3)] leading-relaxed font-medium">
                            {page.desc}
                          </p>
                        </div>
                      </div>
                    </td>
                    {ROLES.map(role => {
                      const isAllowed = getPermission(role.id, page.id);
                      const key = `${role.id}-${page.id}`;
                      const isUpdating = updatingId === key;
                      return (
                        <td key={role.id} className="p-4 text-center align-middle">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Switch
                              checked={isAllowed}
                              loading={isUpdating}
                              disabled={!isMudur}
                              onChange={() => handleToggle(role.id, page.id, isAllowed)}
                            />
                            {isAllowed ? (
                              <Badge variant="success" className="text-[8px] px-1.5 py-0 gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> İzinli
                              </Badge>
                            ) : (
                              <Badge variant="danger" className="text-[8px] px-1.5 py-0">
                                Engelli
                              </Badge>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Mobile: Role Cards (md altı) ═══ */}
      <div className="md:hidden space-y-4">
        {ROLES.map(role => (
          <div
            key={role.id}
            className="bg-[var(--fd-surface)] border border-[var(--fd-border)] rounded-[var(--fd-r)] overflow-hidden shadow-[var(--fd-shadow-sm)] transition-all"
          >
            {/* Rütbe Başlığı */}
            <div className="bg-[var(--fd-surface2)]/40 border-b border-[var(--fd-border)] px-4 py-3 flex items-center gap-3">
              <div className="p-2 rounded-[var(--fd-r-sm)] bg-[var(--fd-accent-soft)] border border-[var(--fd-accent-soft2)] shrink-0">
                <Shield className="w-4 h-4 text-[var(--fd-accent)]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-sm text-[var(--fd-text)] uppercase tracking-wide leading-tight break-words">{role.title}</h3>
                <p className="text-[10px] text-[var(--fd-text3)] font-medium leading-tight mt-0.5 break-words">{role.desc}</p>
              </div>
            </div>

            {/* Panel Yetki Satırları */}
            <div className="divide-y divide-[var(--fd-border)]/50">
              {PAGE_METADATA.map(page => {
                const PageIcon = page.icon;
                const isAllowed = getPermission(role.id, page.id);
                const key = `${role.id}-${page.id}`;
                const isUpdating = updatingId === key;
                return (
                  <div key={page.id} className="flex items-center justify-between gap-3 px-4 py-3 min-h-[52px]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn("p-1.5 rounded-[var(--fd-r-sm)] shrink-0", page.color)}>
                        <PageIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-[var(--fd-text)] leading-tight">{page.title}</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <Switch
                        checked={isAllowed}
                        loading={isUpdating}
                        disabled={!isMudur}
                        onChange={() => handleToggle(role.id, page.id, isAllowed)}
                      />
                      {isAllowed ? (
                        <Badge variant="success" className="text-[9px] px-1.5 py-0.5 w-[60px] justify-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> İzinli
                        </Badge>
                      ) : (
                        <Badge variant="danger" className="text-[9px] px-1.5 py-0.5 w-[60px] justify-center">
                          Engelli
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Mobil Alt Bar Maskeleme Kalkanı */}
      <div
        className="w-full block md:hidden pointer-events-none clear-both"
        style={{ height: 'calc(7rem + env(safe-area-inset-bottom))' }}
        aria-hidden="true"
      />

    </div>
  );
}
