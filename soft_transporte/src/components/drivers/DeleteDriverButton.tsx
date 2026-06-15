'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { deleteDriver } from '@/app/actions/drivers'
import { Loader2 } from 'lucide-react'

export function DeleteDriverButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este chofer?')) return
    
    setLoading(true)
    const result = await deleteDriver(id)
    setLoading(false)

    if (result && result.error) {
      alert(result.error)
    }
  }

  return (
    <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
    </Button>
  )
}
