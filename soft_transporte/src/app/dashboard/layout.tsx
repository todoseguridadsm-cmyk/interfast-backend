import { ReactNode } from 'react'
import { Truck, Home, Users, FileText, Settings, LogOut, LayoutDashboard, Receipt } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/actions/auth'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border/50 bg-card/30 backdrop-blur-xl">
        <div className="flex h-16 items-center px-6 border-b border-border/50">
          <Truck className="h-6 w-6 text-primary mr-3 drop-shadow-md" />
          <span className="text-xl font-bold tracking-tight text-foreground/90">SoftTransporte</span>
        </div>
        <nav className="flex flex-col gap-2 p-4">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 text-primary transition-all hover:bg-primary/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-medium">Inicio</span>
          </Link>
          <Link href="/dashboard/trips" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary">
            <Truck className="h-5 w-5" />
            <span className="font-medium">Viajes</span>
          </Link>
          <Link href="/dashboard/expenses" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary">
            <Receipt className="h-5 w-5" />
            <span className="font-medium">Gastos y OCR</span>
          </Link>
          <Link href="/dashboard/clients" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary">
            <Users className="h-5 w-5" />
            <span className="font-medium">Clientes</span>
          </Link>
          <Link href="/dashboard/invoices" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary">
            <FileText className="h-5 w-5" />
            <span className="font-medium">Facturación</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-end border-b border-border/50 bg-background/60 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-foreground/80 bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
              Administrador
            </div>
            <form action={logout}>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Cerrar Sesión</span>
              </Button>
            </form>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
