import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { MobileNav } from "@/components/layout/MobileNav"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen max-w-[100vw] bg-background overflow-hidden relative">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-x-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[140px] md:pb-0 p-3 sm:p-4 md:p-6 lg:p-8 scroll-smooth"
              style={{ paddingBottom: 'max(140px, calc(140px + env(safe-area-inset-bottom, 0px)))' }}>
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
