"use client"
import { useState, useEffect, useRef } from 'react'
import { Bell, LogOut, Camera, AlertTriangle, ShieldAlert, CheckCircle2, Info, Flame, Trash2, Check, Key, X, BookOpen } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/authStore'
import { api } from '@/lib/api'
import Link from 'next/link'
import { GeofenceButton } from './GeofenceButton'

interface NotificationItem {
  id: string
  title: string
  description: string
  type: 'urgent' | 'warning' | 'info' | 'success'
  time: string
  read: boolean
  actionUrl?: string
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function Topbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)

  const [readIds, setReadIds] = useState<string[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && user) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsPushSubscribed(!!sub);
        }).catch(err => console.error('Subscription check error:', err));
      });
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRead = localStorage.getItem('itfaiye-read-notifications')
      const storedDeleted = localStorage.getItem('itfaiye-deleted-notifications')
      if (storedRead) setReadIds(JSON.parse(storedRead))
      if (storedDeleted) setDeletedIds(JSON.parse(storedDeleted))
    }
  }, [])

  // Track window size for responsive layout and set mounted to true
  useEffect(() => {
    setMounted(true)
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePushToggle = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Bu tarayıcı anlık bildirimleri desteklemiyor.');
      return;
    }

    try {
      if (isPushSubscribed) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
        if (user?.sicilNo) {
          await api.update('personnel', { push_subscription_token: null }, { sicil_no: user.sicilNo });
        }
        setIsPushSubscribed(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Bildirim izni reddedildi. Lütfen tarayıcı ayarlarından bildirim iznini etkinleştirin.');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array('BGijonw6gf_TxWXTfukZCAc_bHPYE11lBPQF6CvGiVuAis5tVPiCFZ0A1y9Q7E7yV9fjiw5JnJWBQsun_Jj7PYM')
      });

      if (user?.sicilNo) {
        const subJson = JSON.stringify(sub);
        const res = await api.update('personnel', { push_subscription_token: subJson }, { sicil_no: user.sicilNo });
        if (res.error) {
          console.error('Push token save error:', res.error);
          alert('Bildirim aboneliği kaydedilemedi: ' + res.error);
        } else {
          setIsPushSubscribed(true);
        }
      }
    } catch (err) {
      console.error('Push bildirim abonelik hatası:', err);
      alert('Bildirim aboneliği oluşturulurken bir hata oluştu.');
    }
  };

  // Helper to determine notification triage styling
  const getNotificationTriage = (item: NotificationItem) => {
    const text = `${item.title} ${item.description}`.toLowerCase()
    
    // Critical Cases: Bina/Ev Yangını, Süresi Dolan Belge, Kritik
    if (
      text.includes('bina') || 
      text.includes('ev yang') || 
      text.includes('fabrika') || 
      text.includes('sıkışmalı') || 
      text.includes('kbrn') || 
      text.includes('süresi dolan') ||
      text.includes('kritik')
    ) {
      return 'critical'
    }
    
    // Medium Cases: Araç Yangını, Kurtarma Operasyonları, Denetim Görevi, SCBA Tüp/Maske Kontrolü, Belge Yenileme Uyarısı
    if (
      text.includes('araç') || 
      text.includes('kurtarma') || 
      text.includes('işyeri') ||
      text.includes('denetim') ||
      text.includes('scba tüp') ||
      text.includes('scba maske') ||
      text.includes('yenileme uyarısı')
    ) {
      return 'medium'
    }
    
    // Low Cases: Çöp/Ot Yangını, Malzeme Testi, normal tasks
    return 'low'
  }

  const renderNotificationsList = () => {
    if (notifications.length === 0) {
      return (
        <div className="p-8 text-center text-slate-500 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">Yeni bir bildirim veya göreviniz yok.</p>
        </div>
      )
    }

    return notifications.map((item) => {
      const triage = getNotificationTriage(item)
      let triageClass = ""
      let triageDot = null

      if (triage === 'critical') {
        triageClass = "border-l-4 border-l-red-500 bg-red-950/20"
        triageDot = (
          <span className="relative flex h-2 w-2 shrink-0 self-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )
      } else if (triage === 'medium') {
        triageClass = "border-l-4 border-l-amber-500 bg-amber-950/20"
      } else {
        triageClass = "border-l-4 border-l-emerald-500 bg-emerald-950/20"
      }

      return (
        <div 
          key={item.id}
          onClick={() => handleNotificationClick(item)}
          className={`p-4 flex items-start justify-between gap-3 transition-colors cursor-pointer group hover:bg-slate-900/40 relative border-b border-slate-800/20 ${triageClass} ${
            !item.read ? 'opacity-100 font-semibold' : 'opacity-80'
          }`}
        >
          {/* Left Icon Indicator */}
          <div className="mt-0.5 shrink-0">
            {item.type === 'urgent' && (
              <div className="bg-red-500/10 p-1.5 rounded-lg text-red-500">
                <Flame className="w-4 h-4 text-red-500 animate-pulse" />
              </div>
            )}
            {item.type === 'warning' && (
              <div className="bg-amber-500/10 p-1.5 rounded-lg text-amber-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
            {item.type === 'info' && (
              <div className="bg-blue-500/10 p-1.5 rounded-lg text-blue-500">
                <Info className="w-4 h-4" />
              </div>
            )}
            {item.type === 'success' && (
              <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Content using flex flex-col gap-1 layout */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {triageDot}
                <p className={`text-sm font-bold leading-tight truncate ${!item.read ? 'text-slate-100' : 'text-slate-400'}`}>
                  {item.title}
                </p>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0 font-medium">{item.time}</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400 line-clamp-2">
              {item.description}
            </p>

            {/* Canlı CBS Haritasını Görüntüle Link */}
            {item.type === 'urgent' && item.id.startsWith('inc-') && (
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <Link
                  href={item.actionUrl || '/yonetim/harita'}
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center text-xs font-bold text-red-500 hover:text-red-400 border border-red-500/30 hover:border-red-500/60 bg-red-950/20 px-2.5 py-1 rounded transition-all animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                >
                  Canlı CBS Haritasını Görüntüle
                </Link>
              </div>
            )}
          </div>

          {/* Right Control Actions (Visible on hover, and small [X] always visible) */}
          <div className="flex flex-col gap-1 shrink-0 self-start mt-0.5">
            <button
              onClick={(e) => removeNotification(item.id, e)}
              title="Sil"
              className="text-slate-500 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-800/40"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            
            <button
              onClick={(e) => toggleRead(item.id, e)}
              title={item.read ? "Okunmadı İşaretle" : "Okundu İşaretle"}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-slate-800/40"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )
    })
  }

  const displayName = user ? `${user.ad} ${user.soyad}` : "Misafir"
  const initials = user?.initials || "?"
  const rolLabel = user?.unvan || (user?.rol === 'Admin' ? 'Yönetici' : user?.rol === 'Editor' ? 'Amir' : user?.rol === 'Shift_Leader' ? 'Vardiya Çavuşu' : 'İtfaiye Eri')

  const handleLogout = async () => {
    await logout()
  }

  // Fetch dynamic notifications and tasks
  useEffect(() => {
    const fetchNotificationsAndTasks = async () => {
      const items: NotificationItem[] = []
      const now = new Date()

      // Read read & deleted notifications from localStorage
      let storedRead: string[] = []
      let storedDeleted: string[] = []
      if (typeof window !== 'undefined') {
        try {
          storedRead = JSON.parse(localStorage.getItem('itfaiye-read-notifications') || '[]')
          storedDeleted = JSON.parse(localStorage.getItem('itfaiye-deleted-notifications') || '[]')
        } catch (e) {
          console.error(e)
        }
      }

      try {
        // 1. Fetch Active Emergency Incidents (SUPABASE)
        const { data: incidents } = await api
          .from('incidents')
          .select('*')
          .eq('status', 'active')
          .order('cikis_saati', { ascending: false })

        if (incidents && incidents.length > 0) {
          incidents.forEach((inc: any) => {
            const itemId = `inc-${inc.id}`
            if (!storedDeleted.includes(itemId)) {
              items.push({
                id: itemId,
                title: `🚨 Canlı Olay İhbarı: ${inc.olay_turu}`,
                description: `${inc.mahalle || 'Sivas'} Adresinde ekipler çıkış yaptı!`,
                type: 'urgent',
                time: inc.cikis_saati ? new Date(inc.cikis_saati).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Az Önce',
                read: storedRead.includes(itemId),
                actionUrl: `/yonetim/harita?incidentId=${inc.id}`
              })
            }
          })
        }

        // 2. Fetch Vehicle Inspections (SUPABASE)
        const { data: vehicles } = await api
          .from('vehicles')
          .select('*')

        if (vehicles && vehicles.length > 0) {
          vehicles.forEach((v: any) => {
            const dateVal = v.muayeneBitis || v.next_inspection_date
            if (dateVal) {
              const expiry = new Date(dateVal)
              const diffTime = expiry.getTime() - now.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              
              if (diffDays <= 30) {
                const itemId = `vehicle-ins-${v.plaka}`
                if (!storedDeleted.includes(itemId)) {
                  items.push({
                    id: itemId,
                    title: `⚠️ Muayene Gecikmesi: ${v.plaka}`,
                    description: `Muayene Gecikmesi: ${v.plaka} muayene süresi geçti / dolmak üzere!`,
                    type: 'warning',
                    time: diffDays < 0 ? 'Gecikti' : `${diffDays} Gün Kaldı`,
                    read: storedRead.includes(itemId),
                    actionUrl: '/yonetim/araclar'
                  })
                }
              }
            }
          })
        }

        // 3. Fetch Staff Certifications (SUPABASE)
        const { data: certs } = await api
          .from('staff_certifications')
          .select('*')
          .eq('tip', 'Ehliyet')

        const { data: personnel } = await api
          .from('personnel')
          .select('*')

        const personnelMap = new Map()
        if (personnel) {
          personnel.forEach((p: any) => {
            personnelMap.set(p.sicil_no, `${p.ad} ${p.soyad}`)
          })
        }

        if (certs && certs.length > 0) {
          certs.forEach((c: any) => {
            if (c.gecerlilik_tarihi) {
              const expiry = new Date(c.gecerlilik_tarihi)
              const diffTime = expiry.getTime() - now.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              
              if (diffDays <= 90) { // Using 90 days as approaching so early certs in DB can be warning targets
                const itemId = `cert-license-${c.id}`
                if (!storedDeleted.includes(itemId)) {
                  const fullName = personnelMap.get(c.sicil_no) || c.sicil_no
                  items.push({
                    id: itemId,
                    title: `🪪 Ehliyet Geçerlilik: ${fullName}`,
                    description: `Ehliyet Geçerlilik: ${fullName} sürücü belgesi süresi yaklaşıyor!`,
                    type: 'info',
                    time: diffDays < 0 ? 'Süresi Doldu' : `${diffDays} Gün Kaldı`,
                    read: storedRead.includes(itemId),
                    actionUrl: '/yonetim/personel'
                  })
                }
              }
            }
          })
        }

      } catch (err) {
        console.error('[Topbar] Canlı bildirimler yüklenirken hata oluştu:', err)
      }

      // Sort notifications so that:
      // 1. Unread notifications are at the top, then read.
      // 2. Urgent (incidents) are at the top, then Warning (inspections), then Info (certifications).
      items.sort((a, b) => {
        if (a.read !== b.read) {
          return a.read ? 1 : -1
        }
        const priority = { urgent: 0, warning: 1, info: 2, success: 3 }
        return priority[a.type] - priority[b.type]
      })

      setNotifications(items)
    }

    fetchNotificationsAndTasks()
    
    // Auto-refresh notifications every 30 seconds to keep incidents live
    const interval = setInterval(fetchNotificationsAndTasks, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated, user, readIds, deletedIds])

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }))
      const allIds = updated.map(n => n.id)
      if (typeof window !== 'undefined') {
        const storedRead = JSON.parse(localStorage.getItem('itfaiye-read-notifications') || '[]')
        const newRead = Array.from(new Set([...storedRead, ...allIds]))
        localStorage.setItem('itfaiye-read-notifications', JSON.stringify(newRead))
        setReadIds(newRead)
      }
      return updated
    })
  }

  const toggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications(prev => {
      const item = prev.find(n => n.id === id)
      if (!item) return prev
      const willBeRead = !item.read
      if (typeof window !== 'undefined') {
        let storedRead = JSON.parse(localStorage.getItem('itfaiye-read-notifications') || '[]')
        if (willBeRead) {
          storedRead = Array.from(new Set([...storedRead, id]))
        } else {
          storedRead = storedRead.filter((x: string) => x !== id)
        }
        localStorage.setItem('itfaiye-read-notifications', JSON.stringify(storedRead))
        setReadIds(storedRead)
      }
      return prev.map(n => n.id === id ? { ...n, read: willBeRead } : n)
    })
  }

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (typeof window !== 'undefined') {
      const storedDeleted = JSON.parse(localStorage.getItem('itfaiye-deleted-notifications') || '[]')
      const newDeleted = Array.from(new Set([...storedDeleted, id]))
      localStorage.setItem('itfaiye-deleted-notifications', JSON.stringify(newDeleted))
      setDeletedIds(newDeleted)
    }
  }

  const handleNotificationClick = (item: NotificationItem) => {
    // Mark as read
    setNotifications(prev => {
      const updated = prev.map(n => n.id === item.id ? { ...n, read: true } : n)
      if (typeof window !== 'undefined') {
        const storedRead = JSON.parse(localStorage.getItem('itfaiye-read-notifications') || '[]')
        const newRead = Array.from(new Set([...storedRead, item.id]))
        localStorage.setItem('itfaiye-read-notifications', JSON.stringify(newRead))
        setReadIds(newRead)
      }
      return updated
    })
    setIsOpen(false)
    if (item.actionUrl) {
      router.push(item.actionUrl)
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-3 sm:px-4 md:px-6 z-30 h-14 relative">
      <div className="flex items-center md:hidden space-x-2">
        <Image src="/logo-itfaiye.png" alt="Logo" width={28} height={28} className="object-contain" />
        <h1 className="text-lg font-bold tracking-tight">Sivas İtfaiyesi</h1>
      </div>
      <div className="hidden md:flex flex-1"></div>
      <div className="flex items-center space-x-3">
        
        {/* Desktop Quick Scan Button */}
        <Link 
          href="/yonetim/tarayici" 
          className="hidden md:flex items-center space-x-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-full transition-colors mr-2"
        >
          <Camera size={18} />
          <span className="text-sm font-bold">QR Araç Tara</span>
        </Link>
        
        <GeofenceButton />

        {/* Notifications & Tasks Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`rounded-full p-2 hover:bg-muted relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              isOpen ? 'bg-muted text-primary' : 'text-muted-foreground'
            }`}
            aria-label="Bildirimler"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-red-600 border border-slate-900 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isOpen && mounted && isMobile && (
            <>
              {/* Backdrop Overlay */}
              <div 
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 transition-opacity duration-300 animate-in fade-in"
                onClick={() => setIsOpen(false)}
              />
              {/* Sliding Drawer Panel */}
              <div className="fixed inset-y-0 right-0 w-full max-w-[320px] bg-slate-950 border-l border-slate-800/80 shadow-2xl z-50 flex flex-col transition-transform duration-300 animate-in slide-in-from-right">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800/60 bg-slate-900/40 shrink-0">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-slate-100">Bildirimler</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-[11px] text-red-500 hover:text-red-400 font-bold transition-all flex items-center gap-1 shrink-0 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] border border-red-500/20 hover:border-red-500/50 bg-red-950/20 px-2.5 py-1 rounded-md"
                      >
                        <Check className="w-3.5 h-3.5" /> Tümünü Okundu İşaretle
                      </button>
                    )}
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors font-semibold"
                      aria-label="Kapat"
                    >
                      <span className="text-xl leading-none">&times;</span>
                    </button>
                  </div>
                </div>
                
                {/* Content Container */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60">
                  {renderNotificationsList()}
                </div>

                {/* Footer view CBS Map shortcut */}
                {notifications.length > 0 && (
                  <div className="p-3 border-t border-slate-800/60 bg-slate-950 text-center shrink-0">
                    <Link 
                      href="/yonetim/harita" 
                      onClick={() => setIsOpen(false)}
                      className="text-xs text-primary font-semibold hover:underline block"
                    >
                      Canlı CBS Haritasını Görüntüle
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}

          {isOpen && mounted && !isMobile && (
            <div className="absolute right-0 mt-3 w-96 origin-top-right bg-slate-950/95 backdrop-blur-xl border border-slate-800/80 shadow-2xl rounded-2xl overflow-hidden z-50 transition-all duration-300 animate-in fade-in slide-in-from-top-3">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-800/60 bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm text-slate-100">Bildirimler ve Görevler</span>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[11px] text-red-500 hover:text-red-400 font-bold transition-all flex items-center gap-1 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] border border-red-500/20 hover:border-red-500/50 bg-red-950/20 px-2.5 py-1 rounded-md"
                    >
                      <Check className="w-3.5 h-3.5" /> Tümünü Okundu İşaretle
                    </button>
                  )}
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors font-semibold"
                    aria-label="Kapat"
                  >
                    <span className="text-xl leading-none">&times;</span>
                  </button>
                </div>
              </div>
              
              {/* Content Container */}
              <div className="max-h-[450px] overflow-y-auto divide-y divide-slate-900/60">
                {renderNotificationsList()}
              </div>

              {/* Footer view CBS Map shortcut */}
              {notifications.length > 0 && (
                <div className="p-2.5 border-t border-slate-800/60 bg-slate-950 text-center">
                  <Link 
                    href="/yonetim/harita" 
                    onClick={() => setIsOpen(false)}
                    className="text-xs text-primary font-semibold hover:underline block"
                  >
                    Canlı CBS Haritasını Görüntüle
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
        
        {isAuthenticated ? (
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-3 bg-muted/50 rounded-full py-1.5 px-3 hover:bg-muted cursor-pointer transition-colors group focus:outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {initials}
              </div>
              <div className="hidden md:block text-sm pr-2 text-left">
                <p className="font-semibold leading-none text-foreground">{displayName}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5 uppercase tracking-wide flex items-center gap-1">
                  {rolLabel}
                </p>
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 origin-top-right bg-slate-950/95 backdrop-blur-xl border border-slate-800/80 shadow-2xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-2.5 border-b border-slate-900/60 bg-slate-900/10">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Hesap İşlemleri</p>
                </div>
                <div className="p-1.5 space-y-1">
                  <Link 
                    href="/yonetim/kilavuz"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors w-full text-left font-medium"
                  >
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <span>Kullanım Kılavuzu</span>
                  </Link>
                  <Link 
                    href="/sifre-degistir"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors w-full text-left font-medium"
                  >
                    <Key className="w-4 h-4" />
                    <span>Şifremi Değiştir</span>
                  </Link>
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      handlePushToggle();
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors w-full text-left font-medium"
                  >
                    <Bell className={`w-4 h-4 ${isPushSubscribed ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                    <span>{isPushSubscribed ? 'Canlı Bildirimleri Kapat' : 'Canlı İhbar Bildirimlerini Aç'}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false)
                      handleLogout()
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full text-left font-medium"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={() => router.push('/login')} 
            className="flex items-center space-x-2 bg-primary/10 rounded-full py-1.5 px-4 hover:bg-primary/20 text-primary text-sm font-semibold transition-colors"
          >
            Giriş Yap
          </button>
        )}
      </div>
    </header>
  )
}
