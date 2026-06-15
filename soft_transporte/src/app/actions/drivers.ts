'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function addDriver(formData: FormData) {
  // Use Service Role to bypass RLS and use Admin API
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const full_name = formData.get('full_name') as string
  const username = formData.get('username') as string
  const emailRaw = formData.get('email') as string
  const password = formData.get('password') as string
  
  const phone = formData.get('phone') as string
  const birth_date = formData.get('birth_date') as string
  const license_expiry = formData.get('license_expiry') as string
  const is_donor = formData.get('is_donor') === 'on'
  const address = formData.get('address') as string
  const city = formData.get('city') as string
  const province = formData.get('province') as string
  const blood_type = formData.get('blood_type') as string
  const emergency_contact_phone = formData.get('emergency_contact_phone') as string
  const emergency_contact_relation = formData.get('emergency_contact_relation') as string

  if (!full_name || !username || !password) {
    return { error: 'Nombre, Usuario y Contraseña son requeridos.' }
  }

  // Generar un email si no lo proveen (usando el usuario)
  const email = emailRaw ? emailRaw : `${username.replace(/\s+/g, '')}@sendacmr.com`

  // 1. Create auth user
  const { data: userData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { full_name, username }
  })

  if (authError) {
    console.error('Error auth:', authError)
    return { error: 'Error al crear el usuario. Es posible que el usuario o email ya estén registrados.' }
  }

  if (userData.user) {
    // 2. Upsert profile
    const { error: profileError } = await adminSupabase.from('profiles').upsert({
      id: userData.user.id,
      full_name,
      username,
      role: 'chofer',
      phone: phone || null,
      birth_date: birth_date || null,
      license_expiry: license_expiry || null,
      is_donor,
      address: address || null,
      city: city || null,
      province: province || null,
      blood_type: blood_type || null,
      emergency_contact_phone: emergency_contact_phone || null,
      emergency_contact_relation: emergency_contact_relation || null,
      balance: 0
    })

    if (profileError) {
      console.error('Error profile:', profileError)
      return { error: 'Usuario creado pero falló el guardado de la ficha técnica.' }
    }
  }

  revalidatePath('/dashboard/drivers')
  revalidatePath('/dashboard/trips/new')
  return { success: true }
}

export async function updateDriver(id: string, formData: FormData) {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const full_name = formData.get('full_name') as string
  const username = formData.get('username') as string
  const phone = formData.get('phone') as string
  const birth_date = formData.get('birth_date') as string
  const license_expiry = formData.get('license_expiry') as string
  const is_donor = formData.get('is_donor') === 'on'
  const address = formData.get('address') as string
  const city = formData.get('city') as string
  const province = formData.get('province') as string
  const blood_type = formData.get('blood_type') as string
  const emergency_contact_phone = formData.get('emergency_contact_phone') as string
  const emergency_contact_relation = formData.get('emergency_contact_relation') as string

  if (!full_name || !username) {
    return { error: 'Nombre y Usuario son requeridos.' }
  }

  const { error: profileError } = await adminSupabase.from('profiles').update({
    full_name,
    username,
    phone: phone || null,
    birth_date: birth_date || null,
    license_expiry: license_expiry || null,
    is_donor,
    address: address || null,
    city: city || null,
    province: province || null,
    blood_type: blood_type || null,
    emergency_contact_phone: emergency_contact_phone || null,
    emergency_contact_relation: emergency_contact_relation || null,
  }).eq('id', id)

  if (profileError) {
    console.error('Error updating driver:', profileError)
    return { error: 'Error al actualizar la ficha del chofer.' }
  }

  // Si se cambió la contraseña
  const password = formData.get('password') as string
  if (password && password.trim().length > 0) {
    await adminSupabase.auth.admin.updateUserById(id, { password })
  }

  revalidatePath('/dashboard/drivers')
  return { success: true }
}

export async function deleteDriver(id: string) {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminSupabase.auth.admin.deleteUser(id)
  if (error) {
    console.error('Error deleting driver user:', error)
    return { error: 'No se pudo eliminar al chofer. Verifique si tiene gastos o viajes asignados.' }
  }

  revalidatePath('/dashboard/drivers')
  return { success: true }
}
