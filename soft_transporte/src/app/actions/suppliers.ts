'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function addSupplier(formData: FormData) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const company_name = formData.get('company_name') as string
  const cuit = formData.get('cuit') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const address = formData.get('address') as string

  if (!company_name) {
    return { error: 'El nombre de la empresa es obligatorio.' }
  }

  const { error } = await supabase.from('suppliers').insert({
    company_name,
    cuit,
    phone,
    email,
    address
  })

  if (error) {
    console.error('Error adding supplier:', error)
    return { error: 'Error al registrar el proveedor.' }
  }

  revalidatePath('/dashboard/suppliers')
  return { success: true }
}

export async function updateSupplier(id: string, formData: FormData) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const company_name = formData.get('company_name') as string
  const cuit = formData.get('cuit') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const address = formData.get('address') as string

  if (!company_name) {
    return { error: 'El nombre de la empresa es obligatorio.' }
  }

  const { error } = await supabase.from('suppliers').update({
    company_name,
    cuit,
    phone,
    email,
    address
  }).eq('id', id)

  if (error) {
    console.error('Error updating supplier:', error)
    return { error: 'Error al actualizar el proveedor.' }
  }

  revalidatePath('/dashboard/suppliers')
  return { success: true }
}

export async function deleteSupplier(id: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('suppliers').delete().eq('id', id)

  if (error) {
    console.error('Error deleting supplier:', error)
    return { error: 'No se pudo eliminar el proveedor. Verifica que no tenga gastos asociados.' }
  }

  revalidatePath('/dashboard/suppliers')
  return { success: true }
}
