'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function addCompanyExpense(formData: FormData) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const category = formData.get('category') as string
  const description = formData.get('description') as string
  const amount = parseFloat(formData.get('amount') as string)
  const payment_method = formData.get('payment_method') as string
  const supplier_id = formData.get('supplier_id') as string || null
  const driver_id = formData.get('driver_id') as string || null

  if (!category || !description || isNaN(amount) || !payment_method) {
    return { error: 'Faltan campos obligatorios.' }
  }

  let check_id = null

  // Si el pago es con cheque nuevo
  if (payment_method === 'cheque') {
    const bank_name = formData.get('bank_name') as string
    const check_number = formData.get('check_number') as string
    const issue_date = formData.get('issue_date') as string
    const due_date = formData.get('due_date') as string

    if (!bank_name || !check_number || !issue_date || !due_date) {
      return { error: 'Faltan los datos del cheque.' }
    }

    const { data: checkData, error: checkError } = await supabase.from('checks').insert({
      check_type: 'a_pagar',
      amount,
      bank_name,
      check_number,
      issue_date,
      due_date,
      status: 'pending',
      supplier_id
    }).select('id').single()

    if (checkError) {
      console.error('Error creating check:', checkError)
      return { error: 'Error al registrar el cheque.' }
    }
    
    check_id = checkData.id
  }

  const { error } = await supabase.from('company_expenses').insert({
    category,
    description,
    amount,
    payment_method,
    check_id,
    supplier_id,
    driver_id,
    status: 'paid'
  })

  if (error) {
    console.error('Error adding company expense:', error)
    return { error: 'Error al registrar el gasto de empresa.' }
  }

  // Si es un ajuste de saldo o sueldo, afectamos el balance del chofer
  if (driver_id && (category === 'sueldo' || category === 'ajuste_saldo')) {
    // Buscar balance actual
    const { data: driver } = await supabase.from('profiles').select('balance').eq('id', driver_id).single()
    const currentBalance = driver?.balance || 0
    
    // Sueldo: asume que le pagamos, así que si tenía saldo negativo (deuda) esto lo compensa, o si el saldo es positivo se le da la plata. 
    // Para simplificar: el pago de sueldo es un ingreso para el chofer, así que SUMA a su balance si queremos reflejar que le dimos plata, o RESTA si la empresa le está cancelando una deuda?
    // Si la empresa le paga sueldo en efectivo, el chofer recibe dinero. Si el chofer tenía DEUDA (-1000) por adelantos, al pagarle el sueldo (ej. 1000) en realidad se lo descontamos de la deuda.
    // Vamos a sumar el monto del sueldo al balance para compensar saldos negativos.
    await supabase.from('profiles').update({ balance: currentBalance + amount }).eq('id', driver_id)
  }

  revalidatePath('/dashboard/company-expenses')
  revalidatePath('/dashboard/checks')
  revalidatePath('/dashboard/users') // Para actualizar el balance de choferes
  return { success: true }
}

export async function deleteCompanyExpense(id: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('company_expenses').delete().eq('id', id)

  if (error) {
    console.error('Error deleting expense:', error)
    return { error: 'No se pudo eliminar el registro.' }
  }

  revalidatePath('/dashboard/company-expenses')
  return { success: true }
}
