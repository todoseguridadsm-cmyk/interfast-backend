'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { approveExpense } from '@/app/actions/expenses'
import { ScanText, CheckCircle, Loader2 } from 'lucide-react'

export function OcrFeed({ pendingExpenses }: { pendingExpenses: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleApprove = async (id: string) => {
    setLoadingId(id)
    await approveExpense(id)
    setLoadingId(null)
  }

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl col-span-1 lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground/90">
          <ScanText className="h-5 w-5 text-primary" /> Feed OCR (Pendientes)
        </CardTitle>
        <CardDescription>Gastos escaneados listos para revisión</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingExpenses && pendingExpenses.length > 0 ? (
            pendingExpenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
                <div>
                  <p className="font-semibold text-sm">{exp.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Chofer: {(exp.profiles as any)?.full_name || 'Desconocido'}
                  </p>
                  <p className="text-xs font-bold text-emerald-500 mt-1">${exp.amount?.toLocaleString()}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20"
                  onClick={() => handleApprove(exp.id)}
                  disabled={loadingId === exp.id}
                >
                  {loadingId === exp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                  Aprobar
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border/50 rounded-lg">
              No hay gastos pendientes.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
