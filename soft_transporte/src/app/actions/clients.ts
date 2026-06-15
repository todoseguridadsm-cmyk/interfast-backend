'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Use Service Role to bypass RLS for now
function getAdminSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function addClient(formData: FormData) {
  const supabase = getAdminSupabase()
  const company_name = formData.get('company_name') as string
  const contact_name = formData.get('contact_name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const cuit = formData.get('cuit') as string

  if (!company_name) return { error: 'El nombre de la empresa es obligatorio' }

  const { error } = await supabase.from('clients').insert({
    company_name,
    contact_name: contact_name || null,
    email: email || null,
    phone: phone || null,
    cuit: cuit || null,
  })

  if (error) return { error: 'Error al agregar el cliente' }

  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/sales')
  return { success: true }
}

export async function updateClient(id: string, formData: FormData) {
  const supabase = getAdminSupabase()
  const company_name = formData.get('company_name') as string
  const contact_name = formData.get('contact_name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const cuit = formData.get('cuit') as string

  if (!company_name) return { error: 'El nombre de la empresa es obligatorio' }

  const { error } = await supabase.from('clients').update({
    company_name,
    contact_name: contact_name || null,
    email: email || null,
    phone: phone || null,
    cuit: cuit || null,
  }).eq('id', id)

  if (error) return { error: 'Error al actualizar el cliente' }

  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/sales')
  return { success: true }
}

export async function deleteClient(id: string) {
  const supabase = getAdminSupabase()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  
  if (error) return { error: 'Error al eliminar cliente' }
  
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/sales')
  return { success: true }
}

export async function deleteClientForm(formData: FormData) {
  const id = formData.get('id') as string
  return deleteClient(id)
}
