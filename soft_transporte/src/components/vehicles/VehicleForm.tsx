'use client'

import { useState } from 'react'
import { addVehicle } from '@/app/actions/vehicles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Plus, Truck, Wrench } from 'lucide-react'

export function VehicleForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    
    const res = await addVehicle(formData)
    
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
          <Plus className="h-4 w-4" /> Agregar Unidad
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Truck className="h-6 w-6 text-primary" />
            Registrar Nuevo Camión
          </DialogTitle>
          <DialogDescription>
            Ingresa los datos generales y establece los límites de mantenimiento preventivo.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-8 pt-4">
          
          {/* SECCIÓN 1: DATOS GENERALES */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary border-b border-border/50 pb-2">
              <Truck className="h-4 w-4" /> Datos de la Unidad
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plate">Patente <span className="text-destructive">*</span></Label>
                <Input id="plate" name="plate" required placeholder="Ej: AB 123 CD" className="bg-background/50 uppercase" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidad (Kg)</Label>
                <Input id="capacity" name="capacity" type="number" placeholder="Ej: 30000" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marca <span className="text-destructive">*</span></Label>
                <Input id="brand" name="brand" required placeholder="Ej: Scania" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo <span className="text-destructive">*</span></Label>
                <Input id="model" name="model" required placeholder="Ej: G410" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Año <span className="text-destructive">*</span></Label>
                <Input id="year" name="year" type="number" required placeholder="2024" className="bg-background/50" min={1980} max={new Date().getFullYear() + 1} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_km">Kilometraje Actual</Label>
                <Input id="current_km" name="current_km" type="number" placeholder="Ej: 150000" className="bg-background/50" />
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: MANTENIMIENTO PREVENTIVO */}
          <section className="space-y-4 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-500 border-b border-amber-500/20 pb-2">
              <Wrench className="h-4 w-4" /> Alertas de Mantenimiento (Topes)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="space-y-3">
                <Label className="text-amber-500/90 font-bold">Aceite de Motor</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input name="next_service_km" type="number" placeholder="Km tope" className="bg-background/50 text-xs" />
                  <Input name="next_oil_change_date" type="date" className="bg-background/50 text-xs block" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-amber-500/90 font-bold">Filtro de Aceite</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input name="next_oil_filter_change_km" type="number" placeholder="Km tope" className="bg-background/50 text-xs" />
                  <Input name="next_oil_filter_change_date" type="date" className="bg-background/50 text-xs block" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-amber-500/90 font-bold">Filtro de Aire</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input name="next_air_filter_change_km" type="number" placeholder="Km tope" className="bg-background/50 text-xs" />
                  <Input name="next_air_filter_change_date" type="date" className="bg-background/50 text-xs block" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-amber-500/90 font-bold">Aceite de Caja</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input name="next_gearbox_oil_change_km" type="number" placeholder="Km tope" className="bg-background/50 text-xs" />
                  <Input name="next_gearbox_oil_change_date" type="date" className="bg-background/50 text-xs block" />
                </div>
              </div>

            </div>
          </section>

          {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</p>}
          
          <div className="pt-4 flex justify-end gap-2 border-t border-border/50">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="px-8 shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar Vehículo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
