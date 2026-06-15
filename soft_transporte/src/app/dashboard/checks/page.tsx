import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Landmark, ArrowUpRight, ArrowDownRight, CalendarDays, Clock } from 'lucide-react'
import { CheckForm } from '@/components/checks/CheckForm'
import { Button } from '@/components/ui/button'

export default async function ChecksPage() {
  const supabase = await createClient()

  const { data: checks } = await supabase
    .from('checks')
    .select(`
      *,
      clients ( company_name ),
      suppliers ( company_name )
    `)
    .order('due_date', { ascending: true })

  const { data: clients } = await supabase.from('clients').select('id, company_name')
  const { data: suppliers } = await supabase.from('suppliers').select('id, company_name')

  // Calcular totales
  const totalACobrar = checks?.filter(c => c.check_type === 'a_cobrar' && c.status === 'pending').reduce((sum, c) => sum + c.amount, 0) || 0
  const totalAPagar = checks?.filter(c => c.check_type === 'a_pagar' && c.status === 'pending').reduce((sum, c) => sum + c.amount, 0) || 0

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Cartera de Cheques</h2>
          <p className="text-muted-foreground font-medium mt-1">Gestión de valores a cobrar y a pagar.</p>
        </div>
        <CheckForm clients={clients || []} suppliers={suppliers || []} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-emerald-600 flex items-center gap-2 text-lg">
              <ArrowUpRight className="h-5 w-5" /> Cheques A Cobrar (Pendientes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-extrabold text-emerald-600">${totalACobrar.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/10 border-destructive/20 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive flex items-center gap-2 text-lg">
              <ArrowDownRight className="h-5 w-5" /> Cheques A Pagar (Pendientes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-extrabold text-destructive">${totalAPagar.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-lg font-bold text-foreground/90">Valores en Cartera</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Tipo</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Banco y Nº</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Entidad</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Vencimiento</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Estado</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Monto</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checks && checks.length > 0 ? (
                checks.map((chk) => {
                  const isACobrar = chk.check_type === 'a_cobrar'
                  const today = new Date()
                  const dueDate = new Date(chk.due_date)
                  const diffTime = dueDate.getTime() - today.getTime()
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                  
                  const isNear = diffDays >= 0 && diffDays <= 7 && chk.status === 'pending'
                  const isExpired = diffDays < 0 && chk.status === 'pending'

                  return (
                  <TableRow key={chk.id} className="border-border/40 hover:bg-muted/30 transition-colors group">
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        isACobrar ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {isACobrar ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {isACobrar ? 'A Cobrar' : 'A Pagar'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground/90">{chk.bank_name}</div>
                      <div className="text-xs font-mono text-muted-foreground">#{chk.check_number}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-medium">
                      {isACobrar ? chk.clients?.company_name || 'Cliente No Espec.' : chk.suppliers?.company_name || 'Prov. No Espec.'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> {new Date(chk.due_date).toLocaleDateString()}
                        </div>
                        {(isNear || isExpired) && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit ${isExpired ? 'bg-destructive/20 text-destructive' : 'bg-amber-500/20 text-amber-500'}`}>
                            {isExpired ? 'VENCIDO' : `Faltan ${diffDays} días`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        chk.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                        chk.status === 'cashed' || chk.status === 'deposited' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {chk.status === 'pending' && <Clock className="h-3 w-3" />}
                        {chk.status.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      ${chk.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {chk.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <form action={async () => {
                            'use server'
                            const { updateCheckStatus } = await import('@/app/actions/checks')
                            await updateCheckStatus(chk.id, isACobrar ? 'deposited' : 'cashed')
                          }}>
                            <Button size="sm" variant="outline" className="h-8 text-xs font-bold">
                              {isACobrar ? 'Marcar Depositado' : 'Marcar Cobrado'}
                            </Button>
                          </form>
                          <form action={async () => {
                            'use server'
                            const { deleteCheck } = await import('@/app/actions/checks')
                            await deleteCheck(chk.id)
                          }}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                              ✕
                            </Button>
                          </form>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  )
                })
              ) : (
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center h-32 text-muted-foreground/80 font-medium">
                    No hay cheques en cartera.
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
