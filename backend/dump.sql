INSERT INTO "User" ("id", "username", "passwordHash", "role", "permissions", "createdAt", "updatedAt") VALUES 
(1, 'tkip', '$2b$10$7WR.h5Vd8n2oNsdsjAaFpe4Jlgk.YNpTuGny1kApEIrgu2fIdu2qi', 'ADMIN', '["ALL"]', 1775192376891, 1775192376891),
(2, 'victor', '$2b$10$/6oEIO5Wy6wqxKRv7fqMy.KdeW3ptVI2rkQm9zEonp91nobXMmTHy', 'STAFF', '["CLIENTES","FACTURACION","PLANES"]', 1775194484297, 1775194484297);
INSERT INTO "Plan" ("id", "name", "megas", "basePrice", "ivaAmount", "totalPrice", "createdAt", "updatedAt") VALUES 
(1, '20 MEGAS', 20, 17272.72, 3627.2712, 20899.9912, 1775185142727, 1775185142727),
(3, 'PLAN PRUEBA', 100, 15, 3.15, 18.15, 1775190777810, 1775190777810);
INSERT INTO "Client" ("id", "dni", "name", "email", "phone", "address", "city", "province", "mainNode", "panelId", "ipNumber", "cuit", "taxCondition", "status", "planId", "createdAt", "updatedAt") VALUES 
(1, '34355806', 'MATIAS BRANDI', 'todoseguridadsm@outlook.com', '2634757105', 'DELFIN ALVAREZ S/N - JUNIN', '', '', '', '', '', NULL, 'CONSUMIDOR_FINAL', 'ACTIVE', 3, 1775184729556, 1775231151831),
(2, '12345678', 'VICTOR HUGO GENTILE', '', '2634795131', 'CARRIL MONTECASEROS S/N', NULL, NULL, NULL, NULL, NULL, NULL, 'CONSUMIDOR_FINAL', 'ACTIVE', 3, 1775186271205, 1775190979398),
(3, '33820856', 'JESSICA VERONICA PIZARRO', '', '2634768376', 'delfin alvarez s/n', NULL, NULL, NULL, NULL, NULL, NULL, 'CONSUMIDOR_FINAL', 'ACTIVE', 3, 1775186581877, 1775191020287),
(4, '23458976', 'GISELLA SCOLLO', '', '2634655890', 'COSTA CANAL MONTECASEROS S/N', NULL, NULL, NULL, NULL, NULL, NULL, 'CONSUMIDOR_FINAL', 'ACTIVE', 3, 1775185402238, 1775191078648);
INSERT INTO "Invoice" ("id", "clientId", "month", "year", "originalAmount", "dueDate", "status", "createdAt", "updatedAt") VALUES 
(1, 2, 4, 2026, 30855, 1776222000000, 'PAID', 1775186609512, 1775186628803),
(2, 3, 4, 2026, 30855, 1776222000000, 'PAID', 1775186609764, 1775232534472),
(3, 4, 4, 2026, 20899.9912, 1776222000000, 'PAID', 1775186609904, 1775233484929);
INSERT INTO "Payment" ("id", "invoiceId", "method", "amountPaid", "lateFeeApplied", "paymentDate", "userId") VALUES 
(1, 1, 'CASH', 30855, 0, 1775186629053, NULL),
(3, 2, 'CASH', 30855, 0, 1775232534121, NULL),
(4, 3, 'CASH', 20899.9912, 0, 1775233484760, 1);
INSERT INTO "CashMovement" ("id", "type", "amount", "description", "userId", "createdAt") VALUES 
(1, 'IN', 50, 'Test', 1, 1775198371042),
(2, 'OUT', 60, 'lll', 1, 1775199453468),
(3, 'OUT', 5000, 'jhghg', 1, 1775199511273),
(4, 'OUT', 1500, 'gastos varios', 1, 1775233432015),
(5, 'OUT', 200, 'efectivo', 1, 1775233730008);
