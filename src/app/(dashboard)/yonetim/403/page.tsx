"use client"

import React from 'react'
import Link from 'next/link'
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'

export default function UnauthorizedPage() {
  const { user } = useAuthStore()

  return (
    <div className="relative min-h-[75vh] flex items-center justify-center text-center px-4 overflow-hidden select-none">
      {/* Premium Siber Neon Red Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none z-0 animate-pulse duration-[4000ms]" />
      
      <div className="relative group max-w-lg w-full z-10 animate-in zoom-in-95 duration-300">
        {/* Border glow decoration */}
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000" />
        
        {/* Glassmorphic Cyber Shield Card */}
        <div className="relative bg-slate-950/80 border border-red-500/20 backdrop-blur-xl p-8 sm:p-10 rounded-2xl shadow-2xl space-y-8">
          
          {/* Pulsating Cyber Shield Icon Wrapper */}
          <div className="relative w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500 animate-bounce">
            <ShieldAlert className="w-10 h-10 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <div className="absolute -inset-1.5 border border-red-500/30 rounded-full animate-ping opacity-75" />
          </div>
          
          {/* Warning Message Typography */}
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-semibold tracking-wider text-red-400 uppercase">
              Rütbe Sınırı Engeli
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black tracking-widest text-red-50 uppercase drop-shadow-md">
              ERİŞİM YETKİNİZ ENGELLENDİ!
            </h1>
            
            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Sayın personel, bulunmuş olduğunuz aktif rütbe/unvanınız (<span className="text-red-400 font-semibold">{user?.unvan || 'İtfaiye Eri'}</span>) bu kurumsal komuta modülüne ve yönetim araçlarına erişim hakkı tanımamaktadır.
            </p>
          </div>

          <div className="h-px bg-slate-900 border-b border-white/5" />

          {/* Action Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => typeof window !== 'undefined' && window.history.back()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-slate-300 font-bold py-3 px-6 rounded-xl transition duration-150 active:scale-95 text-xs min-h-[44px] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Geri Dön</span>
            </button>
            
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-red-900/30 transition duration-150 active:scale-95 text-xs min-h-[44px]"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Gösterge Paneline Dön</span>
            </Link>
          </div>
          
        </div>
      </div>
    </div>
  )
}
