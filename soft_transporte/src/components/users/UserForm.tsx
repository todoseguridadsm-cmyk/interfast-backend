'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Plus, Shield, UserCog } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createUser } from '@/app/actions/users'

const PERMISSIONS = [
  { id: 'trips', label: 'Viajes' },
  { id: 'expenses', label: 'Gastos y OCR' },
  { id: 'clients', label: 'Clientes' },
  { id: 'drivers', label: 'Choferes' },
  { id: 'vehicles', label: 'Flota' },
  { id: 'invoices', label: 'Facturación' },
]

export function UserForm() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<'admin' | 'empleado'>('empleado')
  const [selectedPerms, setSelectedPerms] = useState<string[]>([])

  function togglePerm(id: string) {
    if (selectedPerms.includes(id)) {
      setSelectedPerms(selectedPerms.filter(p => p !== id))
    } else {
      setSelectedPerms([...selectedPerms, id])
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('role', role)
    if (role === 'empleado') {
      formData.set('permissions', JSON.stringify(selectedPerms))
    }

    const res = await createUser(formData)
    
    if (res?.error) {
      setError(res.error)
      setIsLoading(false)
    } else {
      setOpen(false)
      setIsLoading(false)
      setSelectedPerms([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg shadow-primary/20">
          <UserCog className="h-4 w-4" /> Registrar Usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-border/40 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Shield className="h-5 w-5 text-primary" /> 
            Nuevo Usuario
          </DialogTitle>
          <DialogDescription>
            Crea una cuenta administrativa o un empleado con accesos restringidos.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre Completo</label>
            <Input name="full_name" required placeholder="Ej: Juan Pérez" className="bg-background/50" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Correo Electrónico / Usuario</label>
            <Input name="email" type="text" required placeholder="juan@empresa.com o Juan2026" className="bg-background/50" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Contraseña Provisional</label>
            <Input name="password" required type="password" placeholder="Mínimo 6 caracteres" className="bg-background/50" minLength={6} />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Rol del Usuario</label>
            <Select value={role} onValueChange={(val: 'admin' | 'empleado') => setRole(val)}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Seleccionar Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Súper Administrador (Acceso Total)</SelectItem>
                <SelectItem value="empleado">Empleado (Acceso Restringido)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === 'empleado' && (
            <div className="space-y-3 pt-2 p-4 bg-muted/20 border border-border/50 rounded-xl">
              <label className="text-sm font-semibold text-foreground/90">Módulos Permitidos</label>
              <div className="grid grid-cols-2 gap-3">
                {PERMISSIONS.map(p => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedPerms.includes(p.id) ? 'bg-primary border-primary' : 'border-border bg-background group-hover:border-primary/50'}`}>
                      {selectedPerms.includes(p.id) && <Plus className="h-3 w-3 text-primary-foreground rotate-45" />}
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{p.label}</span>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={selectedPerms.includes(p.id)}
                      onChange={() => togglePerm(p.id)}
                    />
                  </label>
                ))}
              </div>
              {selectedPerms.length === 0 && (
                <p className="text-xs text-destructive mt-2">Debes seleccionar al menos un módulo.</p>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {error}
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isLoading || (role === 'empleado' && selectedPerms.length === 0)} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
