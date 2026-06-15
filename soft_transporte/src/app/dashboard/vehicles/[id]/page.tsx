import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Truck, Wrench, CheckCircle, Clock, AlertTriangle, AlertCircle } from 'lucide-react'
import { OdometerForm } from './OdometerForm'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Use Service Role Key to bypass RLS for reading vehicles and logs
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Fetch vehicle
  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
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

  // Helper para generar el componente de la alerta
  function getAlertDisplay(kmThreshold: number | null, dateThreshold: string | null, label: string) {
    if (!kmThreshold && !dateThreshold) {
      return (
        <div className="p-4 rounded-xl border bg-muted/10 border-border/50 flex flex-col gap-1">
          <p className="text-sm font-semibold text-muted-foreground uppercase">{label}</p>
          <p className="text-muted-foreground font-medium text-sm mt-2">Sin parámetros de control</p>
        </div>
      )
    }

    const today = new Date()
    today.setHours(0,0,0,0)
    let isRed = false
    let isYellow = false
    let messages: string[] = []

    // Comprobar Kilómetros
    if (kmThreshold) {
      const diffKm = kmThreshold - currentKm
      if (diffKm <= 200) {
        isRed = true
        messages.push(`Restan ${diffKm} km (Límite: ${kmThreshold.toLocaleString()})`)
      } else if (diffKm <= 1000) {
        isYellow = true
        messages.push(`Restan ${diffKm} km (Límite: ${kmThreshold.toLocaleString()})`)
      } else {
        messages.push(`Restan ${diffKm.toLocaleString()} km (Límite: ${kmThreshold.toLocaleString()})`)
      }
    }

    // Comprobar Fechas
    if (dateThreshold) {
      const targetDate = new Date(dateThreshold + 'T00:00:00')
      const diffTime = targetDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24))
      
      if (diffDays <= 5) {
        isRed = true
        messages.push(`Faltan ${diffDays} días (Límite: ${targetDate.toLocaleDateString()})`)
      } else if (diffDays <= 10) {
        isYellow = true
        messages.push(`Faltan ${diffDays} días (Límite: ${targetDate.toLocaleDateString()})`)
      } else {
        messages.push(`Límite de fecha: ${targetDate.toLocaleDateString()}`)
      }
    }

    let statusColor = 'text-emerald-500'
    let statusBg = 'bg-emerald-500/10'
    let borderColor = 'border-emerald-500/20'
    let Icon = CheckCircle

    if (isRed) {
      statusColor = 'text-destructive'
      statusBg = 'bg-destructive/10'
      borderColor = 'border-destructive/30'
      Icon = AlertCircle
    } else if (isYellow) {
      statusColor = 'text-amber-500'
      statusBg = 'bg-amber-500/10'
      borderColor = 'border-amber-500/30'
      Icon = AlertTriangle
    }

    return (
      <div className={`p-4 rounded-xl border ${statusBg} ${borderColor} flex flex-col gap-2 relative overflow-hidden group`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">{label}</p>
          <Icon className={`h-5 w-5 ${statusColor}`} />
        </div>
        <div className="space-y-1 mt-1">
          {messages.map((msg, i) => (
            <p key={i} className={`text-sm font-bold ${statusColor}`}>{msg}</p>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90 uppercase flex items-center gap-3">
            {vehicle.plate}
          </h2>
          <p className="text-muted-foreground font-medium mt-1">{vehicle.brand} {vehicle.model} ({vehicle.year}) - Capacidad: {vehicle.capacity_kg ? `${vehicle.capacity_kg} kg` : 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Odómetro Principal */}
        <Card className="col-span-1 md:col-span-2 bg-card/40 backdrop-blur-xl border-border/40 shadow-xl">
          <CardHeader className="border-b border-border/30 bg-muted/10">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="h-5 w-5 text-primary" /> Panel de Mantenimiento Preventivo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-8">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Kilometraje Actual de la Unidad</p>
              <div className="text-5xl font-black text-foreground/90 font-mono flex items-baseline gap-2">
                {currentKm.toLocaleString()} <span className="text-2xl text-muted-foreground font-medium uppercase tracking-widest">km</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getAlertDisplay(vehicle.next_service_km, vehicle.next_oil_change_date, 'Aceite de Motor')}
              {getAlertDisplay(vehicle.next_oil_filter_change_km, vehicle.next_oil_filter_change_date, 'Filtro de Aceite')}
              {getAlertDisplay(vehicle.next_air_filter_change_km, vehicle.next_air_filter_change_date, 'Filtro de Aire')}
              {getAlertDisplay(vehicle.next_gearbox_oil_change_km, vehicle.next_gearbox_oil_change_date, 'Aceite de Caja')}
            </div>
          </CardContent>
        </Card>

        {/* Actualizar Odómetro Manual */}
        <Card className="col-span-1 bg-card/40 backdrop-blur-xl border-border/40 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">Ajuste Manual</CardTitle>
            <CardDescription>Actualiza el odómetro si es necesario (Los viajes lo suman automáticamente).</CardDescription>
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
            <CardTitle className="text-lg font-bold text-foreground/90">Historial de Gastos Mecánicos</CardTitle>
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
