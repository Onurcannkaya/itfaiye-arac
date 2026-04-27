import { Card, CardContent } from "@/components/ui/Card"
import { LucideIcon } from 'lucide-react'
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function StatCard({ title, value, icon: Icon, description, className }: StatCardProps) {
  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
      <CardContent className="p-6 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-auto">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
