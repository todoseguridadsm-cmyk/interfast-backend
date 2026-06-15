'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function addCheck(formData: FormData) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const check_type = formData.get('check_type') as string
  const amount = parseFloat(formData.get('amount') as string)
  const bank_name = formData.get('bank_name') as string
  const check_number = formData.get('check_number') as string
  const issue_date = formData.get('issue_date') as string
  const due_date = formData.get('due_date') as string
  const client_id = formData.get('client_id') as string || null
  const supplier_id = formData.get('supplier_id') as string || null

  if (!check_type || isNaN(amount) || !bank_name || !check_number || !issue_date || !due_date) {
    return { error: 'Faltan campos obligatorios.' }
  }

  const { error } = await supabase.from('checks').insert({
    check_type,
    amount,
    bank_name,
    check_number,
    issue_date,
    due_date,
    status: 'pending',
    client_id,
    supplier_id
  })

  if (error) {
    console.error('Error adding check:', error)
    return { error: 'Error al registrar el cheque.' }
  }

  revalidatePath('/dashboard/checks')
  return { success: true }
}

export async function updateCheckStatus(id: string, status: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('checks').update({ status }).eq('id', id)

  if (error) {
    console.error('Error updating check:', error)
    return { error: 'Error al actualizar el estado del cheque.' }
  }

  revalidatePath('/dashboard/checks')
  return { success: true }
}

export async function deleteCheck(id: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('checks').delete().eq('id', id)

  if (error) {
    console.error('Error deleting check:', error)
    return { error: 'No se pudo eliminar el cheque. Verifica si está vinculado a un pago.' }
  }

  revalidatePath('/dashboard/checks')
  return { success: true }
}
