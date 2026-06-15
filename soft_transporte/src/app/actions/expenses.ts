'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const ExpenseSchema = z.object({
  monto: z.number(),
  fecha: z.string(), // YYYY-MM-DD
  proveedor: z.string(),
  moneda: z.string(),
  categoria: z.string()
})

export async function processExpenseReceipt(formData: FormData) {
  try {
    const file = formData.get('receipt') as File
    const userCategory = formData.get('category') as string || 'Otros'

    if (!file) throw new Error('No se subió ninguna imagen.')
    if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.')

    const supabase = (await createClient()) as any

    // 1. Check Auth and get active trip
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Usuario no autenticado.')

    // Get active trip for this driver
    const { data: activeTrip } = await supabase
      .from('trips')
      .select('id')
      .eq('driver_id', user.id)
      .eq('status', 'in_progress')
      .single()

    if (!activeTrip) {
      throw new Error('No tienes ningún viaje activo ("in_progress") en este momento. Inicia un viaje antes de cargar gastos.')
    }

    // 2. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    
    // Use service role client for storage bypass since policies might not be set
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: storageData, error: storageError } = await adminSupabase
      .storage
      .from('receipts')
      .upload(fileName, buffer, {
        contentType: file.type,
      })

    if (storageError) {
       console.error("Storage Error:", storageError)
       throw new Error('Fallo al subir la imagen al servidor. Verifica que el bucket "receipts" exista.')
    }

    const { data: publicUrlData } = adminSupabase.storage.from('receipts').getPublicUrl(fileName)
    const receiptUrl = publicUrlData?.publicUrl || ''

    // 3. Process with Gemini via Base64
    const base64Data = buffer.toString('base64')
    
    const prompt = `Analiza este ticket de gasto de transporte.
Extrae la siguiente información y devuélvela estrictamente como JSON puro sin backticks ni etiquetas markdown.
Es fundamental que la fecha esté SIEMPRE en formato YYYY-MM-DD.
El usuario ha indicado que la categoría de este gasto es "${userCategory}". Úsala si es razonable.
Si la moneda no está explícita, usa 'ARS'.
Monto debe ser un número.

Formato requerido estricto:
{
  "monto": 1500.50,
  "fecha": "2024-05-20",
  "proveedor": "YPF",
  "moneda": "ARS",
  "categoria": "${userCategory}"
}`

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        { role: 'user', parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: file.type } }
        ]}
      ]
    })

    const text = response.text
    if (!text) throw new Error("Gemini no devolvió texto.")
    
    // Clean potential markdown
    const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsedData = JSON.parse(cleanedText)
    
    // Validate with Zod
    const validatedData = ExpenseSchema.parse(parsedData)

    // 4. Save to Database
    const { error: dbError } = await adminSupabase
      .from('expenses')
      .insert({
        trip_id: activeTrip.id,
        driver_id: user.id,
        description: `Gasto en ${validatedData.proveedor} (${validatedData.categoria})`,
        amount: validatedData.monto,
        category: validatedData.categoria,
        receipt_url: receiptUrl,
        ocr_data: validatedData,
        status: 'pending',
        has_receipt: true
      })

    if (dbError) {
      console.error("DB Insert Error:", dbError)
      throw new Error('Gasto procesado pero falló el guardado en la base de datos.')
    }

    return { success: true, data: validatedData }

  } catch (error: any) {
    console.error("Expense Process Error:", error)
    return { success: false, error: error.message || 'Error desconocido al procesar el gasto.' }
  }
}

