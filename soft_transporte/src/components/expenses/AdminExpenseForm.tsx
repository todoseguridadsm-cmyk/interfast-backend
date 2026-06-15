'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Receipt } from 'lucide-react'

const CATEGORIES = [
  'Combustible',
  'Peajes',
  'Mantenimiento',
  'Viáticos',
  'Otros'
]

export function AdminExpenseForm({ drivers, trips }: { drivers: any[], trips: any[] }) {
  const [loading, setLoading] = useState(false)
  const [driverId, setDriverId] = useState('')
  const [tripId, setTripId] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [provider, setProvider] = useState('')

  const availableTrips = trips.filter(t => t.driver_id === driverId && t.status === 'in_progress')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driverId || !tripId || !category || !amount) {
      alert("Por favor completa todos los campos requeridos.")
      return
    }

    setLoading(true)

    try {
      // Usaremos una Server Action dedicada para esto
      const formData = new FormData()
      formData.append('driver_id', driverId)
      formData.append('trip_id', tripId)
      formData.append('category', category)
      formData.append('amount', amount)
      formData.append('provider', provider)

      const { createAdminExpense } = await import('@/app/actions/expenses')
      const res = await createAdminExpense(formData)

      if (res.success) {
        alert("Gasto administrativo registrado con éxito.")
        setDriverId('')
        setTripId('')
        setCategory('')
        setAmount('')
        setProvider('')
      } else {
        alert(res.error || "Hubo un error al registrar el gasto.")
      }
    } catch (error) {
      alert("Error en el servidor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full bg-card/40 backdrop-blur-xl border-border/40 shadow-xl">
      <CardHeader className="bg-muted/10 border-b border-border/40">
        <CardTitle className="flex items-center gap-2 text-foreground/90">
          <Receipt className="h-5 w-5 text-emerald-500" />
          Carga de Gasto Administrativo
        </CardTitle>
        <CardDescription>Carga manual de gastos asociados a un chofer y código de viaje.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chofer <span className="text-destructive">*</span></Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Seleccionar chofer..." />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Viaje En Curso <span className="text-destructive">*</span></Label>
              <Select value={tripId} onValueChange={setTripId} disabled={!driverId || availableTrips.length === 0}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder={!driverId ? "Selecciona un chofer primero" : availableTrips.length === 0 ? "No hay viajes en curso" : "Seleccionar viaje..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableTrips.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.trip_code || 'S/C'} | {t.origin} a {t.destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoría <span className="text-destructive">*</span></Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Seleccionar categoría..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monto <span className="text-destructive">*</span></Label>
              <Input 
                type="number" 
                step="0.01" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                placeholder="0.00" 
                className="bg-background/50 font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Proveedor / Detalle (Opcional)</Label>
            <Input 
              type="text" 
              value={provider} 
              onChange={(e) => setProvider(e.target.value)} 
              placeholder="Ej. Combustible YPF" 
              className="bg-background/50"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full shadow-lg">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Registrar Gasto Manual
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
