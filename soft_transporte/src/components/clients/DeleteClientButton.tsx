'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { deleteClient } from '@/app/actions/clients'
import { Loader2 } from 'lucide-react'

export function DeleteClientButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) return
    
    setLoading(true)
    const result = await deleteClient(id)
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