export async function processManualExpense(formData: FormData) {
  try {
    const amountStr = formData.get('amount') as string
    const category = formData.get('category') as string || 'Otros'
    const provider = formData.get('provider') as string || 'Sin Especificar'

    if (!amountStr) throw new Error('El monto es obligatorio.')
    const amount = parseFloat(amountStr)

    const supabase = (await createClient()) as any

    // 1. Check Auth and get active trip
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Usuario no autenticado.')

    // Get active trip for this driver
    const { data: activeTrip } = await supabase
      .from('trips')
      .select('id')
      .eq('driver_id', user.id)
      .eq('status', 'in_progress')
      .single()

    if (!activeTrip) {
      throw new Error('No tienes ningún viaje activo ("in_progress") en este momento. Inicia un viaje antes de cargar gastos.')
    }

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Save to Database without receipt
    const { error: dbError } = await adminSupabase
      .from('expenses')
      .insert({
        trip_id: activeTrip.id,
        driver_id: user.id,
        description: `CARGA MANUAL: ${provider} (${category})`,
        amount: amount,
        category: category,
        receipt_url: null,
        ocr_data: { monto: amount, categoria: category, proveedor: provider, fecha: new Date().toISOString().split('T')[0], moneda: 'ARS' },
        status: 'pending',
        has_receipt: false
      })

    if (dbError) {
      console.error("DB Insert Error:", dbError)
      throw new Error('Falló el guardado en la base de datos.')
    }

    return { 
      success: true, 
      data: { monto: amount, categoria: category, proveedor: provider, fecha: new Date().toISOString().split('T')[0], moneda: 'ARS' } 
    }

  } catch (error: any) {
    console.error("Manual Expense Error:", error)
    return { success: false, error: error.message || 'Error desconocido al procesar el gasto.' }
  }
}

export async function approveExpense(expenseId: string) {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Obtener el gasto actual
  const { data: expense, error: fetchError } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .single()

  if (fetchError || !expense) {
    return { error: 'Gasto no encontrado' }
  }

  if (expense.status === 'approved') {
    return { error: 'Este gasto ya fue aprobado anteriormente' }
  }

  // Marcar como aprobado
  const { error: updateError } = await supabase
    .from('expenses')
    .update({ status: 'approved' })
    .eq('id', expenseId)

  if (updateError) {
    console.error('Error approving expense:', updateError)
    return { error: 'No se pudo aprobar el gasto' }
  }

  // Descontar del saldo del chofer
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', expense.driver_id || '')
    .single()
    
  if (profile) {
     const currentBalance = Number(profile.balance) || 0
     const newBalance = currentBalance - Number(expense.amount)
     await supabase
       .from('profiles')
       .update({ balance: newBalance })
       .eq('id', expense.driver_id || '')
  }

  // Revalidar rutas para refrescar UI
  const { revalidatePath } = await import('next/cache')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/trips')
  revalidatePath('/dashboard/expenses')
  return { success: true }
}

export async function createAdminExpense(formData: FormData) {
  try {
    const driverId = formData.get('driver_id') as string
    const tripId = formData.get('trip_id') as string
    const category = formData.get('category') as string
    const amountStr = formData.get('amount') as string
    const provider = formData.get('provider') as string || 'Sin Especificar'

    if (!driverId || !tripId || !category || !amountStr) {
      throw new Error('Faltan campos obligatorios.')
    }

    const amount = parseFloat(amountStr)

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: dbError } = await adminSupabase
      .from('expenses')
      .insert({
        trip_id: tripId,
        driver_id: driverId,
        description: `CARGA ADMIN: ${provider} (${category})`,
        amount: amount,
        category: category,
        receipt_url: null,
        ocr_data: { monto: amount, categoria: category, proveedor: provider, fecha: new Date().toISOString().split('T')[0], moneda: 'ARS' },
        status: 'pending',
        has_receipt: false
      })

    if (dbError) {
      console.error("DB Insert Error:", dbError)
      throw new Error('Falló el guardado en la base de datos.')
    }

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/trips')
    revalidatePath('/dashboard/expenses')

    return { success: true }

  } catch (error: any) {
    console.error("Admin Expense Error:", error)
    return { success: false, error: error.message || 'Error desconocido al procesar el gasto.' }
  }
}
