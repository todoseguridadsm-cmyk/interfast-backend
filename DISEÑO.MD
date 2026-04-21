# Documento de Diseño: TKIP ISP CRM

Este documento define la arquitectura, funcionalidades principales y requerimientos técnicos para el sistema de gestión de clientes y facturación del Proveedor de Servicios de Internet (ISP) **TKIP SRL**.

## 1. Visión del Producto
Desarrollar un CRM web profesional y escalable enfocado en el "Principio de Pareto (20/80)": implementar las funciones clave que automatizan los cobros, reducen la morosidad y disminuyen la carga operativa de soporte.

## 2. Funcionalidades Core (El 20% que da el 80%)

### 2.1. Gestión Centralizada de Clientes (Customer 360)
- **ABM de Clientes y Planes:** Registro de usuarios, asignación de planes de internet (megas), y tarifas.
- **Vista 360:** Panel individual por cliente mostrando datos personales, estado del servicio (Activo/Suspendido), plan actual, e historial de pagos y deudas.
- **Dashboard Principal:** Vista general con métricas clave (pagos pendientes, servicios suspendidos, ingresos del mes).

### 2.2. Facturación Automatizada y Cobros
- **Generación de Deuda Mensual:** Creación automática de los cargos recurrentes.
- **Motor de Recargos Dinámico:** Sistema inteligente que calcula recargos o intereses por mora basados en fechas y franjas de atraso de forma automatizada.
- **Integración con Mercado Pago:** Generación de links de pago dinámicos por el monto exacto (incluyendo recargos si aplican) usando la API de Mercado Pago.

### 2.3. Comunicaciones y Notificaciones
- **Integración con WhatsApp:** Generación de links pre-armados (wa.me) para enviar recordatorios de pago y links de cobro con un solo clic.
- **Alertas Automatizadas:** Envío de recordatorios de vencimiento de estado de cuenta.

### 2.4. Portal de Autogestión (Básico)
- **Acceso por DNI:** Portal donde el cliente ingresa su documento base para ver su estado de cuenta mensual.
- **Pago Directo:** Botón integrado a Mercado Pago dentro del portal para saldar la deuda sin intervención humana.

### 2.5. Gestión de Servicio (Fase de Escalamiento)
- **Corte y Rehabilitación:** Lógica preparada para futura integración con RADIUS/MikroTik para suspender/reactivar conexiones basado en el estado de pago.
- **Sistema de Tickets:** Registro de incidentes técnicos o reclamos para organizar al equipo de calle.

## 3. Arquitectura y Stack Tecnológico Propuesto

Para asegurar la escalabilidad, se propone una arquitectura Cliente-Servidor separada:

*   **Frontend (Aplicación Web & Portal):** React.js (via Vite) + Tailwind CSS (para un diseño premium y responsivo).
*   **Backend (API Rest):** Node.js con Express.js.
*   **Base de Datos:** PostgreSQL o MySQL (Relacional, ideal para transacciones financieras y facturación) o SQLite para desarrollo rápido inicial.
*   **Integraciones de Terceros:** Mercado Pago SDK, WhatsApp API (vía enlaces web u oficial).

## 4. Historias de Usuario Principales (MVP)
1. Como Administrador, quiero ver un panel resumen con los cobros pendientes para saber a quién reclamar.
2. Como Administrador, quiero que el sistema asigne un recargo automáticamente al cliente X si pasó del día 10 del mes sin pagar.
3. Como Cliente, quiero ingresar a una web con mi DNI y pagar mi factura usando Mercado Pago.
4. Como Operador, quiero presionar un botón de WhatsApp en el perfil del cliente que le envíe automáticamente su deuda y link de pago.
