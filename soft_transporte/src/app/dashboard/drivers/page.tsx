import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserRound, Phone, Mail, Wallet } from 'lucide-react'
import { DriverForm } from '@/components/drivers/DriverForm'
import { DeleteDriverButton } from '@/components/drivers/DeleteDriverButton'

export default async function DriversPage() {
  const supabase = await createClient()

  const { data: drivers } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'chofer')
    .order('full_name', { ascending: true })

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Gestión de Choferes</h2>
          <p className="text-muted-foreground font-medium mt-1">Administra el personal, sus accesos y estados de cuenta.</p>
        </div>
        <DriverForm />
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold text-foreground/90">Nómina de Conductores</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Nombre</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Contacto y Acceso</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Ficha Técnica</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Balance</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers && drivers.length > 0 ? (
                drivers.map((driver) => {
                  const today = new Date()
                  const expiry = driver.license_expiry ? new Date(driver.license_expiry) : null
                  const isExpired = expiry ? expiry < today : false
                  const isExpiringSoon = expiry ? (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24) < 30 && !isExpired : false

                  return (
                    <TableRow key={driver.id} className="border-border/40 hover:bg-muted/30 transition-colors group">
                      <TableCell className="font-bold text-foreground/90">
                        {driver.full_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="flex items-center gap-1.5 font-medium"><UserRound className="h-3 w-3" /> @{driver.username || 'Sin Usuario'}</span>
                          <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {driver.phone || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          {driver.blood_type && <span>Grupo: <strong>{driver.blood_type}</strong> {driver.is_donor ? '(Donante)' : ''}</span>}
                          {expiry ? (
                            <span className={`font-medium ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-amber-500' : 'text-emerald-500'}`}>
                              Vence: {expiry.toLocaleDateString()}
                            </span>
                          ) : (
                            <span>Sin Carnet</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center justify-end gap-2 text-emerald-500 font-bold font-mono">
                            <Wallet className="h-4 w-4" />
                            ${driver.balance?.toLocaleString() || '0.00'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <DriverForm driver={driver} />
                          <DeleteDriverButton id={driver.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableCell colSpan={4} className="text-center h-32 text-muted-foreground/80 font-medium">
                    No hay choferes registrados aún.
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
