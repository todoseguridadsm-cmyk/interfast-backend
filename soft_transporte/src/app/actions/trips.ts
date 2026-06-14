'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTrip(formData: FormData) {
  const supabase = await createClient()

  const client_id = formData.get('client_id') as string
  const vehicle_id = formData.get('vehicle_id') as string
  const driver_id = formData.get('driver_id') as string
  const origin = formData.get('origin') as string
  const destination = formData.get('destination') as string
  const priceStr = formData.get('price') as string

  if (!origin || !destination) {
    return { error: 'Origen y Destino son obligatorios.' }
  }

  const { error } = await supabase.from('trips').insert({
    client_id: client_id || null,
    vehicle_id: vehicle_id || null,
    driver_id: driver_id || null,
    origin,
    destination,
    status: 'in_progress', // Empezamos en progreso por defecto
    price: priceStr ? parseFloat(priceStr) : 0,
    start_date: new Date().toISOString()
  })

  if (error) {
    console.error('Error creating trip:', error)
    return { error: 'Error al crear el viaje.' }
  }

  revalidatePath('/dashboard/trips')
  return { success: true }
}

export async function calculateProfitability(tripId: string) {
  const supabase = await createClient()
  
  // 1. Obtener el viaje
  const { data: trip } = await supabase.from('trips').select('price').eq('id', tripId).single()
  if (!trip) return { error: 'Viaje no encontrado' }

  // 2. Obtener gastos aprobados
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('trip_id', tripId)
    .eq('status', 'approved')

  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0
  const tripPrice = trip.price || 0
  const profitability = tripPrice - totalExpenses

  return { 
    price: tripPrice, 
    expenses: totalExpenses, 
    profitability 
  }
}
