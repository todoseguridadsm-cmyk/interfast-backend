'use client'

import { useState } from 'react'
import { addCheck } from '@/app/actions/checks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Plus, Landmark, Calendar } from 'lucide-react'

export function CheckForm({ clients, suppliers }: { clients: any[], suppliers: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkType, setCheckType] = useState('a_cobrar')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    formData.append('check_type', checkType)

    const result = await addCheck(formData)
    
    setLoading(false)
    if (result.error) {
      alert(result.error)
    } else {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg hover:shadow-primary/20 transition-all bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="h-4 w-4" /> Ingresar Cheque
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Landmark className="h-6 w-6 text-indigo-500" /> Registro de Cheque
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Ingresa manualmente un cheque a la cartera (emitido o recibido).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          <div className="space-y-3">
            <Label className="text-foreground/80 font-semibold">Tipo de Cheque</Label>
            <Select value={checkType} onValueChange={setCheckType} required>
              <SelectTrigger className="bg-background/50 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a_cobrar">A Cobrar (Recibido de Cliente)</SelectItem>
                <SelectItem value="a_pagar">A Pagar (Emitido a Proveedor)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="bank_name" className="text-foreground/80 font-semibold">Banco <span className="text-destructive">*</span></Label>
              <Input id="bank_name" name="bank_name" placeholder="Ej. Galicia" required className="bg-background/50 h-11" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="check_number" className="text-foreground/80 font-semibold">Número <span className="text-destructive">*</span></Label>
              <Input id="check_number" name="check_number" placeholder="Ej. 0001234" required className="bg-background/50 h-11" />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="amount" className="text-foreground/80 font-semibold">Monto ($) <span className="text-destructive">*</span></Label>
            <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" required className="bg-background/50 h-11 font-bold text-lg" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="issue_date" className="flex items-center gap-1 text-foreground/80 font-semibold"><Calendar className="h-4 w-4" /> F. Emisión</Label>
              <Input id="issue_date" name="issue_date" type="date" required className="bg-background/50 h-11" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="due_date" className="flex items-center gap-1 text-foreground/80 font-semibold"><Calendar className="h-4 w-4" /> F. Cobro</Label>
              <Input id="due_date" name="due_date" type="date" required className="bg-background/50 h-11" />
            </div>
          </div>

          {checkType === 'a_cobrar' && (
            <div className="space-y-3">
              <Label className="text-foreground/80 font-semibold">Recibido de Cliente (Opcional)</Label>
              <Select name="client_id">
                <SelectTrigger className="bg-background/50 h-11">
                  <SelectValue placeholder="Seleccionar Cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {checkType === 'a_pagar' && (
            <div className="space-y-3">
              <Label className="text-foreground/80 font-semibold">Emitido a Proveedor (Opcional)</Label>
              <Select name="supplier_id">
                <SelectTrigger className="bg-background/50 h-11">
                  <SelectValue placeholder="Seleccionar Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button type="submit" className="w-full h-11 font-bold text-base shadow-lg bg-indigo-600 hover:bg-indigo-700 transition-all mt-4" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Guardar Cheque'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
