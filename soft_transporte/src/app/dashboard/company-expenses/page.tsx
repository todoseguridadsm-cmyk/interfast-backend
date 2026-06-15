import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Wallet, Banknote } from 'lucide-react'
import { CompanyExpenseForm } from '@/components/companyExpenses/CompanyExpenseForm'
import { Button } from '@/components/ui/button'

export default async function CompanyExpensesPage() {
  const supabase = await createClient()

  const { data: expenses } = await supabase
    .from('company_expenses')
    .select(`
      *,
      suppliers ( company_name ),
      profiles ( full_name )
    `)
    .order('created_at', { ascending: false })

  const { data: suppliers } = await supabase.from('suppliers').select('id, company_name')
  const { data: drivers } = await supabase.from('profiles').select('id, full_name, balance').eq('role', 'chofer')

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Egresos y Sueldos</h2>
          <p className="text-muted-foreground font-medium mt-1">Gestión de gastos operativos, proveedores y liquidación de choferes.</p>
        </div>
        <CompanyExpenseForm suppliers={suppliers || []} drivers={drivers || []} />
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-lg font-bold text-foreground/90">Historial de Egresos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Fecha</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Categoría</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Descripción / Entidad</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Forma de Pago</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Monto</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses && expenses.length > 0 ? (
                expenses.map((exp) => (
                  <TableRow key={exp.id} className="border-border/40 hover:bg-muted/30 transition-colors group">
                    <TableCell className="text-muted-foreground font-medium">
                      {new Date(exp.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-muted border border-border/50 uppercase tracking-wider text-muted-foreground">
                        {exp.category.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground/90">{exp.description}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {exp.suppliers?.company_name ? `Proveedor: ${exp.suppliers.company_name}` : ''}
                        {exp.profiles?.full_name ? `Chofer: ${exp.profiles.full_name}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <Banknote className="h-3 w-3" /> {exp.payment_method.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-500">
                      ${exp.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={async () => {
                        'use server'
                        const { deleteCompanyExpense } = await import('@/app/actions/companyExpenses')
                        await deleteCompanyExpense(exp.id)
                      }}>
                        <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                          Anular
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center h-32 text-muted-foreground/80 font-medium">
                    No hay egresos registrados.
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
