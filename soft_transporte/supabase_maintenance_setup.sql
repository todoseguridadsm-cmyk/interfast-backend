-- 1. Añadir columnas de mantenimiento preventivo a vehicles
ALTER TABLE vehicles ADD COLUMN next_oil_change_date date;
ALTER TABLE vehicles ADD COLUMN next_oil_filter_change_km integer;
ALTER TABLE vehicles ADD COLUMN next_oil_filter_change_date date;
ALTER TABLE vehicles ADD COLUMN next_air_filter_change_km integer;
ALTER TABLE vehicles ADD COLUMN next_air_filter_change_date date;
ALTER TABLE vehicles ADD COLUMN next_gearbox_oil_change_km integer;
ALTER TABLE vehicles ADD COLUMN next_gearbox_oil_change_date date;

-- 2. Añadir columna para kilómetros de recorrido estimado en trips
ALTER TABLE trips ADD COLUMN estimated_km integer DEFAULT 0;
