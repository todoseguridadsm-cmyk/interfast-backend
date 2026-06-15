-- 1. Añadir columnas de código y adelanto a trips
ALTER TABLE trips ADD COLUMN trip_code text UNIQUE;
ALTER TABLE trips ADD COLUMN advance_payment numeric DEFAULT 0;

-- 2. Añadir comprobante booleano a expenses
ALTER TABLE expenses ADD COLUMN has_receipt boolean DEFAULT true;
