import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Truck } from 'lucide-react'
import Link from 'next/link'
import { VehicleForm } from '@/components/vehicles/VehicleForm'
import { Button } from '@/components/ui/button'
import { DeleteVehicleButton } from '@/components/vehicles/DeleteVehicleButton'
export default async function VehiclesPage() {
  const supabase = await createClient()

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Flota de Vehículos</h2>
          <p className="text-muted-foreground font-medium mt-1">Administra tus camiones y sus mantenimientos.</p>
        </div>
        <VehicleForm />
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold text-foreground/90">Inventario</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Patente</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Marca / Modelo</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Año</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Kilometraje</TableHead>
                <TableHead className="font-semibold text-muted-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles && vehicles.length > 0 ? (
                vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} className="border-border/40 hover:bg-muted/30 transition-colors group">
                    <TableCell className="font-bold text-foreground/90 group-hover:text-primary transition-colors">
                      <Link href={`/dashboard/vehicles/${vehicle.id}`} className="block w-full h-full">
                        {vehicle.plate}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-medium">
                      {vehicle.brand} {vehicle.model}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vehicle.year}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono">
                      {vehicle.current_km?.toLocaleString() || 0} km
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                          <Button variant="secondary" size="sm" className="h-8">Ver Ficha</Button>
                        </Link>
                        <DeleteVehicleButton id={vehicle.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableCell colSpan={4} className="text-center h-32 text-muted-foreground/80 font-medium">
                    No tienes camiones registrados aún.
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
