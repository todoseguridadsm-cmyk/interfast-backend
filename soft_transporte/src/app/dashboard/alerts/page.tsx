import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, AlertTriangle, CheckCircle, Truck, Wrench } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Alert = {
  vehicleId: string
  plate: string
  brand: string
  model: string
  type: 'critical' | 'warning'
  component: string
  message: string
}

export default async function AlertsPage() {
  const supabase = (await createClient()) as any

  // Fetch all vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('plate')

  const { data: checks } = await supabase
    .from('checks')
    .select('*, clients(company_name), suppliers(company_name)')
    .eq('status', 'pending')

  // Fetch all drivers
  const { data: drivers } = await supabase
    .from('profiles')
    .select('id, full_name, license_expiry')
    .eq('role', 'chofer')

  const alerts: Alert[] = []
  const checkAlerts: any[] = []
  const driverAlerts: any[] = []

  if (vehicles) {
    const today = new Date()
    today.setHours(0,0,0,0)

    vehicles.forEach((v: any) => {
      const currentKm = v.current_km || 0

      // Helper to check KM
      const checkKm = (limit: number | null, label: string) => {
        if (!limit) return
        const diff = limit - currentKm
        if (diff <= 200) {
          alerts.push({
            vehicleId: v.id, plate: v.plate, brand: v.brand, model: v.model,
            type: 'critical', component: label,
            message: diff < 0 ? `Límite superado por ${Math.abs(diff)} km` : `Restan solo ${diff} km (Límite: ${limit.toLocaleString()})`
          })
        } else if (diff <= 1000) {
          alerts.push({
            vehicleId: v.id, plate: v.plate, brand: v.brand, model: v.model,
            type: 'warning', component: label,
            message: `Restan ${diff} km (Límite: ${limit.toLocaleString()})`
          })
        }
      }

      // Helper to check Date
      const checkDate = (limitDate: string | null, label: string) => {
        if (!limitDate) return
        const target = new Date(limitDate + 'T00:00:00')
        const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24))
        
        if (diffDays <= 5) {
          alerts.push({
            vehicleId: v.id, plate: v.plate, brand: v.brand, model: v.model,
            type: 'critical', component: label,
            message: diffDays < 0 ? `Vencido hace ${Math.abs(diffDays)} días` : `Vence en ${diffDays} días (${target.toLocaleDateString()})`
          })
        } else if (diffDays <= 10) {
          alerts.push({
            vehicleId: v.id, plate: v.plate, brand: v.brand, model: v.model,
            type: 'warning', component: label,
            message: `Vence en ${diffDays} días (${target.toLocaleDateString()})`
          })
        }
      }

      // Check all parameters
      checkKm(v.next_service_km, 'Aceite de Motor (Km)')
      checkDate(v.next_oil_change_date, 'Aceite de Motor (Fecha)')
      
      checkKm(v.next_oil_filter_change_km, 'Filtro de Aceite (Km)')
      checkDate(v.next_oil_filter_change_date, 'Filtro de Aceite (Fecha)')
      
      checkKm(v.next_air_filter_change_km, 'Filtro de Aire (Km)')
      checkDate(v.next_air_filter_change_date, 'Filtro de Aire (Fecha)')
      
      checkKm(v.next_gearbox_oil_change_km, 'Aceite de Caja (Km)')
      checkDate(v.next_gearbox_oil_change_date, 'Aceite de Caja (Fecha)')
    })
  }

  if (checks) {
    const today = new Date()
    today.setHours(0,0,0,0)

    checks.forEach((chk: any) => {
      const target = new Date(chk.due_date + 'T00:00:00')
      const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24))
      
      if (diffDays <= 7) {
        checkAlerts.push({
          id: chk.id,
          check_type: chk.check_type,
          amount: chk.amount,
          bank: chk.bank_name,
          number: chk.check_number,
          entity: chk.check_type === 'a_cobrar' ? chk.clients?.company_name : chk.suppliers?.company_name,
          diffDays,
          targetDate: target.toLocaleDateString(),
          type: diffDays < 0 ? 'critical' : 'warning'
        })
      }
    })
  }

  if (drivers) {
    const today = new Date()
    today.setHours(0,0,0,0)

    drivers.forEach((driver: any) => {
      if (!driver.license_expiry) return
      const target = new Date(driver.license_expiry + 'T00:00:00')
      const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24))

      if (diffDays <= 45) {
        driverAlerts.push({
          id: driver.id,
          name: driver.full_name,
          diffDays,
          targetDate: target.toLocaleDateString(),
          type: diffDays <= 15 ? 'critical' : 'warning'
        })
      }
    })
  }

  // Ordenar alertas: Críticas primero
  alerts.sort((a, b) => {
    if (a.type === 'critical' && b.type === 'warning') return -1
    if (a.type === 'warning' && b.type === 'critical') return 1
    return 0
  })

  checkAlerts.sort((a, b) => {
    if (a.type === 'critical' && b.type === 'warning') return -1
    if (a.type === 'warning' && b.type === 'critical') return 1
    return 0
  })

  driverAlerts.sort((a, b) => {
    if (a.type === 'critical' && b.type === 'warning') return -1
    if (a.type === 'warning' && b.type === 'critical') return 1
    return 0
  })

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90 flex items-center gap-3">
            Centro de Alertas <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span></span>
          </h2>
          <p className="text-muted-foreground font-medium mt-1">Supervisión predictiva de mantenimientos, cheques y documentación.</p>
        </div>
      </div>

      {alerts.length === 0 && checkAlerts.length === 0 && driverAlerts.length === 0 ? (
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle className="h-16 w-16 text-emerald-500 mb-4" />
            <h3 className="text-2xl font-bold text-foreground/90">¡Todo en Orden!</h3>
            <p className="text-muted-foreground mt-2 max-w-md">No hay mantenimientos cercanos, vencimientos de carnet ni cheques por vencer en este momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Choferes */}
          {driverAlerts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground/80 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-contact-round"><path d="M16 18a4 4 0 0 0-8 0"/><circle cx="12" cy="11" r="3"/><rect width="18" height="18" x="3" y="4" rx="2"/></svg>
                Vencimientos de Carnet
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {driverAlerts.map((alert, idx) => (
                  <Card key={`drv-${idx}`} className={`border backdrop-blur-xl shadow-lg transition-all hover:shadow-xl ${
                    alert.type === 'critical' ? 'bg-destructive/5 border-destructive/30' : 'bg-amber-500/5 border-amber-500/30'
                  }`}>
                    <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${alert.type === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'}`}>
                          {alert.type === 'critical' ? <AlertCircle className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground/90 flex items-center gap-2">
                            Chofer: {alert.name}
                          </h4>
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 mt-1">
                            <span className={`font-bold ${alert.type === 'critical' ? 'text-destructive' : 'text-amber-500'}`}>
                              → {alert.diffDays < 0 ? `Carnet vencido hace ${Math.abs(alert.diffDays)} días` : `Carnet vence en ${alert.diffDays} días (${alert.targetDate})`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Link href={`/dashboard/drivers`}>
                        <Button variant={alert.type === 'critical' ? 'destructive' : 'outline'} className={alert.type === 'warning' ? 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10' : ''}>
                          Gestionar Choferes
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Mantenimientos */}
          {alerts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground/80 flex items-center gap-2"><Wrench className="h-5 w-5" /> Mantenimiento de Flota</h3>
              <div className="grid grid-cols-1 gap-4">
                {alerts.map((alert, idx) => (
                  <Card key={idx} className={`border backdrop-blur-xl shadow-lg transition-all hover:shadow-xl ${
                    alert.type === 'critical' ? 'bg-destructive/5 border-destructive/30' : 'bg-amber-500/5 border-amber-500/30'
                  }`}>
                    <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${alert.type === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'}`}>
                          {alert.type === 'critical' ? <AlertCircle className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground/90 flex items-center gap-2 uppercase tracking-wider">
                            <Truck className="h-4 w-4" /> {alert.plate} <span className="text-muted-foreground font-normal normal-case text-sm">({alert.brand} {alert.model})</span>
                          </h4>
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 mt-1">
                            <span className="font-semibold text-foreground/80 flex items-center gap-1"><Wrench className="h-3 w-3" /> {alert.component}</span>
                            <span className={`font-bold ${alert.type === 'critical' ? 'text-destructive' : 'text-amber-500'}`}>→ {alert.message}</span>
                          </div>
                        </div>
                      </div>
                      <Link href={`/dashboard/vehicles/${alert.vehicleId}`}>
                        <Button variant={alert.type === 'critical' ? 'destructive' : 'outline'} className={alert.type === 'warning' ? 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10' : ''}>
                          Ver Ficha Técnica
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Cheques */}
          {checkAlerts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground/80 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-landmark"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
                Vencimientos de Cheques
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {checkAlerts.map((alert, idx) => (
                  <Card key={`chk-${idx}`} className={`border backdrop-blur-xl shadow-lg transition-all hover:shadow-xl ${
                    alert.type === 'critical' ? 'bg-destructive/5 border-destructive/30' : 'bg-amber-500/5 border-amber-500/30'
                  }`}>
                    <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${alert.type === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'}`}>
                          {alert.type === 'critical' ? <AlertCircle className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground/90 flex items-center gap-2 tracking-wider">
                            {alert.bank} #{alert.number} <span className="text-muted-foreground font-normal text-sm">({alert.check_type === 'a_cobrar' ? 'A Cobrar a' : 'A Pagar a'} {alert.entity || 'N/A'})</span>
                          </h4>
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 mt-1">
                            <span className="font-semibold text-foreground/80 flex items-center gap-1">Monto: ${alert.amount.toLocaleString()}</span>
                            <span className={`font-bold ${alert.type === 'critical' ? 'text-destructive' : 'text-amber-500'}`}>
                              → {alert.diffDays < 0 ? `Vencido hace ${Math.abs(alert.diffDays)} días` : `Vence en ${alert.diffDays} días (${alert.targetDate})`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Link href={`/dashboard/checks`}>
                        <Button variant={alert.type === 'critical' ? 'destructive' : 'outline'} className={alert.type === 'warning' ? 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10' : ''}>
                          Ir a Cartera
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
