'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTrip(formData: FormData) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const client_id = formData.get('client_id') as string
  const vehicle_id = formData.get('vehicle_id') as string
  const driver_id = formData.get('driver_id') as string
  const origin = formData.get('origin') as string
  const destination = formData.get('destination') as string
  const estimatedKmStr = formData.get('estimated_km') as string
  const advancePaymentStr = formData.get('advance_payment') as string

  if (!origin || !destination || !estimatedKmStr) {
    return { error: 'Origen, Destino y Kilómetros son obligatorios.' }
  }

  // Generar código de viaje (ej. VJ-240614-A3B9)
  const date = new Date()
  const datePart = date.toISOString().slice(2, 10).replace(/-/g, '')
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase()
  const trip_code = `VJ-${datePart}-${randomPart}`

  const advance_payment = advancePaymentStr ? parseFloat(advancePaymentStr) : 0

  const { error } = await supabase.from('trips').insert({
    trip_code,
    client_id: client_id || null,
    vehicle_id: vehicle_id || null,
    driver_id: driver_id || null,
    origin,
    destination,
    status: 'in_progress', // Empezamos en progreso por defecto
    price: 0,
    estimated_km: parseInt(estimatedKmStr, 10),
    advance_payment,
    start_date: date.toISOString()
  })

  if (error) {
    console.error('Error creating trip:', error)
    return { error: 'Error al crear el viaje.' }
  }

  // Sumar adelanto al saldo del chofer
  if (driver_id && advance_payment > 0) {
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', driver_id).single()
    if (profile) {
      const currentBalance = Number(profile.balance) || 0
      await supabase.from('profiles').update({ balance: currentBalance + advance_payment }).eq('id', driver_id)
    }
  }

  revalidatePath('/dashboard/trips')
  return { success: true }
}

export async function calculateProfitability(tripId: string) {
  const supabase = (await createClient()) as any
  
  // 1. Obtener el viaje
  const { data: trip } = await supabase.from('trips').select('price').eq('id', tripId).single()
  if (!trip) return { error: 'Viaje no encontrado' }

  // 2. Obtener gastos aprobados
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('trip_id', tripId)
    .eq('status', 'approved')

  const totalExpenses = expenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0
  const tripPrice = trip.price || 0
  const profitability = tripPrice - totalExpenses

  return { 
    price: tripPrice, 
    expenses: totalExpenses, 
    profitability 
  }
}

export async function completeTrip(tripId: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Get the trip info
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('status, vehicle_id, estimated_km')
    .eq('id', tripId)
    .single()

  if (tripError || !trip) return { error: 'Viaje no encontrado.' }
  if (trip.status === 'completed') return { error: 'El viaje ya está completado.' }

  // 2. Update trip status
  const { error: updateError } = await supabase
    .from('trips')
    .update({ status: 'completed', end_date: new Date().toISOString() })
    .eq('id', tripId)

  if (updateError) return { error: 'Error al actualizar el viaje.' }

  // 3. Add kilometers to the vehicle
  if (trip.vehicle_id && trip.estimated_km) {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('current_km')
      .eq('id', trip.vehicle_id)
      .single()
    
    if (vehicle) {
      const newKm = (vehicle.current_km || 0) + trip.estimated_km
      await supabase
        .from('vehicles')
        .update({ current_km: newKm } as any)
        .eq('id', trip.vehicle_id)
    }
  }

  revalidatePath('/dashboard/trips')
  revalidatePath('/dashboard/vehicles')
  revalidatePath('/dashboard/alerts')
  return { success: true }
}

export async function updateTrip(id: string, formData: FormData) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const client_id = formData.get('client_id') as string
  const vehicle_id = formData.get('vehicle_id') as string
  const driver_id = formData.get('driver_id') as string
  const origin = formData.get('origin') as string
  const destination = formData.get('destination') as string
  const estimatedKmStr = formData.get('estimated_km') as string
  const advancePaymentStr = formData.get('advance_payment') as string

  if (!origin || !destination || !estimatedKmStr) {
    return { error: 'Origen, Destino y Kilómetros son obligatorios.' }
  }

  const advance_payment = advancePaymentStr ? parseFloat(advancePaymentStr) : 0

  const { error } = await supabase.from('trips').update({
    client_id: client_id || null,
    vehicle_id: vehicle_id || null,
    driver_id: driver_id || null,
    origin,
    destination,
    estimated_km: parseInt(estimatedKmStr, 10),
    advance_payment
  }).eq('id', id)

  if (error) {
    console.error('Error updating trip:', error)
    return { error: 'Error al actualizar el viaje.' }
  }

  revalidatePath('/dashboard/trips')
  return { success: true }
}

export async function deleteTrip(id: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('trips').delete().eq('id', id)

  if (error) {
    console.error('Error deleting trip:', error)
    return { error: 'No se pudo eliminar el viaje. Verifique que no tenga gastos asociados.' }
  }

  revalidatePath('/dashboard/trips')
  return { success: true }
}
