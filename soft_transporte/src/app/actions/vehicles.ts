'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function addVehicle(formData: FormData) {
  // Use Service Role to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const plate = formData.get('plate') as string
  const brand = formData.get('brand') as string
  const model = formData.get('model') as string
  const yearStr = formData.get('year') as string
  const capacityStr = formData.get('capacity') as string

  const current_kmStr = formData.get('current_km') as string
  const next_service_kmStr = formData.get('next_service_km') as string
  const next_oil_change_date = formData.get('next_oil_change_date') as string
  const next_oil_filter_change_kmStr = formData.get('next_oil_filter_change_km') as string
  const next_oil_filter_change_date = formData.get('next_oil_filter_change_date') as string
  const next_air_filter_change_kmStr = formData.get('next_air_filter_change_km') as string
  const next_air_filter_change_date = formData.get('next_air_filter_change_date') as string
  const next_gearbox_oil_change_kmStr = formData.get('next_gearbox_oil_change_km') as string
  const next_gearbox_oil_change_date = formData.get('next_gearbox_oil_change_date') as string

  if (!plate || !brand || !model || !yearStr) {
    return { error: 'Por favor completa todos los campos requeridos.' }
  }

  const { error } = await supabase.from('vehicles').insert({
    plate: plate.toUpperCase(),
    brand,
    model,
    year: parseInt(yearStr, 10),
    capacity_kg: capacityStr ? parseInt(capacityStr, 10) : null,
    status: 'available',
    current_km: current_kmStr ? parseInt(current_kmStr, 10) : 0,
    next_service_km: next_service_kmStr ? parseInt(next_service_kmStr, 10) : null,
    next_oil_change_date: next_oil_change_date || null,
    next_oil_filter_change_km: next_oil_filter_change_kmStr ? parseInt(next_oil_filter_change_kmStr, 10) : null,
    next_oil_filter_change_date: next_oil_filter_change_date || null,
    next_air_filter_change_km: next_air_filter_change_kmStr ? parseInt(next_air_filter_change_kmStr, 10) : null,
    next_air_filter_change_date: next_air_filter_change_date || null,
    next_gearbox_oil_change_km: next_gearbox_oil_change_kmStr ? parseInt(next_gearbox_oil_change_kmStr, 10) : null,
    next_gearbox_oil_change_date: next_gearbox_oil_change_date || null
  })

  if (error) {
    console.error('Error adding vehicle:', error)
    return { error: 'Error al agregar el vehículo.' }
  }

  revalidatePath('/dashboard/vehicles')
  revalidatePath('/dashboard/trips/new')
  return { success: true }
}

export async function deleteVehicle(vehicleId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId)
  
  if (error) {
    console.error('Error delete vehicle:', error)
    return { error: 'No se puede eliminar el vehículo, es probable que tenga viajes asignados.' }
  }

  revalidatePath('/dashboard/vehicles')
  return { success: true }
}

export async function deleteVehicleForm(formData: FormData) {
  const id = formData.get('id') as string;
  return deleteVehicle(id);
}
