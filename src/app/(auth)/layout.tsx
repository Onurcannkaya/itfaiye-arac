export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent z-0 pointer-events-none" />
      <div className="z-10 w-full max-w-md p-4">
        {children}
      </div>
    </div>
  )
}
