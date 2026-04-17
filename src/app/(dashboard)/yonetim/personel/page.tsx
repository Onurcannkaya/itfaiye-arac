"use client"

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Search, Plus, UserPlus, Shield, ShieldAlert, Key, MapPin, Loader2, Star, CheckCircle2, SlidersHorizontal, Settings2 } from "lucide-react"
import { mockPersonnel } from "@/lib/data"
import { type Personnel } from "@/types"
import { cn } from "@/lib/utils"

export default function PersonelYonetimPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>(mockPersonnel)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Registration form
  const [isAdding, setIsAdding] = useState(false)
  const [newAdSoyad, setNewAdSoyad] = useState("")
  const [newRole, setNewRole] = useState("User")
  
  // Fake toggle states for permissions (id -> permissions)
  const [permissions, setPermissions] = useState<Record<string, { viewOnly: boolean, canApprove: boolean, canPrint: boolean }>>(() => {
    const init: Record<string, { viewOnly: boolean, canApprove: boolean, canPrint: boolean }> = {}
    mockPersonnel.forEach(p => {
      init[p.sicil_no] = {
        viewOnly: p.rol === "User",
        canApprove: p.rol === "Shift_Leader" || p.rol === "Admin" || p.rol === "Editor",
        canPrint: p.rol === "Admin" || p.rol === "Editor",
      }
    })
    return init
  })

  // Auto generate next Sicil No
  const nextSicilSuffix = Math.max(...personnel.map(p => parseInt(p.sicil_no.replace("SB", "") || "0"))) + 1
  const nextSicil = `SB${nextSicilSuffix.toString().padStart(4, "0")}`

  const filteredPersonnel = useMemo(() => {
    if (!searchQuery) return personnel
    const query = searchQuery.toLowerCase()
    return personnel.filter(p => 
      p.ad.toLowerCase().includes(query) || 
      p.soyad.toLowerCase().includes(query) || 
      p.sicil_no.toLowerCase().includes(query) ||
      p.unvan.toLowerCase().includes(query)
    )
  }, [personnel, searchQuery])

  const handleAddPersonel = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdSoyad.trim()) return

    const parts = newAdSoyad.trim().split(" ")
    const soyad = parts.length > 1 ? parts.pop() || "" : ""
    const ad = parts.join(" ")

    const newPerson: Personnel = {
      sicil_no: nextSicil,
      ad,
      soyad,
      unvan: "İtfaiye Eri",
      rol: newRole,
      posta: ""
    }

    setPersonnel([...personnel, newPerson])
    setPermissions({
      ...permissions,
      [newPerson.sicil_no]: {
        viewOnly: newPerson.rol === "User",
        canApprove: newPerson.rol === "Shift_Leader" || newPerson.rol === "Admin" || newPerson.rol === "Editor",
        canPrint: newPerson.rol === "Admin" || newPerson.rol === "Editor",
      }
    })

    setNewAdSoyad("")
    setNewRole("User")
    setIsAdding(false)
  }

  const togglePermission = (sicilNo: string, perm: 'viewOnly' | 'canApprove' | 'canPrint') => {
    setPermissions(prev => ({
      ...prev,
      [sicilNo]: {
        ...prev[sicilNo],
        [perm]: !prev[sicilNo][perm]
      }
    }))
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personel Yönetimi</h1>
          <p className="text-muted-foreground text-sm mt-1">
            İtfaiye personeli kayıtları, yetkilendirme ve rol atama işlemleri.
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="shrink-0 gap-2">
          {isAdding ? <Settings2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {isAdding ? "İptal" : "Yeni Personel Ekle"}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-cyan-500/20 bg-cyan-500/[0.02] shadow-cyan-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-cyan-500">
              <UserPlus className="w-4 h-4" /> 
              Hızlı Personel Kayıt Formu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddPersonel} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-2 flex-col w-full sm:w-1/4">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Sicil No (Otom. Atandı)</label>
                <Input value={nextSicil} disabled className="font-mono bg-muted/50 border-input" />
              </div>
              <div className="space-y-2 flex-col w-full sm:w-1/2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Ad Soyad</label>
                <Input 
                  placeholder="Örn: Serdar Vatansever" 
                  value={newAdSoyad} 
                  onChange={e => setNewAdSoyad(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-2 flex-col w-full sm:w-1/4">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Sistem Rolü</label>
                <select 
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                >
                  <option value="Admin">Sistem Yöneticisi (Admin)</option>
                  <option value="Editor">Amir (Editor)</option>
                  <option value="Shift_Leader">Çavuş (Shift Leader)</option>
                  <option value="User">İtfaiye Eri (Kullanıcı)</option>
                </select>
              </div>
              <Button type="submit" className="w-full sm:w-auto h-11 px-8 gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium">
                <Plus className="w-4 h-4" /> Ekle
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Arama ve Liste */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center space-x-2">
            <UsersIcon className="w-5 h-5 text-muted-foreground" />
            <span>Kayıtlı Personel ({filteredPersonnel.length})</span>
          </CardTitle>
          <div className="relative w-full max-w-[200px] sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="İsim veya Sicil No ara..." 
              className="pl-9 h-9 text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {filteredPersonnel.map(person => {
              const isAdmin = person.rol === "Admin" || person.rol === "Editor"
              const isLeader = person.unvan.includes("Çavuş") || person.unvan.includes("Amir") || person.unvan.includes("Müdür")
              const perms = permissions[person.sicil_no] || { viewOnly: true, canApprove: false, canPrint: false }

              return (
                <div key={person.sicil_no} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  
                  {/* Info Section */}
                  <div className="flex items-center gap-3 w-full xl:w-2/5 shrink-0">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2",
                      isAdmin ? "bg-primary/10 text-primary border-primary/20" : 
                      isLeader ? "bg-warning/10 text-warning border-warning/20" : 
                      "bg-muted border-border"
                    )}>
                      {person.ad.charAt(0)}{person.soyad.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{person.ad} {person.soyad}</span>
                        {isLeader && (
                          <Badge variant="warning" className="text-[9px] px-1.5 py-0 uppercase flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-warning" />
                            {person.unvan}
                          </Badge>
                        )}
                        {isAdmin && !isLeader && (
                          <Badge variant="danger" className="text-[9px] px-1.5 py-0 uppercase flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            Geliştirici
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 font-mono">
                        <Key className="w-3 h-3" />
                        {person.sicil_no}
                        <span className="opacity-50">|</span>
                        <span>Rol: {person.rol}</span>
                        {!isLeader && !isAdmin && (
                          <>
                            <span className="opacity-50">|</span>
                            <span>{person.unvan}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* UI Toggle Permissions Sürükle-Bırak Mantığı */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 ml-12 xl:ml-0 overflow-x-auto pb-1 xl:pb-0 hide-scrollbar">
                    <label className="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
                      <div className="relative inline-flex h-5 w-9 shrink-0 items-center justify-center rounded-full bg-border transition-colors group-hover:opacity-80">
                         {perms.viewOnly ? (
                           <div className="absolute left-0 top-0 h-5 w-5 rounded-full bg-success translate-x-4 transition-transform shadow-sm flex items-center justify-center">
                             <CheckCircle2 className="w-3 h-3 text-white" />
                           </div>
                         ) : (
                           <div className="absolute left-0 top-0 h-5 w-5 rounded-full bg-surface translate-x-0 border transition-transform shadow-sm border-border" />
                         )}
                         {perms.viewOnly && <div className="absolute inset-0 bg-success/30 rounded-full" />}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors select-none">
                        Sadece Görüntüler
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
                      <div className="relative inline-flex h-5 w-9 shrink-0 items-center justify-center rounded-full bg-border transition-colors group-hover:opacity-80" onClick={(e) => { e.preventDefault(); togglePermission(person.sicil_no, 'canApprove') }}>
                         {perms.canApprove ? (
                           <div className="absolute left-0 top-0 h-5 w-5 rounded-full bg-cyan-500 translate-x-4 transition-transform shadow-sm flex items-center justify-center">
                             <ShieldAlert className="w-3 h-3 text-white" />
                           </div>
                         ) : (
                           <div className="absolute left-0 top-0 h-5 w-5 rounded-full bg-surface translate-x-0 border transition-transform shadow-sm border-border" />
                         )}
                         {perms.canApprove && <div className="absolute inset-0 bg-cyan-500/30 rounded-full border border-cyan-500/20" />}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors select-none">
                        Envanter Onaylar
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
                      <div className="relative inline-flex h-5 w-9 shrink-0 items-center justify-center rounded-full bg-border transition-colors group-hover:opacity-80" onClick={(e) => { e.preventDefault(); togglePermission(person.sicil_no, 'canPrint') }}>
                         {perms.canPrint ? (
                           <div className="absolute left-0 top-0 h-5 w-5 rounded-full bg-primary translate-x-4 transition-transform shadow-sm " />
                         ) : (
                           <div className="absolute left-0 top-0 h-5 w-5 rounded-full bg-surface translate-x-0 border transition-transform shadow-sm border-border" />
                         )}
                         {perms.canPrint && <div className="absolute inset-0 bg-primary/30 rounded-full" />}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors select-none">
                        Barkod Basabilir
                      </span>
                    </label>
                  </div>
                </div>
              )
            })}
            
            {filteredPersonnel.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Aramanızla eşleşen personel bulunamadı.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Informative Note for Admins */}
      <div className="p-4 bg-muted/30 border border-border/50 rounded-xl text-xs text-muted-foreground flex items-start gap-3">
        <SlidersHorizontal className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Bu ekrandaki <strong>Yetki Değiştirmeleri</strong> (Toggle'lar) anında kaydedilir ve <span className="font-mono">Role-Based Access Control</span> (RBAC) sisteminde aktif olur. "Sadece Görüntüler" yetkisindeki personeller, envanter sayımı yapabilir ancak sayımı sisteme bitmiş olarak kaydedemez (Onay bekler duruma düşer).
        </p>
      </div>

    </div>
  )
}

function UsersIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
