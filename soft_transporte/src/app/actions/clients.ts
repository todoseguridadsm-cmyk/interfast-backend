'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addClient(formData: FormData) {
  const supabase = await createClient()

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

  if (error) {
    console.error('Error adding client:', error)
    return { error: 'Error al agregar el cliente' }
  }

  revalidatePath('/dashboard/clients')
  return { success: true }
}

export async function deleteClient(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  
  if (error) {
    console.error('Error deleting client:', error)
    return { error: 'Error al eliminar cliente' }
  }
  
  revalidatePath('/dashboard/clients')
  return { success: true }
}
