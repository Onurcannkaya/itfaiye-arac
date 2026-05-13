import { cn } from "@/lib/utils"

export function StatusIndicator({ status }: { status: 'aktif' | 'bakimda' | 'arizali' }) {
  return (
    <div className="relative flex h-3 w-3">
      <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", {
        "bg-success": status === 'aktif',
        "bg-warning": status === 'bakimda',
        "bg-danger": status === 'arizali'
      })}></span>
      <span className={cn("relative inline-flex rounded-full h-3 w-3", {
        "bg-success": status === 'aktif',
        "bg-warning": status === 'bakimda',
        "bg-danger": status === 'arizali'
      })}></span>
    </div>
  )
}
