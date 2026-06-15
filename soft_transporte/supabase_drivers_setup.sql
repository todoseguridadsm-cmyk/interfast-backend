-- 1. Añadir el campo de usuario explícito a profiles
ALTER TABLE profiles ADD COLUMN username text;

-- 2. Añadir campos médicos y de contacto
ALTER TABLE profiles ADD COLUMN birth_date date;
ALTER TABLE profiles ADD COLUMN license_expiry date;
ALTER TABLE profiles ADD COLUMN is_donor boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN address text;
ALTER TABLE profiles ADD COLUMN city text;
ALTER TABLE profiles ADD COLUMN province text;
ALTER TABLE profiles ADD COLUMN blood_type text;
ALTER TABLE profiles ADD COLUMN emergency_contact_phone text;
ALTER TABLE profiles ADD COLUMN emergency_contact_relation text;
