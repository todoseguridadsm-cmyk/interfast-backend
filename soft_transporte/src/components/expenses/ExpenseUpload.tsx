'use client'

import { useState } from 'react'
import { processExpenseReceipt, processManualExpense } from '@/app/actions/expenses'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, UploadCloud, CheckCircle, AlertCircle, ReceiptText, PenTool } from 'lucide-react'

const CATEGORIES = [
  'Combustible',
  'Peajes',
  'Mantenimiento',
  'Viáticos',
  'Otros'
]

export function ExpenseUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>('')
  const [isManual, setIsManual] = useState(false)
  const [manualAmount, setManualAmount] = useState('')
  const [manualProvider, setManualProvider] = useState('')
  
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setStatus('idle')
      setResult(null)
    }
  }

  const resetForm = () => {
    setFile(null)
    setManualAmount('')
    setManualProvider('')
    setStatus('idle')
    setResult(null)
    const fileInput = document.getElementById('receipt') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const handleSubmit = async () => {
    if (!category) {
      setStatus('error')
      setErrorMessage('Por favor selecciona una categoría.')
      return
    }

    setStatus('uploading')
    
    let res;
    if (isManual) {
      if (!manualAmount) {
        setStatus('error')
        setErrorMessage('El monto es obligatorio para cargas manuales.')
        return
      }
      const formData = new FormData()
      formData.append('amount', manualAmount)
      formData.append('category', category)
      formData.append('provider', manualProvider)
      res = await processManualExpense(formData)
    } else {
      if (!file) {
        setStatus('error')
        setErrorMessage('Sube la imagen del ticket.')
        return
      }
      const formData = new FormData()
      formData.append('receipt', file)
      formData.append('category', category)

      await new Promise(r => setTimeout(r, 600))
      setStatus('analyzing')
      res = await processExpenseReceipt(formData)
    }

    if (res.success) {
      setStatus('success')
      setResult(res.data)
      setFile(null)
      setManualAmount('')
      setManualProvider('')
    } else {
      setStatus('error')
      setErrorMessage(res.error || 'Ocurrió un error inesperado.')
    }
  }

  return (
    <Card className="w-full max-w-md bg-card/40 backdrop-blur-xl border-border/40 shadow-2xl relative overflow-hidden transition-all hover:border-primary/30">
      <CardHeader className="border-b border-border/30 pb-4 bg-muted/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            {isManual ? <PenTool className="h-6 w-6 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" /> : <UploadCloud className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" />}
            {isManual ? 'Carga Manual' : 'Escanear Ticket OCR'}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={isManual} 
              onCheckedChange={(checked) => {
                setIsManual(checked)
                resetForm()
              }} 
            />
            <Label className="text-xs font-semibold cursor-pointer text-muted-foreground whitespace-nowrap">Sin Comprobante</Label>
          </div>
        </div>
        <CardDescription className="text-muted-foreground/90 font-medium mt-2">
          {isManual 
            ? 'Carga un gasto sin ticket o comprobante físico.' 
            : 'Sube la foto de tu comprobante. Gemini IA extraerá los datos automáticamente.'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        
        <div className="space-y-3">
          <Label className="text-foreground/80 font-semibold">Categoría del Gasto <span className="text-destructive">*</span></Label>
          <Select value={category} onValueChange={setCategory} disabled={status === 'uploading' || status === 'analyzing'}>
            <SelectTrigger className="bg-background/50 h-12">
              <SelectValue placeholder="Selecciona la categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isManual ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-foreground/80 font-semibold">Monto Gastado <span className="text-destructive">*</span></Label>
              <Input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                className="bg-background/50 h-12 text-lg font-bold"
                disabled={status === 'uploading' || status === 'analyzing'}
              />
            </div>
            <div className="space-y-3">
              <Label className="text-foreground/80 font-semibold">Proveedor / Detalle (Opcional)</Label>
              <Input 
                type="text" 
                placeholder="Ej. Peaje Autopista"
                value={manualProvider}
                onChange={(e) => setManualProvider(e.target.value)}
                className="bg-background/50 h-12"
                disabled={status === 'uploading' || status === 'analyzing'}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Label htmlFor="receipt" className="text-foreground/80 font-semibold">Seleccionar Imagen <span className="text-destructive">*</span></Label>
            <Input 
              id="receipt" 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="file:text-primary file:font-bold file:bg-primary/10 file:border-0 hover:file:bg-primary/20 file:mr-4 file:px-4 file:py-2 h-14 cursor-pointer bg-background/50 border-border/50 transition-colors pt-[10px]"
              disabled={status === 'uploading' || status === 'analyzing'}
            />
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-3 p-4 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl animate-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {status === 'success' && result && (
          <div className="space-y-3 p-5 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in fade-in zoom-in-95 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
            <div className="flex items-center gap-2 text-emerald-500 font-extrabold text-base mb-3 border-b border-emerald-500/20 pb-2">
              <CheckCircle className="h-5 w-5" />
              ¡Procesado y Guardado!
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-foreground/90">
              <div className="flex flex-col"><span className="text-muted-foreground/80 text-xs font-bold uppercase tracking-wider">Monto</span> <span className="font-bold text-lg">${result.monto} {result.moneda}</span></div>
              <div className="flex flex-col"><span className="text-muted-foreground/80 text-xs font-bold uppercase tracking-wider">Fecha</span> <span className="font-semibold">{result.fecha}</span></div>
              <div className="col-span-2 flex flex-col"><span className="text-muted-foreground/80 text-xs font-bold uppercase tracking-wider">Proveedor</span> <span className="font-semibold">{result.proveedor}</span></div>
              <div className="col-span-2 flex flex-col"><span className="text-muted-foreground/80 text-xs font-bold uppercase tracking-wider">Categoría</span> <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary mt-1">{result.categoria}</span></div>
            </div>
          </div>
        )}

        <Button 
          onClick={handleSubmit} 
          disabled={status === 'uploading' || status === 'analyzing'}
          className={`w-full h-12 font-bold text-base shadow-[0_0_15px_rgba(var(--primary),0.2)] transition-all hover:shadow-[0_0_25px_rgba(var(--primary),0.4)] hover:-translate-y-0.5 relative overflow-hidden ${isManual ? 'bg-amber-500 hover:bg-amber-600 text-amber-950' : ''}`}
        >
          {status === 'uploading' && <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {isManual ? 'Guardando...' : 'Subiendo...'}</>}
          {status === 'analyzing' && <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analizando con Gemini IA...</>}
          {status === 'idle' && (isManual ? 'Cargar Gasto Manual' : 'Extraer Datos del Ticket')}
          {status === 'error' && 'Intentar Nuevamente'}
          {status === 'success' && 'Cargar Otro Gasto'}
          
          {(status === 'uploading' || status === 'analyzing') && (
            <div className="absolute inset-0 bg-black/10 animate-pulse"></div>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
