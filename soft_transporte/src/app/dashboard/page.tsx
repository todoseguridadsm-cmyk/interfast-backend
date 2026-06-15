import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Truck, AlertTriangle, DollarSign, ScanText, PieChart } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { RouteChart } from '@/components/dashboard/RouteChart'
import { OcrFeed } from '@/components/dashboard/OcrFeed'

export default async function DashboardPage() {
  const supabase = await createClient()

  // --- 1. Fetching Data for KPIs ---
  const { data: allTrips } = await supabase.from('trips').select('id, origin, destination, price, status')
  const { data: allExpenses } = await supabase.from('expenses').select('trip_id, amount, status')
  const { data: vehicles } = await supabase.from('vehicles').select('id, plate, current_km, next_service_km, status')
  
  // Calculate KPIs
  const completedTrips = allTrips?.filter(t => t.status === 'completed') || []
  const facturacion = completedTrips.reduce((acc, t) => acc + (t.price || 0), 0)
  
  let rentabilidadTotal = 0
  completedTrips.forEach(t => {
     const tripExpenses = allExpenses?.filter(e => e.trip_id === t.id && e.status === 'approved') || []
     const cost = tripExpenses.reduce((acc, e) => acc + e.amount, 0)
     rentabilidadTotal += ((t.price || 0) - cost)
  })
  const rentabilidadPromedio = completedTrips.length > 0 ? (rentabilidadTotal / completedTrips.length) : 0

  let alertasCount = 0
  vehicles?.forEach(v => {
    const next = v.next_service_km || 0
    const curr = v.current_km || 0
    if (next > 0 && (next - curr) <= 1000) alertasCount++
  })

  const inProgressTripsCount = allTrips?.filter(t => t.status === 'in_progress').length || 0

  // --- 2. Charts Data Preparation ---
  // Dummy data para Ingresos vs Gastos para visualización. En producción, esto se agrupa por fecha.
  const revenueData = [
    { month: 'Ene', ingresos: 12000, gastos: 8400 },
    { month: 'Feb', ingresos: 15000, gastos: 9398 },
    { month: 'Mar', ingresos: 11000, gastos: 8800 },
    { month: 'Abr', ingresos: 17780, gastos: 10908 },
    { month: 'May', ingresos: 18890, gastos: 11800 },
    { month: 'Jun', ingresos: 23390, gastos: 12800 },
  ]
  
  // Rentabilidad por Ruta (agregada de datos reales)
  const routeMap: Record<string, { rentabilidad: number, count: number }> = {}
  completedTrips.forEach(t => {
     const route = `${t.origin} - ${t.destination}`
     const tripExpenses = allExpenses?.filter(e => e.trip_id === t.id && e.status === 'approved') || []
     const cost = tripExpenses.reduce((acc, e) => acc + e.amount, 0)
     const rent = (t.price || 0) - cost
     if (!routeMap[route]) routeMap[route] = { rentabilidad: 0, count: 0 }
     routeMap[route].rentabilidad += rent
     routeMap[route].count++
  })
  
  let routeData = Object.keys(routeMap).map(k => ({
     route: k,
     rentabilidad: routeMap[k].rentabilidad / routeMap[k].count
  })).sort((a,b) => b.rentabilidad - a.rentabilidad).slice(0, 5)

  if (routeData.length === 0) {
     routeData = [
       { route: 'Mza - Chile', rentabilidad: 1200 },
       { route: 'Mza - BsAs', rentabilidad: 850 },
       { route: 'Rosario - Cba', rentabilidad: 600 }
     ]
  }

  // --- 3. Feed OCR ---
  const { data: pendingExpenses } = await supabase
    .from('expenses')
    .select('id, description, amount, profiles!expenses_driver_id_fkey(full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Command Center</h2>
          <p className="text-muted-foreground font-medium mt-1">Visión ejecutiva del estado general de la flota y finanzas.</p>
        </div>
      </div>

      {/* KPIs Superiores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Dark with Green Accents */}
        <Card className="bg-[#111827] border-border/20 shadow-xl hover:shadow-2xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-400/80">Facturado (Mes)</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-full">
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">${facturacion.toLocaleString()}</div>
            <p className="text-xs font-medium text-emerald-500 mt-1 flex items-center gap-1">
              0 comprobantes emitidos
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Dark with Red Accents (Gastos/Rentabilidad) */}
        <Card className="bg-[#111827] border-border/20 shadow-xl hover:shadow-2xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-red-400/80">Rentabilidad Promedio</CardTitle>
            <div className="p-2 bg-red-500/10 rounded-full">
              <PieChart className="h-4 w-4 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">${rentabilidadPromedio.toLocaleString()}</div>
            <p className="text-xs font-medium text-red-500 mt-1 flex items-center gap-1">
              Neto por viaje
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Solid Yellow/Amber Gradient */}
        <Card className="bg-gradient-to-br from-[#f59e0b] to-[#d97706] border-none shadow-lg shadow-amber-500/20 text-white hover:shadow-amber-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-amber-50">Camiones en Ruta</CardTitle>
            <div className="p-2 bg-white/20 rounded-full backdrop-blur-md">
              <Truck className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{inProgressTripsCount}</div>
            <p className="text-xs font-medium text-amber-100 mt-1 flex items-center gap-1">
              Operando activamente
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Solid Purple/Blue Gradient */}
        <Card className={`bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] border-none shadow-lg shadow-indigo-500/20 text-white hover:shadow-indigo-500/40 transition-all relative overflow-hidden`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-indigo-50">Alertas de Flota</CardTitle>
            <div className={`p-2 rounded-full bg-white/20 backdrop-blur-md`}>
              <AlertTriangle className={`h-4 w-4 text-white`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{alertasCount}</div>
            <p className={`text-xs font-medium mt-1 text-indigo-100`}>
              Mantenimientos próximos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recharts Gráficos y Feed OCR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueChart data={revenueData} />
        <OcrFeed pendingExpenses={pendingExpenses || []} />
      </div>
      
      {/* Gráfico Inferior y Tabla de Flota */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RouteChart data={routeData} />

        {/* Estado de Flota Rápido */}
        <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <CardTitle className="text-lg font-bold text-foreground/90">Estado de Flota Activa</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="font-semibold text-muted-foreground">Camión</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Kilometraje</TableHead>
                  <TableHead className="text-right font-semibold text-muted-foreground">Salud</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles && vehicles.length > 0 ? (
                  vehicles.slice(0, 5).map((vehicle) => {
                    const remaining = (vehicle.next_service_km || 0) - (vehicle.current_km || 0)
                    let dotColor = 'bg-emerald-500'
                    if (vehicle.next_service_km > 0) {
                      if (remaining <= 0) dotColor = 'bg-destructive'
                      else if (remaining <= 1000) dotColor = 'bg-amber-500'
                    }

                    return (
                      <TableRow key={vehicle.id} className="border-border/40 hover:bg-muted/30">
                        <TableCell className="font-semibold">
                          <Link href={`/dashboard/vehicles/${vehicle.id}`} className="hover:text-primary transition-colors">
                            {vehicle.plate}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono">
                          {vehicle.current_km?.toLocaleString() || 0} km
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`w-3 h-3 rounded-full ${dotColor} shadow-[0_0_8px_currentColor]`}></span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground/80 font-medium">
                      No hay vehículos registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
