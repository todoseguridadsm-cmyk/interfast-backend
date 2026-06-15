'use client'

import { useState } from 'react'
import { addDriver, updateDriver } from '@/app/actions/drivers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Plus, UserRound, KeyRound, HeartPulse, MapPin, Edit } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

export function DriverForm({ driver }: { driver?: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!driver

  async function onSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    
    const res = isEdit ? await updateDriver(driver.id, formData) : await addDriver(formData)
    
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
        {isEdit ? (
          <Button variant="secondary" size="sm" className="h-8">
            <Edit className="h-4 w-4 mr-2" /> Editar
          </Button>
        ) : (
          <Button className="gap-2 shadow-lg hover:shadow-primary/20 transition-all">
            <Plus className="h-4 w-4" /> Alta de Chofer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <UserRound className="h-6 w-6 text-primary" />
            {isEdit ? 'Editar Ficha del Chofer' : 'Ficha del Chofer'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos personales y de acceso del chofer.' : 'Registra los datos personales, clínicos y credenciales de acceso.'}
          </DialogDescription>
        </DialogHeader>
        
        <form action={onSubmit} className="space-y-8 pt-4">
          
          {/* SECCIÓN 1: ACCESO */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary border-b border-border/50 pb-2">
              <KeyRound className="h-4 w-4" /> Credenciales de Acceso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario (Para ingresar app) <span className="text-destructive">*</span></Label>
                <Input id="username" name="username" required defaultValue={driver?.username} placeholder="Ej: Carlos123" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña {isEdit ? '(Opcional)' : <span className="text-destructive">*</span>}</Label>
                <Input id="password" name="password" required={!isEdit} type="password" placeholder={isEdit ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"} className="bg-background/50" minLength={6} />
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: DATOS PERSONALES */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary border-b border-border/50 pb-2">
              <MapPin className="h-4 w-4" /> Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="full_name">Nombre Completo <span className="text-destructive">*</span></Label>
                <Input id="full_name" name="full_name" required defaultValue={driver?.full_name} placeholder="Carlos López" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono Móvil</Label>
                <Input id="phone" name="phone" defaultValue={driver?.phone} placeholder="+54 9 11..." className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                <Input id="birth_date" name="birth_date" defaultValue={driver?.birth_date} type="date" className="bg-background/50 block" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Dirección de Residencia</Label>
                <Input id="address" name="address" defaultValue={driver?.address} placeholder="Calle Falsa 123" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" name="city" defaultValue={driver?.city} placeholder="Ej: Córdoba" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input id="province" name="province" defaultValue={driver?.province} placeholder="Ej: Córdoba" className="bg-background/50" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="license_expiry">Vencimiento del Carnet de Conducir</Label>
                <Input id="license_expiry" name="license_expiry" defaultValue={driver?.license_expiry} type="date" className="bg-background/50 block" />
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: FICHA MÉDICA */}
          <section className="space-y-4 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-500 border-b border-red-500/20 pb-2">
              <HeartPulse className="h-4 w-4" /> Ficha Clínica y Emergencias
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blood_type">Grupo Sanguíneo</Label>
                <Input id="blood_type" name="blood_type" defaultValue={driver?.blood_type} placeholder="Ej: O+" className="bg-background/50" />
              </div>
              <div className="flex flex-col justify-center space-y-3 pt-2">
                <Label>¿Es donante de órganos?</Label>
                <div className="flex items-center gap-2">
                  <Switch name="is_donor" id="is_donor" defaultChecked={driver?.is_donor} />
                  <Label htmlFor="is_donor" className="cursor-pointer text-muted-foreground">Sí, es donante</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Tel. Contacto Emergencia</Label>
                <Input id="emergency_contact_phone" name="emergency_contact_phone" defaultValue={driver?.emergency_contact_phone} placeholder="Teléfono de familiar" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_relation">Relación / Parentesco</Label>
                <Input id="emergency_contact_relation" name="emergency_contact_relation" defaultValue={driver?.emergency_contact_relation} placeholder="Ej: Esposa, Padre" className="bg-background/50" />
              </div>
            </div>
          </section>
          
          {error && (
            <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="pt-4 flex justify-end gap-2 border-t border-border/50">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="px-8 shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? 'Guardar Cambios' : 'Guardar Ficha'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
