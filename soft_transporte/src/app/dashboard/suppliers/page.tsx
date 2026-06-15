import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Store, Mail, Phone, MapPin, Hash } from 'lucide-react'
import { SupplierForm } from '@/components/suppliers/SupplierForm'
import { Button } from '@/components/ui/button'
import { DeleteSupplierButton } from '@/components/suppliers/DeleteSupplierButton'

export default async function SuppliersPage() {
  const supabase = await createClient()

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Gestión de Proveedores</h2>
          <p className="text-muted-foreground font-medium mt-1">Directorio de proveedores para compras y gastos de la empresa.</p>
        </div>
        <SupplierForm />
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold text-foreground/90">Directorio Activo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Razón Social</TableHead>
                <TableHead className="font-semibold text-muted-foreground">CUIT</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Contacto</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Dirección</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers && suppliers.length > 0 ? (
                suppliers.map((sup) => (
                  <TableRow key={sup.id} className="border-border/40 hover:bg-muted/30 transition-colors group">
                    <TableCell className="font-medium text-foreground/90">
                      {sup.company_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Hash className="h-3 w-3" /> {sup.cuit || '-'}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        {sup.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {sup.phone}</div>}
                        {sup.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {sup.email}</div>}
                        {!sup.phone && !sup.email && '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sup.address ? <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {sup.address}</div> : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <SupplierForm supplier={sup} />
                        <DeleteSupplierButton id={sup.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableCell colSpan={5} className="text-center h-32 text-muted-foreground/80 font-medium">
                    No hay proveedores registrados.
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
