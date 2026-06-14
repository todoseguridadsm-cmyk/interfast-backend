import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Truck, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function TripsPage() {
  const supabase = await createClient()

  // Fetch recent trips
  const { data: trips } = await supabase
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

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Gestión de Viajes</h2>
          <p className="text-muted-foreground font-medium mt-1">Monitorea y administra la rentabilidad de las rutas.</p>
        </div>
        <Link href="/dashboard/trips/new">
          <Button className="gap-2 shadow-lg hover:shadow-primary/20 transition-all">
            <Plus className="h-4 w-4" /> Iniciar Viaje
          </Button>
        </Link>
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold text-foreground/90">Todos los Viajes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Ruta</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Cliente</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Chofer</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Estado</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Precio Pactado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips && trips.length > 0 ? (
                trips.map((trip) => (
                  <TableRow key={trip.id} className="border-border/40 hover:bg-muted/30 transition-colors cursor-pointer group">
                    <TableCell className="font-medium text-foreground/90">
                      <span className="text-foreground/80">{trip.origin}</span> <span className="mx-1 text-primary/50">→</span> <span className="text-foreground/80">{trip.destination}</span>
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
                    <TableCell className="text-right font-bold text-emerald-500">
                      ${trip.price?.toLocaleString() || '0.00'}
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
