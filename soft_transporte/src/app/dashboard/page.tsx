import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Truck, Activity, DollarSign, AlertCircle, ScanText, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch some dummy or real data stats
  const { count: tripsCount } = await supabase.from('trips').select('*', { count: 'exact', head: true })
  const { count: vehiclesCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true })
  
  // Gastos pendientes
  const { count: pendingExpenses } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  // Fetch recent trips
  const { data: recentTrips } = await supabase
    .from('trips')
    .select(`
      id,
      origin,
      destination,
      status,
      price,
      clients ( company_name ),
      vehicles ( plate )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Panel de Control</h2>
          <p className="text-muted-foreground font-medium mt-1">Resumen de operaciones logísticas en tiempo real.</p>
        </div>
        
        {/* Botón principal OCR */}
        <div className="flex items-center gap-3">
          <Button className="bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all gap-2 h-11 px-6 font-semibold">
            <ScanText className="h-5 w-5" />
            Escanear Ticket OCR
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-lg hover:bg-card/60 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Viajes Activos</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground/90">{tripsCount || 0}</div>
            <p className="text-xs font-medium text-emerald-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Operando normal
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-lg hover:bg-card/60 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Vehículos Disp.</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Truck className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground/90">{vehiclesCount || 0}</div>
            <p className="text-xs font-medium text-muted-foreground mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 100% operativos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-lg hover:bg-card/60 transition-colors relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Gastos a Revisar</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-full">
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground/90">{pendingExpenses || 0}</div>
            <p className="text-xs font-medium text-amber-500 mt-1">Pendientes de aprobación</p>
          </CardContent>
          {pendingExpenses && pendingExpenses > 0 ? (
            <div className="absolute top-0 right-0 w-2 h-full bg-amber-500/20"></div>
          ) : null}
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-lg hover:bg-card/60 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Facturación Mes</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-full">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground/90">$0.00</div>
            <p className="text-xs font-medium text-muted-foreground mt-1">Cierre actual</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trips Table */}
      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold text-foreground/90">Viajes Recientes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Cliente</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Ruta</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Vehículo</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Estado</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTrips && recentTrips.length > 0 ? (
                recentTrips.map((trip) => (
                  <TableRow key={trip.id} className="border-border/40 hover:bg-muted/30 transition-colors cursor-pointer group">
                    <TableCell className="font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                      {(trip.clients as any)?.company_name || 'Sin Asignar'}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-medium">
                      <span className="text-foreground/80">{trip.origin}</span> <span className="mx-1 text-primary/50">→</span> <span className="text-foreground/80">{trip.destination}</span>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-secondary/50 border border-border/50 text-xs font-semibold text-secondary-foreground">
                        {(trip.vehicles as any)?.plate || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        trip.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        trip.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-muted text-muted-foreground border-border/50'
                      }`}>
                        {trip.status === 'completed' ? 'Completado' : trip.status === 'in_progress' ? 'En Curso' : 'Pendiente'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground/90">
                      ${trip.price?.toLocaleString() || '0.00'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableCell colSpan={5} className="text-center h-32 text-muted-foreground/80 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Truck className="h-8 w-8 text-muted-foreground/30" />
                      No hay viajes registrados aún.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
