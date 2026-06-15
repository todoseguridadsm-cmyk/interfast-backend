import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '@/components/clients/ClientForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Building2, Mail, Phone, Hash } from 'lucide-react'
import { DeleteClientButton } from '@/components/clients/DeleteClientButton'

export default async function ClientsPage() {
  const supabase = await createClient()
  
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Directorio de Clientes</h2>
          <p className="text-muted-foreground font-medium mt-1">Gestiona las empresas con las que trabajas.</p>
        </div>
        <ClientForm />
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold text-foreground/90">Listado Activo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Empresa</TableHead>
                <TableHead className="font-semibold text-muted-foreground">CUIT</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Contacto</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Email</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Teléfono</TableHead>
                <TableHead className="font-semibold text-muted-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients && clients.length > 0 ? (
                clients.map((client) => (
                  <TableRow key={client.id} className="border-border/40 hover:bg-muted/30 transition-colors group">
                    <TableCell className="font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                      {client.company_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Hash className="h-3 w-3" /> {client.cuit || '-'}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{client.contact_name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {client.email || '-'}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {client.phone || '-'}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ClientForm client={client} />
                        <DeleteClientButton id={client.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableCell colSpan={5} className="text-center h-32 text-muted-foreground/80 font-medium">
                    No hay clientes registrados aún. Usa el botón "Nuevo Cliente" para empezar.
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
