import { ExpenseUpload } from '@/components/expenses/ExpenseUpload'

export default function ExpensesPage() {
  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Módulo OCR de Gastos</h2>
        <p className="text-muted-foreground font-medium mt-1">Sube tus comprobantes de viaje. Gemini IA extraerá la información y se vinculará a tu viaje activo.</p>
      </div>

      <div className="flex items-center justify-center py-10">
        <ExpenseUpload />
      </div>
    </div>
  )
}
