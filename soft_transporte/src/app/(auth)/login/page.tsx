'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Loader2, Truck } from 'lucide-react'

const formSchema = z.object({
  email: z.string().min(1, 'Por favor ingresa tu usuario o correo.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
})

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)
    const result = await login(values)
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 shadow-2xl ring-1 ring-primary/20 backdrop-blur-2xl">
            <Truck className="h-10 w-10 text-primary drop-shadow-md" />
            <div className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-primary animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground/90">Senda CMR</h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Sistema de Gestión Logística Integral</p>
          </div>
        </div>

        <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-2xl ring-1 ring-white/5">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Ingresa tus credenciales para acceder al sistema operativo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Usuario o Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="nombre@empresa.com" 
                          {...field} 
                          className="bg-background/50 border-border/50 h-11 transition-all focus-visible:ring-primary/50 focus-visible:border-primary/50" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-foreground/80">Contraseña</FormLabel>
                      </div>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                          className="bg-background/50 border-border/50 h-11 transition-all focus-visible:ring-primary/50 focus-visible:border-primary/50" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <div className="animate-in slide-in-from-top-1 p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Validando acceso...
                    </>
                  ) : (
                    'Acceder al Panel'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/40 py-4">
            <p className="text-xs font-medium text-muted-foreground/60">
              Desarrollado con arquitectura de alta disponibilidad.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
