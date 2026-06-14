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
    if (!file) throw new Error('No se subió ninguna imagen.')
    if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.')

    const supabase = await createClient()

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
Si no puedes determinar la categoría, usa 'Otros'.
Si la moneda no está explícita, usa 'ARS' si parece de Argentina o la moneda local correspondiente.
Monto debe ser un número.

Formato requerido estricto:
{
  "monto": 1500.50,
  "fecha": "2024-05-20",
  "proveedor": "YPF",
  "moneda": "ARS",
  "categoria": "Combustible"
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
    const { error: dbError } = await supabase
      .from('expenses')
      .insert({
        trip_id: activeTrip.id,
        driver_id: user.id,
        description: `Gasto en ${validatedData.proveedor} (${validatedData.categoria})`,
        amount: validatedData.monto,
        category: validatedData.categoria,
        receipt_url: receiptUrl,
        ocr_data: validatedData,
        status: 'pending'
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
