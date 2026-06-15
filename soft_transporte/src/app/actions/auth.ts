'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function login(data: { email: string; password: string }) {
  const supabase = await createClient()

  // Si ingresan "Transporte2026", lo transformamos internamente al correo que está en la base de datos
  // Si ingresan cualquier otro usuario sin @, le agregamos @sendacmr.com
  let loginEmail = data.email.trim();
  if (loginEmail.toLowerCase() === 'transporte2026') {
    loginEmail = 'transporte2026@admin.com';
  } else if (!loginEmail.includes('@')) {
    loginEmail = `${loginEmail}@sendacmr.com`;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password: data.password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
