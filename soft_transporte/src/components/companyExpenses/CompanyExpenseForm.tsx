'use client'

import { useState } from 'react'
import { addCompanyExpense } from '@/app/actions/companyExpenses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Plus, Wallet, FileText, Banknote, Calendar } from 'lucide-react'

export function CompanyExpenseForm({ suppliers, drivers }: { suppliers: any[], drivers: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    formData.append('category', category)
    formData.append('payment_method', paymentMethod)

    const result = await addCompanyExpense(formData)
    
    setLoading(false)
    if (result.error) {
      alert(result.error)
    } else {
      setOpen(false)
      setCategory('')
      setPaymentMethod('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg hover:shadow-primary/20 transition-all bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4" /> Nuevo Egreso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Wallet className="h-6 w-6 text-emerald-500" /> Registrar Egreso de Empresa
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Registra pagos a proveedores, sueldos de choferes o ajustes manuales de saldos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="text-foreground/80 font-semibold">Categoría <span className="text-destructive">*</span></Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="bg-background/50 h-11">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="combustible_mayorista">Combustible Mayorista</SelectItem>
                  <SelectItem value="neumaticos">Neumáticos</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento General</SelectItem>
                  <SelectItem value="sueldo">Sueldo Chofer</SelectItem>
                  <SelectItem value="ajuste_saldo">Ajuste de Saldo Chofer</SelectItem>
                  <SelectItem value="otros">Otros Gastos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="amount" className="text-foreground/80 font-semibold">Monto ($) <span className="text-destructive">*</span></Label>
              <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" required className="bg-background/50 h-11 font-bold text-emerald-500 text-lg" />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="description" className="flex items-center gap-2 text-foreground/80 font-semibold"><FileText className="h-4 w-4" /> Descripción</Label>
            <Input id="description" name="description" placeholder="Ej. Pago quincena / Compra de 4 cubiertas" required className="bg-background/50 h-11" />
          </div>

          {(category === 'combustible_mayorista' || category === 'neumaticos' || category === 'mantenimiento' || category === 'otros') && (
            <div className="space-y-3">
              <Label htmlFor="supplier_id" className="text-foreground/80 font-semibold">Proveedor Asignado</Label>
              <Select name="supplier_id">
                <SelectTrigger className="bg-background/50 h-11">
                  <SelectValue placeholder="Opcional: Seleccionar Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(category === 'sueldo' || category === 'ajuste_saldo') && (
            <div className="space-y-3 p-4 bg-primary/5 border border-primary/10 rounded-lg">
              <Label htmlFor="driver_id" className="text-foreground/80 font-semibold">Chofer a depositar/ajustar</Label>
              <Select name="driver_id" required>
                <SelectTrigger className="bg-background/50 h-11">
                  <SelectValue placeholder="Selecciona un chofer" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name} (Saldo: ${d.balance || 0})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Al registrar un sueldo o ajuste, el monto sumará al balance personal del chofer para compensar saldos negativos.
              </p>
            </div>
          )}

          <div className="border-t border-border/50 pt-5 mt-5">
            <div className="space-y-3">
              <Label className="text-foreground/80 font-semibold flex items-center gap-2"><Banknote className="h-4 w-4" /> Medio de Pago <span className="text-destructive">*</span></Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                <SelectTrigger className="bg-background/50 h-11">
                  <SelectValue placeholder="¿Cómo se pagó?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contado">Contado / Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                  <SelectItem value="cheque">Cheque (A Pagar)</SelectItem>
                  <SelectItem value="cuenta_corriente">Cuenta Corriente (A Deuda)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {paymentMethod === 'cheque' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border/50 animate-in fade-in zoom-in-95">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="bank_name" className="text-xs">Banco</Label>
                <Input id="bank_name" name="bank_name" placeholder="Ej. Santander" required={paymentMethod === 'cheque'} className="h-9" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="check_number" className="text-xs">Número de Cheque</Label>
                <Input id="check_number" name="check_number" placeholder="Ej. 00012345" required={paymentMethod === 'cheque'} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue_date" className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> F. Emisión</Label>
                <Input id="issue_date" name="issue_date" type="date" required={paymentMethod === 'cheque'} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> F. Cobro</Label>
                <Input id="due_date" name="due_date" type="date" required={paymentMethod === 'cheque'} className="h-9" />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full h-11 font-bold text-base bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all mt-6" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Registrar Pago'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
