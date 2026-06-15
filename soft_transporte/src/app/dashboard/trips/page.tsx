import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Truck, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DeleteTripButton } from '@/components/trips/DeleteTripButton'

export default async function TripsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role = 'cliente'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile) role = profile.role
  }

  const isChofer = role === 'chofer'

  // Fetch recent trips
  let query = supabase
    .from('trips')
    .select(`
      id,
      origin,
      destination,
      status,
      price,
      clients ( company_name ),
      vehicles ( plate ),
      profiles!trips_driver_id_fkey ( full_name )
    `)
    .order('created_at', { ascending: false })

  if (isChofer && user) {
    query = query.eq('driver_id', user.id)
  }

  const { data: trips } = await query

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">
            {isChofer ? 'Mis Viajes' : 'Gestión de Viajes'}
          </h2>
          <p className="text-muted-foreground font-medium mt-1">
            {isChofer ? 'Consulta tus rutas activas y sube tus gastos.' : 'Monitorea y administra la rentabilidad de las rutas.'}
          </p>
        </div>
        <div className="flex gap-2">
          {isChofer && (
            <Link href="/dashboard/expenses">
              <Button variant="secondary" className="gap-2 shadow-lg hover:shadow-secondary/20 transition-all border border-border/50 bg-card">
                <Truck className="h-4 w-4" /> Subir Tickets
              </Button>
            </Link>
          )}
          {!isChofer && (
            <Link href="/dashboard/trips/new">
              <Button className="gap-2 shadow-lg hover:shadow-primary/20 transition-all">
                <Plus className="h-4 w-4" /> Iniciar Viaje
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold text-foreground/90">
              {isChofer ? 'Viajes Asignados' : 'Todos los Viajes'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Código / Ruta</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Cliente</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Chofer</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Estado</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Precio / Adelanto</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips && trips.length > 0 ? (
                trips.map((trip) => (
                  <TableRow key={trip.id} className="border-border/40 hover:bg-muted/30 transition-colors group">
                    <TableCell className="font-medium text-foreground/90">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono text-primary/80 mb-1">{trip.trip_code || 'S/C'}</span>
                        <div>
                          <span className="text-foreground/80">{trip.origin}</span> <span className="mx-1 text-primary/50">→</span> <span className="text-foreground/80">{trip.destination}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-semibold">
                      {(trip.clients as any)?.company_name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(trip.profiles as any)?.full_name || '-'}
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
                    <TableCell className="text-right font-bold">
                      <div className="flex flex-col items-end">
                        <span className="text-emerald-500">${trip.price?.toLocaleString() || '0.00'}</span>
                        {trip.advance_payment ? (
                          <span className="text-xs text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full mt-1">
                            Adelanto: ${trip.advance_payment.toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {trip.status === 'in_progress' && !isChofer && (
                          <form action={async () => {
                            'use server'
                            const { completeTrip } = await import('@/app/actions/trips')
                            await completeTrip(trip.id)
                          }}>
                            <Button variant="outline" size="sm" className="h-8 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10">
                              Finalizar Viaje
                            </Button>
                          </form>
                        )}
                        {!isChofer && (
                          <DeleteTripButton id={trip.id} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableCell colSpan={5} className="text-center h-32 text-muted-foreground/80 font-medium">
                    No hay viajes activos. Crea uno nuevo.
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
