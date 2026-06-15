import { createClient } from '@/lib/supabase/server'
import { ExpenseUpload } from '@/components/expenses/ExpenseUpload'
import { AdminExpenseForm } from '@/components/expenses/AdminExpenseForm'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role = 'cliente'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile) role = profile.role
  }

  const isChofer = role === 'chofer'
  const isSecretaria = role === 'admin' || role === 'empleado'

  // Fetch drivers and trips for the admin form
  let drivers: any[] = []
  let trips: any[] = []

  if (isSecretaria) {
    const { data: driversData } = await supabase.from('profiles').select('id, full_name').eq('role', 'chofer')
    if (driversData) drivers = driversData

    const { data: tripsData } = await supabase
      .from('trips')
      .select('id, trip_code, driver_id, status, origin, destination')
      .eq('status', 'in_progress')
    if (tripsData) trips = tripsData
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">Gestión de Gastos y OCR</h2>
        <p className="text-muted-foreground font-medium mt-1">Sube tus comprobantes de viaje o carga gastos manualmente.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col items-center py-4">
          <ExpenseUpload />
        </div>

        {isSecretaria && (
          <div className="flex flex-col items-center py-4">
            <AdminExpenseForm drivers={drivers} trips={trips} />
          </div>
        )}
      </div>
    </div>
  )
}
