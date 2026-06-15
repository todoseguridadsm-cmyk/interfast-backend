import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react'
import { UserForm } from '@/components/users/UserForm'
import { Button } from '@/components/ui/button'
import { deleteUser } from '@/app/actions/users'

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'empleado'])
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Gestión de Usuarios</h2>
          <p className="text-muted-foreground font-medium mt-1">Administra accesos y permisos de tu personal.</p>
        </div>
        <UserForm />
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold text-foreground/90">Usuarios del Sistema</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Nombre / Usuario</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Rol</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Módulos de Acceso</TableHead>
                <TableHead className="font-semibold text-muted-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((user) => {
                  const isAdmin = user.role === 'admin'
                  return (
                    <TableRow key={user.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold text-foreground/90">
                        {user.full_name}
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${isAdmin ? 'bg-primary/10 text-primary border-primary/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                          {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                          {isAdmin ? 'Súper Admin' : 'Empleado'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {isAdmin ? (
                          <span className="text-emerald-500 text-sm font-medium">Acceso Total</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {user.permissions && Array.isArray(user.permissions) ? user.permissions.map(p => (
                              <span key={p} className="px-2 py-0.5 rounded bg-muted text-xs font-medium uppercase border border-border">
                                {p}
                              </span>
                            )) : <span className="text-destructive text-xs">Sin accesos</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={async () => {
                          'use server'
                          await deleteUser(user.id)
                        }}>
                          <Button variant="destructive" size="sm" className="h-8">
                            Eliminar
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableCell colSpan={4} className="text-center h-32 text-muted-foreground/80 font-medium">
                    No hay usuarios registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
