'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function addSale(formData: FormData) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const trip_id = formData.get('trip_id') as string || null
  const client_id = formData.get('client_id') as string || null
  const amount = parseFloat(formData.get('amount') as string)
  const payment_method = formData.get('payment_method') as string
  const notes = formData.get('notes') as string || ''

  if (!amount || !payment_method) {
    return { error: 'Faltan campos obligatorios (Monto, Forma de Pago).' }
  }

  let check_id = null

  // Generar número de comprobante X (Venta interna)
  const { count } = await supabase.from('sales').select('*', { count: 'exact', head: true })
  const nextNumber = (count || 0) + 1
  const voucher_number = `X-0001-${nextNumber.toString().padStart(8, '0')}`

  // Si el pago es con cheque recibido (a cobrar)
  if (payment_method === 'cheque') {
    const bank_name = formData.get('bank_name') as string
    const check_number = formData.get('check_number') as string
    const issue_date = formData.get('issue_date') as string
    const due_date = formData.get('due_date') as string

    if (!bank_name || !check_number || !issue_date || !due_date) {
      return { error: 'Faltan los datos del cheque.' }
    }

    const { data: checkData, error: checkError } = await supabase.from('checks').insert({
      check_type: 'a_cobrar',
      amount,
      bank_name,
      check_number,
      issue_date,
      due_date,
      status: 'pending',
      client_id
    }).select('id').single()

    if (checkError) {
      console.error('Error creating check:', checkError)
      return { error: 'Error al registrar el cheque de la venta.' }
    }
    
    check_id = checkData.id
  }

  const { error } = await supabase.from('sales').insert({
    trip_id,
    client_id,
    amount,
    payment_method,
    check_id,
    status: 'paid',
    voucher_number,
    notes
  })

  if (error) {
    console.error('Error adding sale:', error)
    return { error: 'Error al registrar la venta.' }
  }

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/checks')
  return { success: true, voucher_number }
}

export async function deleteSale(id: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('sales').delete().eq('id', id)

  if (error) {
    console.error('Error deleting sale:', error)
    return { error: 'No se pudo anular la venta.' }
  }

  revalidatePath('/dashboard/sales')
  return { success: true }
}
