'use client'

import { useState } from 'react'
import { addSupplier, updateSupplier } from '@/app/actions/suppliers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Plus, Store, Mail, Phone, MapPin, Hash, Edit } from 'lucide-react'

export function SupplierForm({ supplier }: { supplier?: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isEdit = !!supplier

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const result = isEdit ? await updateSupplier(supplier.id, formData) : await addSupplier(formData)
    
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
        {isEdit ? (
          <Button variant="secondary" size="sm" className="h-8">
            <Edit className="h-4 w-4 mr-2" /> Editar
          </Button>
        ) : (
          <Button className="gap-2 shadow-lg hover:shadow-primary/20 transition-all">
            <Plus className="h-4 w-4" /> Nuevo Proveedor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Store className="h-6 w-6 text-primary" /> {isEdit ? 'Editar Proveedor' : 'Agregar Proveedor'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            {isEdit ? 'Modifica los datos de la empresa proveedora.' : 'Ingresa los datos de la empresa proveedora (combustible, repuestos, etc).'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-3">
            <Label htmlFor="company_name" className="text-foreground/80 font-semibold">Razón Social <span className="text-destructive">*</span></Label>
            <Input id="company_name" name="company_name" defaultValue={supplier?.company_name} placeholder="Ej. Neumáticos S.A." required className="bg-background/50 h-11" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="cuit" className="flex items-center gap-2 text-foreground/80 font-semibold"><Hash className="h-4 w-4" /> CUIT</Label>
              <Input id="cuit" name="cuit" defaultValue={supplier?.cuit} placeholder="XX-XXXXXXXX-X" className="bg-background/50 h-11" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="phone" className="flex items-center gap-2 text-foreground/80 font-semibold"><Phone className="h-4 w-4" /> Teléfono</Label>
              <Input id="phone" name="phone" defaultValue={supplier?.phone} placeholder="Ej. 11 1234-5678" className="bg-background/50 h-11" />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="email" className="flex items-center gap-2 text-foreground/80 font-semibold"><Mail className="h-4 w-4" /> Correo Electrónico</Label>
            <Input id="email" name="email" type="email" defaultValue={supplier?.email} placeholder="contacto@empresa.com" className="bg-background/50 h-11" />
          </div>

          <div className="space-y-3">
            <Label htmlFor="address" className="flex items-center gap-2 text-foreground/80 font-semibold"><MapPin className="h-4 w-4" /> Dirección Física</Label>
            <Input id="address" name="address" defaultValue={supplier?.address} placeholder="Ej. Ruta 9 Km 45" className="bg-background/50 h-11" />
          </div>

          <Button type="submit" className="w-full h-11 font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all mt-4" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isEdit ? 'Guardar Cambios' : 'Registrar Proveedor')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
