'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function createUser(formData: FormData) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const role = formData.get('role') as 'admin' | 'empleado'
  const permissionsJson = formData.get('permissions') as string

  let permissions = []
  try {
    if (permissionsJson) permissions = JSON.parse(permissionsJson)
  } catch(e) {}

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    console.error('Auth error:', authError)
    return { error: 'Error al crear la cuenta. Puede que el correo ya exista.' }
  }

  // 2. Update profile with role and permissions
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      full_name: fullName, 
      role, 
      permissions: role === 'empleado' ? permissions : null
    })
    .eq('id', authData.user.id)

  if (profileError) {
    console.error('Profile error:', profileError)
    return { error: 'Usuario creado, pero hubo un error al asignar los permisos.' }
  }

  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function deleteUser(userId: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Remove from auth (will cascade or trigger to profiles? By default, we might have to manually delete profile if cascade isn't set, but usually we just delete auth user)
  const { error } = await supabase.auth.admin.deleteUser(userId)
  
  if (error) {
    console.error('Delete error:', error)
    return { error: 'No se pudo eliminar el usuario.' }
  }

  // Si no hay cascade:
  await supabase.from('profiles').delete().eq('id', userId)

  revalidatePath('/dashboard/users')
  return { success: true }
}
