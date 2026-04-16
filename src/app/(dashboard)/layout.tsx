import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { MobileNav } from "@/components/layout/MobileNav"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-[68px] md:pb-0 p-4 md:p-6 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
