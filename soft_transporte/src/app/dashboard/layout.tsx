import { ReactNode } from 'react'
import { Truck, Home, Users, FileText, Settings, LogOut, LayoutDashboard, Receipt, Shield } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { SessionTimeout } from '@/components/SessionTimeout'

import { SidebarNav } from '@/components/SidebarNav'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let role = 'empleado'
  let permissions: string[] = []
  
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role, permissions').eq('id', user.id).single()
    if (profile) {
      role = profile.role
      permissions = profile.permissions || []
    }
  }

  const isAdmin = role === 'admin'

  return (
    <div className="flex min-h-screen bg-background">
      <SessionTimeout />
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border/50 bg-card/30 backdrop-blur-xl flex flex-col">
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-border/50">
          <Truck className="h-6 w-6 text-primary mr-3 drop-shadow-md" />
          <span className="text-xl font-bold tracking-tight text-foreground/90">Senda CMR</span>
        </div>
        <div className="flex-1 overflow-y-auto pb-4">
          <SidebarNav isAdmin={isAdmin} permissions={permissions} />
        </div>
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
              <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
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
