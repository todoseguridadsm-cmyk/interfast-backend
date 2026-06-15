'use server'

import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export async function sendBackup(formData: FormData) {
  const emailTo = formData.get('email') as string
  if (!emailTo) return { error: 'Se requiere un correo de destino.' }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Recolectar datos
    const [clients, suppliers, drivers, vehicles, trips, expenses] = await Promise.all([
      supabase.from('clients').select('*'),
      supabase.from('suppliers').select('*'),
      supabase.from('profiles').select('*').eq('role', 'chofer'),
      supabase.from('vehicles').select('*'),
      supabase.from('trips').select('*'),
      supabase.from('expenses').select('*')
    ])

    const backupData = {
      timestamp: new Date().toISOString(),
      data: {
        clients: clients.data,
        suppliers: suppliers.data,
        drivers: drivers.data,
        vehicles: vehicles.data,
        trips: trips.data,
        expenses: expenses.data
      }
    }

    const jsonString = JSON.stringify(backupData, null, 2)
    const buffer = Buffer.from(jsonString, 'utf-8')

    // Configurar nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    })

    const mailOptions = {
      from: `"Senda CMR" <${process.env.SMTP_EMAIL}>`,
      to: emailTo,
      subject: 'Copia de Seguridad - Senda CMR',
      text: 'Adjunto encontrarás la copia de seguridad de la base de datos de Senda CMR en formato JSON. Puedes usar esta información para enviarla a tu contador o archivarla.',
      attachments: [
        {
          filename: `backup_senda_cmr_${new Date().toISOString().slice(0,10)}.json`,
          content: buffer
        }
      ]
    }

    await transporter.sendMail(mailOptions)

    return { success: true }
  } catch (error: any) {
    console.error('Error sending backup:', error)
    return { error: 'Ocurrió un error al enviar el respaldo: ' + error.message }
  }
}
