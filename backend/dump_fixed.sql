INSERT INTO "User" ("id", "username", "passwordHash", "role", "permissions", "createdAt", "updatedAt") VALUES 
(1, 'tkip', '$2b$10$7WR.h5Vd8n2oNsdsjAaFpe4Jlgk.YNpTuGny1kApEIrgu2fIdu2qi', 'ADMIN', '["ALL"]', to_timestamp(1775192376.891), to_timestamp(1775192376.891)),
(2, 'victor', '$2b$10$/6oEIO5Wy6wqxKRv7fqMy.KdeW3ptVI2rkQm9zEonp91nobXMmTHy', 'STAFF', '["CLIENTES","FACTURACION","PLANES"]', to_timestamp(1775194484.297), to_timestamp(1775194484.297));
INSERT INTO "Plan" ("id", "name", "megas", "basePrice", "ivaAmount", "totalPrice", "createdAt", "updatedAt") VALUES 
(1, '20 MEGAS', 20, 17272.72, 3627.2712, 20899.9912, to_timestamp(1775185142.727), to_timestamp(1775185142.727)),
(3, 'PLAN PRUEBA', 100, 15, 3.15, 18.15, to_timestamp(1775190777.81), to_timestamp(1775190777.81));
INSERT INTO "Client" ("id", "dni", "name", "email", "phone", "address", "city", "province", "mainNode", "panelId", "ipNumber", "cuit", "taxCondition", "status", "planId", "createdAt", "updatedAt") VALUES 
(1, '34355806', 'MATIAS BRANDI', 'todoseguridadsm@outlook.com', '2634757105', 'DELFIN ALVAREZ S/N - JUNIN', '', '', '', '', '', NULL, 'CONSUMIDOR_FINAL', 'ACTIVE', 3, to_timestamp(1775184729.556), to_timestamp(1775231151.831)),
(2, '12345678', 'VICTOR HUGO GENTILE', '', '2634795131', 'CARRIL MONTECASEROS S/N', NULL, NULL, NULL, NULL, NULL, NULL, 'CONSUMIDOR_FINAL', 'ACTIVE', 3, to_timestamp(1775186271.205), to_timestamp(1775190979.398)),
(3, '33820856', 'JESSICA VERONICA PIZARRO', '', '2634768376', 'delfin alvarez s/n', NULL, NULL, NULL, NULL, NULL, NULL, 'CONSUMIDOR_FINAL', 'ACTIVE', 3, to_timestamp(1775186581.877), to_timestamp(1775191020.287)),
(4, '23458976', 'GISELLA SCOLLO', '', '2634655890', 'COSTA CANAL MONTECASEROS S/N', NULL, NULL, NULL, NULL, NULL, NULL, 'CONSUMIDOR_FINAL', 'ACTIVE', 3, to_timestamp(1775185402.238), to_timestamp(1775191078.648));
INSERT INTO "Invoice" ("id", "clientId", "month", "year", "originalAmount", "dueDate", "status", "createdAt", "updatedAt") VALUES 
(1, 2, 4, 2026, 30855, to_timestamp(1776222000), 'PAID', to_timestamp(1775186609.512), to_timestamp(1775186628.803)),
(2, 3, 4, 2026, 30855, to_timestamp(1776222000), 'PAID', to_timestamp(1775186609.764), to_timestamp(1775232534.472)),
(3, 4, 4, 2026, 20899.9912, to_timestamp(1776222000), 'PAID', to_timestamp(1775186609.904), to_timestamp(1775233484.929));
INSERT INTO "Payment" ("id", "invoiceId", "method", "amountPaid", "lateFeeApplied", "paymentDate", "userId") VALUES 
(1, 1, 'CASH', 30855, 0, to_timestamp(1775186629.053), NULL),
(3, 2, 'CASH', 30855, 0, to_timestamp(1775232534.121), NULL),
(4, 3, 'CASH', 20899.9912, 0, to_timestamp(1775233484.76), 1);
INSERT INTO "CashMovement" ("id", "type", "amount", "description", "userId", "createdAt") VALUES 
(1, 'IN', 50, 'Test', 1, to_timestamp(1775198371.042)),
(2, 'OUT', 60, 'lll', 1, to_timestamp(1775199453.468)),
(3, 'OUT', 5000, 'jhghg', 1, to_timestamp(1775199511.273)),
(4, 'OUT', 1500, 'gastos varios', 1, to_timestamp(1775233432.015)),
(5, 'OUT', 200, 'efectivo', 1, to_timestamp(1775233730.008));
