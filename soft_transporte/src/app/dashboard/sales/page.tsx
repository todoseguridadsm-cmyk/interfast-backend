import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Receipt, Banknote, Download } from 'lucide-react'
import { SaleForm } from '@/components/sales/SaleForm'
import { Button } from '@/components/ui/button'

export default async function SalesPage() {
  const supabase = await createClient()

  const { data: sales } = await supabase
    .from('sales')
    .select(`
      *,
      clients ( company_name, cuit ),
      trips ( trip_code, origin, destination )
    `)
    .order('created_at', { ascending: false })

  const { data: clients } = await supabase.from('clients').select('id, company_name')
  const { data: trips } = await supabase.from('trips').select('id, trip_code, client_id, origin, destination')

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Ventas y Facturación</h2>
          <p className="text-muted-foreground font-medium mt-1">Gestión de cobros a clientes y facturación de viajes.</p>
        </div>
        <SaleForm clients={clients || []} trips={trips || []} />
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg font-bold text-foreground/90">Historial de Ventas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Comprobante</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Cliente</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Viaje Asoc.</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Forma de Pago</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Monto</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales && sales.length > 0 ? (
                sales.map((sale) => (
                  <TableRow key={sale.id} className="border-border/40 hover:bg-muted/30 transition-colors group">
                    <TableCell>
                      <div className="font-bold text-foreground/90 font-mono">{sale.voucher_number}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{new Date(sale.created_at).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground/90">{sale.clients?.company_name || 'Consumidor Final'}</div>
                      <div className="text-xs text-muted-foreground">CUIT: {sale.clients?.cuit || '-'}</div>
                    </TableCell>
                    <TableCell>
                      {sale.trips ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-bold text-primary/80">{sale.trips.trip_code}</span>
                          <span className="text-xs text-muted-foreground">{sale.trips.origin} a {sale.trips.destination}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin viaje asociado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <Banknote className="h-3 w-3" /> {sale.payment_method.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-500 text-lg">
                      ${sale.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* El PDF se generaría abriendo una nueva ventana con estilo de impresión */}
                        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => {
                          // TODO: Replace with real PDF generator
                          alert('Módulo de facturación ARCA próximo a integrar. Función de PDF temporalmente deshabilitada.')
                        }}>
                          <Download className="h-3.5 w-3.5" /> PDF
                        </Button>

                        <form action={async () => {
                          'use server'
                          const { deleteSale } = await import('@/app/actions/sales')
                          await deleteSale(sale.id)
                        }}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            ✕
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center h-32 text-muted-foreground/80 font-medium">
                    No hay ventas registradas.
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
