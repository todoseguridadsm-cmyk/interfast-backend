'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { deleteVehicle } from '@/app/actions/vehicles'
import { Loader2 } from 'lucide-react'

export function DeleteVehicleButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este vehículo?')) return
    
    setLoading(true)
    const result = await deleteVehicle(id)
    setLoading(false)

    if (result && result.error) {
      alert(result.error)
    }
  }

  return (
    <Button variant="destructive" size="sm" className="h-8" onClick={handleDelete} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
    </Button>
  )
}
