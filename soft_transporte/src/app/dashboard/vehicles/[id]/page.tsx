import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Truck, Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { OdometerForm } from './OdometerForm'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // 1. Fetch vehicle
  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !vehicle) {
    notFound()
  }

  // 2. Fetch maintenance logs
  const { data: logs } = await supabase
    .from('maintenance_logs')
    .select('*')
    .eq('vehicle_id', vehicle.id)
    .order('created_at', { ascending: false })

  const currentKm = vehicle.current_km || 0
  const nextService = vehicle.next_service_km || 0
  const remaining = nextService > 0 ? nextService - currentKm : null
  
  let statusColor = 'text-emerald-500'
  let statusBg = 'bg-emerald-500/10'
  let statusText = 'Óptimo'

  if (remaining !== null) {
    if (remaining <= 0) {
      statusColor = 'text-destructive'
      statusBg = 'bg-destructive/10'
      statusText = 'Service Vencido'
    } else if (remaining <= 1000) {
      statusColor = 'text-amber-500'
      statusBg = 'bg-amber-500/10'
      statusText = 'Alerta: Service Próximo'
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90 uppercase">{vehicle.plate}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border border-current/20 ${statusBg} ${statusColor}`}>
              {statusText}
            </span>
          </div>
          <p className="text-muted-foreground font-medium mt-1">{vehicle.brand} {vehicle.model} ({vehicle.year})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Odómetro y Service */}
        <Card className="col-span-1 md:col-span-2 bg-card/40 backdrop-blur-xl border-border/40 shadow-xl">
          <CardHeader className="border-b border-border/30 bg-muted/10">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="h-5 w-5 text-primary" /> Kilometraje y Próximo Service
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Kilometraje Actual</p>
              <div className="text-4xl font-black text-foreground/90 font-mono">
                {currentKm.toLocaleString()} <span className="text-xl text-muted-foreground font-medium">km</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Próximo Service (Fijado)</p>
              <div className="text-4xl font-black text-foreground/90 font-mono">
                {nextService > 0 ? nextService.toLocaleString() : '--'} <span className="text-xl text-muted-foreground font-medium">km</span>
              </div>
            </div>

            {remaining !== null && (
              <div className={`col-span-1 sm:col-span-2 p-4 rounded-xl border ${statusBg} border-current/10 ${statusColor} flex items-center gap-3`}>
                {remaining <= 1000 ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
                <div>
                  <p className="font-bold">
                    {remaining < 0 
                      ? `Se ha pasado por ${Math.abs(remaining).toLocaleString()} km.` 
                      : `Restan ${remaining.toLocaleString()} km para el próximo mantenimiento.`}
                  </p>
                  {remaining <= 1000 && <p className="text-sm opacity-90">Se notificará automáticamente al administrador.</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actualizar Odómetro (Acción Chofer) */}
        <Card className="col-span-1 bg-card/40 backdrop-blur-xl border-border/40 shadow-xl border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Reportar Llegada</CardTitle>
            <CardDescription>Actualiza el odómetro al finalizar la ruta.</CardDescription>
          </CardHeader>
          <CardContent>
            <OdometerForm vehicleId={vehicle.id} currentKm={currentKm} />
          </CardContent>
        </Card>

      </div>

      {/* Historial de Mantenimiento */}
      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl">
        <CardHeader className="border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold text-foreground/90">Historial de Mantenimiento</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Fecha</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Tipo de Service</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Km al momento</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id} className="border-border/40 hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground/80">
                      {new Date(log.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-semibold">{log.service_type}</TableCell>
                    <TableCell className="text-muted-foreground font-mono">{log.km_at_service?.toLocaleString()} km</TableCell>
                    <TableCell className="text-right font-bold text-foreground/90">
                      ${log.cost?.toLocaleString() || '0.00'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableCell colSpan={4} className="text-center h-32 text-muted-foreground/80 font-medium">
                    No hay registros de mantenimiento históricos.
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
