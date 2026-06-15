-- 1. Añadir el nuevo rol 'empleado' al enum existente
ALTER TYPE user_role ADD VALUE 'empleado';

-- 2. Añadir la columna de permisos a la tabla profiles
ALTER TABLE profiles ADD COLUMN permissions jsonb DEFAULT '[]'::jsonb;

-- 3. Crear políticas para que los administradores puedan crear y editar usuarios (perfiles)
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );
