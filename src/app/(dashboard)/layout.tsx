import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { MobileNav } from "@/components/layout/MobileNav"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen max-w-[100vw] bg-background overflow-hidden relative">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-x-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[140px] md:pb-0 p-[calc(var(--fd-sp)*2)] md:p-[calc(var(--fd-sp)*3)] scroll-smooth"
              style={{ paddingBottom: 'max(140px, calc(140px + env(safe-area-inset-bottom, 0px)))' }}>
          <div className="w-full h-full max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
