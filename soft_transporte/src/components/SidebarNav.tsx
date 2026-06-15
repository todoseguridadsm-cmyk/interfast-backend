'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Truck, Home, Users, FileText, LayoutDashboard, Receipt, Shield, Bell, Store, Wallet, Landmark, Banknote, FileDigit, MapPin, Bot } from 'lucide-react'

export function SidebarNav({ isAdmin, permissions }: { isAdmin: boolean, permissions: string[] }) {
  const pathname = usePathname()
  
  const hasAccess = (module: string) => isAdmin || permissions.includes(module)

  const links = [
    { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, id: 'home', exact: true, group: 'PRINCIPAL' },
    { href: '/dashboard/alerts', label: 'Alertas', icon: Bell, id: 'alerts', group: 'PRINCIPAL' },
    
    { href: '/dashboard/trips', label: 'Viajes', icon: Truck, id: 'trips', group: 'OPERACIONES' },
    { href: '/dashboard/expenses', label: 'Carga de Tickets', icon: Receipt, id: 'expenses', group: 'OPERACIONES' },
    { href: '/dashboard/sales', label: 'Ventas y Cobros', icon: Banknote, id: 'sales', group: 'OPERACIONES' },
    { href: '/dashboard/company-expenses', label: 'Egresos y Sueldos', icon: Wallet, id: 'company_expenses', group: 'OPERACIONES' },
    
    { href: '/dashboard/checks', label: 'Cartera de Cheques', icon: Landmark, id: 'checks', group: 'DIRECTORIO' },
    { href: '/dashboard/clients', label: 'Clientes', icon: Users, id: 'clients', group: 'DIRECTORIO' },
    { href: '/dashboard/suppliers', label: 'Proveedores', icon: Store, id: 'suppliers', group: 'DIRECTORIO' },
    { href: '/dashboard/drivers', label: 'Choferes', icon: Users, id: 'drivers', group: 'DIRECTORIO' },
    { href: '/dashboard/vehicles', label: 'Flota', icon: Truck, id: 'vehicles', group: 'DIRECTORIO' },
    
    { href: '#', label: 'Facturación AFIP', icon: FileDigit, id: 'afip', group: 'MÓDULOS PREMIUM' },
    { href: '#', label: 'Track GPS', icon: MapPin, id: 'gps', group: 'MÓDULOS PREMIUM' },
    { href: '#', label: 'Agente de IA', icon: Bot, id: 'ai', group: 'MÓDULOS PREMIUM' },
  ]

  // Group links by their 'group' property
  const groupedLinks = links.reduce((acc, link) => {
    // Show all links for now so the user can access them
    // if (link.id !== 'home' && !hasAccess(link.id)) return acc
    if (!acc[link.group]) acc[link.group] = []
    acc[link.group].push(link)
    return acc
  }, {} as Record<string, typeof links>)

  return (
    <nav className="flex flex-col gap-4 p-4 mt-2">
      {Object.entries(groupedLinks).map(([group, groupLinks]) => (
        <div key={group} className="flex flex-col gap-1">
          {group !== 'PRINCIPAL' && (
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-3">
              {group}
            </h4>
          )}
          {groupLinks.map(link => {
            const isActive = link.exact 
              ? pathname === link.href 
              : pathname.startsWith(link.href)

            const Icon = link.icon

            return (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-300 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold' 
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground font-medium'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </div>
      ))}

      <div className="flex flex-col gap-1 mt-2">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-3">
          ADMINISTRACIÓN & SEGURIDAD
        </h4>
        <Link 
          href="/dashboard/users" 
          className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-300 ${
            pathname.startsWith('/dashboard/users')
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold' 
              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground font-medium'
          }`}
        >
          <Shield className={`h-5 w-5 ${pathname.startsWith('/dashboard/users') ? 'text-white' : 'text-muted-foreground'}`} />
          <span>Usuarios</span>
        </Link>
        <Link 
          href="/dashboard/backups" 
          className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-muted-foreground hover:bg-white/5 hover:text-foreground font-medium transition-all duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-database-backup"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 12a9 3 0 0 0 5 2.69"/><path d="M21 9.3V5"/><path d="M3 5v14a9 3 0 0 0 6.47 2.88"/><path d="M12 12v4h4"/><path d="M13 20a5 5 0 0 0 9-3 4.5 4.5 0 0 0-4.5-4.5c-1.33 0-2.54.54-3.41 1.41L12 16"/></svg>
          <span>Backups (Respaldo)</span>
        </Link>
      </div>
    </nav>
  )
}
