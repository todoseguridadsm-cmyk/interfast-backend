'use client'

import { useState } from 'react'
import { updateOdometer } from '@/app/actions/alerts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save } from 'lucide-react'

export function OdometerForm({ vehicleId, currentKm }: { vehicleId: string, currentKm: number }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    setSuccess(false)
    
    const kmStr = formData.get('km') as string
    const km = parseInt(kmStr, 10)

    if (isNaN(km) || km < currentKm) {
      setError(`El kilometraje debe ser mayor al actual (${currentKm}).`)
      setLoading(false)
      return
    }

    const res = await updateOdometer(vehicleId, km)
    
    setLoading(false)
    if (res.error) {
      setError(res.error)
    } else {
      setSuccess(true)
      const form = document.getElementById('odometer-form') as HTMLFormElement
      if (form) form.reset()
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <form id="odometer-form" action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="km">Nuevo Kilometraje</Label>
        <Input 
          id="km" 
          name="km" 
          type="number" 
          placeholder={currentKm.toString()} 
          required 
          className="bg-background/50 h-11 font-mono text-lg"
        />
      </div>
      
      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
      {success && <p className="text-sm text-emerald-500 font-medium">¡Odómetro actualizado y alertas verificadas!</p>}
      
      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Guardar Kilometraje
      </Button>
    </form>
  )
}
