'use client'

import { useState } from 'react'
import { addClient } from '@/app/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Plus, Building2 } from 'lucide-react'

export function ClientForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    
    const res = await addClient(formData)
    
    setLoading(false)
    if (res.error) {
      setError(res.error)
    } else {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg hover:shadow-primary/20 transition-all">
          <Plus className="h-4 w-4" /> Nuevo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card/90 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Añadir Cliente
          </DialogTitle>
          <DialogDescription>
            Ingresa los datos de la empresa para poder asignarle viajes y facturación.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Razón Social / Empresa <span className="text-destructive">*</span></Label>
            <Input id="company_name" name="company_name" required placeholder="Transportes S.A." className="bg-background/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input id="cuit" name="cuit" placeholder="30-12345678-9" className="bg-background/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" placeholder="+54 9 11..." className="bg-background/50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_name">Nombre de Contacto</Label>
            <Input id="contact_name" name="contact_name" placeholder="Juan Pérez" className="bg-background/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input id="email" name="email" type="email" placeholder="contacto@empresa.com" className="bg-background/50" />
          </div>
          
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar Cliente
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
