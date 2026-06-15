-- ERP SETUP FOR SUPABASE

-- 1. Suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    cuit TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Checks (Cartera de Cheques)
CREATE TABLE checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_type TEXT NOT NULL CHECK (check_type IN ('a_cobrar', 'a_pagar')),
    amount NUMERIC NOT NULL,
    bank_name TEXT NOT NULL,
    check_number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cashed', 'deposited', 'bounced')),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Sales (Ventas / Cobranzas)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cuenta_corriente', 'contado', 'cheque', 'transferencia')),
    check_id UUID REFERENCES checks(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled')),
    voucher_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Company Expenses (Sueldos, Mantenimiento General, etc.)
CREATE TABLE company_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('sueldo', 'mantenimiento', 'combustible_mayorista', 'neumaticos', 'ajuste_saldo', 'otros')),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cuenta_corriente', 'contado', 'cheque', 'transferencia')),
    check_id UUID REFERENCES checks(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_expenses ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas por ahora (el backend usa service_role y bypass RLS igual)
CREATE POLICY "Enable all for authenticated users on suppliers" ON suppliers FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users on checks" ON checks FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users on sales" ON sales FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users on company_expenses" ON company_expenses FOR ALL TO authenticated USING (true);
