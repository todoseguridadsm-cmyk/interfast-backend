'use server'

import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'
import { revalidatePath } from 'next/cache'

export async function updateOdometer(vehicleId: string, newKm: number) {
  const supabase = (await createClient()) as any

  // 1. Fetch current vehicle data
  const { data: vehicle, error: fetchError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .single()

  if (fetchError || !vehicle) {
    return { error: 'Vehículo no encontrado' }
  }

  // 2. Update km
  const { error: updateError } = await supabase
    .from('vehicles')
    .update({ current_km: newKm } as any)
    .eq('id', vehicleId)

  if (updateError) {
    return { error: 'Error actualizando kilometraje' }
  }

  // 3. Check threshold for service
  const nextService = vehicle.next_service_km || 0
  const remaining = nextService - newKm

  if (nextService > 0 && remaining <= 1000 && remaining >= 0) {
    
    // Find assigned driver (look for an in_progress trip for this vehicle)
    const { data: trip } = await supabase
      .from('trips')
      .select('profiles!trips_driver_id_fkey(full_name)')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      
    const driverName = (trip?.profiles as any)?.full_name || 'Ninguno (En Base)'

    // TRIGGER EMAIL ALERT CON NODEMAILER (GMAIL)
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_EMAIL, // Tu correo Gmail (transportesoporte5@gmail.com)
          pass: process.env.SMTP_PASSWORD, // La contraseña de aplicación de 16 caracteres
        },
      });

      await transporter.sendMail({
        from: `"Senda CMR Alertas" <${process.env.SMTP_EMAIL}>`,
        to: 'transportesoporte5@gmail.com', // El destinatario (tú mismo)
        subject: `⚠️ ALERTA CRÍTICA: Service Próximo para Camión ${vehicle.plate}`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #fafafa; padding: 40px; border-radius: 16px; border: 1px solid #27272a;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #ef4444; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Alerta de Mantenimiento</h1>
              <p style="color: #a1a1aa; margin-top: 5px; font-size: 14px;">Prevención de Roturas en Ruta</p>
            </div>
            
            <p style="font-size: 16px; color: #e4e4e7; line-height: 1.5;">El vehículo <strong style="color: #fff; font-size: 18px; background-color: #27272a; padding: 4px 8px; border-radius: 4px;">${vehicle.plate}</strong> (${vehicle.brand} ${vehicle.model}) ha superado el umbral de seguridad para su próximo servicio programado.</p>
            
            <div style="background-color: #18181b; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #deff9a;">
              <p style="margin: 8px 0; color: #a1a1aa; font-size: 15px;">Chofer Asignado: <strong style="color: #fff;">${driverName}</strong></p>
              <p style="margin: 8px 0; color: #a1a1aa; font-size: 15px;">Kilometraje Actual: <strong style="color: #fff;">${newKm.toLocaleString()} km</strong></p>
              <p style="margin: 8px 0; color: #a1a1aa; font-size: 15px;">Service Programado: <strong style="color: #fff;">${nextService.toLocaleString()} km</strong></p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #27272a;">
                <p style="margin: 0; color: #deff9a; font-weight: bold; font-size: 20px;">Restan: ${remaining.toLocaleString()} km</p>
              </div>
            </div>
            
            <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6;"><strong>Gravedad: Alta.</strong> Se recomienda contactar al taller inmediatamente para agendar el mantenimiento preventivo y asegurar que el vehículo no sufra desperfectos operativos.</p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #27272a; text-align: center;">
              <p style="color: #52525b; font-size: 12px; margin: 0;">Senda CMR - Inteligencia Logística</p>
            </div>
          </div>
        `
      })
    } catch (e) {
      console.error("Nodemailer Error:", e)
      // Incluso si el email falla, actualizamos el km
    }
  }

  revalidatePath(`/dashboard/vehicles/${vehicleId}`)
  revalidatePath('/dashboard/vehicles')
  return { success: true }
}
