'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { deleteSupplier } from '@/app/actions/suppliers'
import { Loader2 } from 'lucide-react'

export function DeleteSupplierButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este proveedor?')) return
    
    setLoading(true)
    const result = await deleteSupplier(id)
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
