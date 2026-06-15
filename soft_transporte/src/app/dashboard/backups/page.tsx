'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendBackup } from '@/app/actions/backups'
import { Mail, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react'

export default function BackupsPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const res = await sendBackup(formData)

    setLoading(false)

    if (res?.error) {
      setErrorMsg(res.error)
    } else if (res?.success) {
      setSuccess(true)
      // Reset after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90 flex items-center gap-3">
          Respaldo de Base de Datos
        </h2>
        <p className="text-muted-foreground font-medium mt-1">Exporta toda la información operativa y financiera a tu correo de confianza o al de tu contador.</p>
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl font-bold text-foreground/90">Generar Copia de Seguridad</CardTitle>
              <CardDescription>
                Se enviará un archivo JSON con los datos de clientes, proveedores, choferes, flota, viajes y gastos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="font-semibold text-foreground/80 flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Correo de destino
              </Label>
              <Input
                type="email"
                name="email"
                id="email"
                placeholder="ejemplo@contador.com o tu email personal"
                required
                className="bg-background/50 h-12 text-lg"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium">
                {errorMsg}
              </div>
            )}

            <Button 
              type="submit" 
              className={`w-full h-12 font-bold text-base shadow-lg transition-all ${
                success 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' 
                  : 'shadow-primary/20 hover:shadow-primary/40'
              }`}
              disabled={loading || success}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando respaldo...</>
              ) : success ? (
                <><CheckCircle2 className="mr-2 h-5 w-5" /> ¡Enviado Correctamente!</>
              ) : (
                'Enviar Respaldo por Correo'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
