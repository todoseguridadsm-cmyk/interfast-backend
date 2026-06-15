# Manual de Usuario - SoftTransporte CRM
**Plataforma de Inteligencia Logística y Gestión de Flotas**

---

## 1. Introducción
**SoftTransporte** es un CRM (Customer Relationship Management) y ERP logístico de próxima generación diseñado para centralizar, automatizar y escalar las operaciones de empresas de transporte. Con un diseño premium ("Dark Mode") y potentes integraciones de Inteligencia Artificial, esta plataforma elimina el trabajo manual, reduce errores humanos y optimiza la rentabilidad por kilómetro.

---

## 2. Autenticación y Control de Accesos
El sistema cuenta con un control de seguridad estricto que protege las rutas según el rol del usuario conectado.

- **Roles Definidos:** `admin`, `chofer` y `cliente`.
- **Protección de Rutas:** El acceso al Dashboard está bloqueado por un Middleware de seguridad que redirige automáticamente a la página de login a los usuarios no autenticados.

---

## 3. Command Center (Dashboard Ejecutivo)
El cerebro de la operación. Una única pantalla que provee la visión macro del negocio en tiempo real.

![Dashboard Preview](C:\Users\MATIAS BRANDI\.gemini\antigravity\brain\907ccd16-c7cd-4a29-b71b-833252388c05\dashboard_mockup_1781410671707.png)

### KPIs Estratégicos (Métricas Clave)
- **Facturación del Mes:** Suma dinámica del monto pactado de todos los viajes completados.
- **Rentabilidad Promedio:** El beneficio neto exacto calculado al restar los gastos operativos del monto de facturación por viaje.
- **Camiones en Ruta:** Contador en vivo de los viajes con estado "En Curso".
- **Alertas de Mantenimiento:** Indicador de vehículos críticos que requieren atención de taller inminente.

### Gráficos Analíticos (Recharts)
- **Ingresos vs Gastos:** Gráfica visual de áreas que muestra el comportamiento financiero histórico.
- **Rentabilidad por Rutas:** Gráfico de barras que rankea cuáles son los tramos (ej. Mendoza-Chile) más lucrativos para la empresa.

---

## 4. Módulo de Escaneo Inteligente OCR (Google Gemini)
El módulo más avanzado del CRM. Permite digitalizar y estructurar los gastos de la ruta al instante sin teclear.

![OCR Preview](C:\Users\MATIAS BRANDI\.gemini\antigravity\brain\907ccd16-c7cd-4a29-b71b-833252388c05\ocr_flow_mockup_1781410684496.png)

- **Flujo del Chofer:** El chofer sube una foto de un ticket (gasoil, peaje, reparaciones) desde su teléfono móvil.
- **Extracción Mágica:** La imagen se envía a la Inteligencia Artificial **Gemini 1.5 Flash**, que lee la imagen y extrae mágicamente: Monto, Fecha, Proveedor, Moneda y Categoría.
- **Fricción Cero:** El gasto se vincula de manera automática al "Viaje Activo" que el chofer esté realizando.
- **Feed OCR (Aprobación):** En el Dashboard del Administrador, aparece una lista de "Gastos Pendientes". Con un solo clic en **Aprobar**, el ticket se valida matemáticamente.

---

## 5. Finanzas, Viajes y "Estado de Cuenta" Automático
Olvídate de las calculadoras y los Excel cruzados.

- **Creación de Viajes:** Un formulario ágil que permite conectar un Cliente, un Vehículo y un Chofer, fijando el precio pactado para la ruta (Origen - Destino).
- **Descuento de Saldos:** Al aprobar un ticket de gasto en el Feed OCR, el CRM descuenta **automáticamente** ese monto de la billetera o "Balance" del chofer asignado. Esto garantiza liquidaciones de sueldo exactas y sin fricciones.
- **Rentabilidad en Vivo:** El sistema calcula el margen de ganancia real restándole todos estos "gastos aprobados" al precio cobrado al cliente.

---

## 6. Mantenimiento Preventivo y Motor de Alertas (Resend)
Prevenir la rotura de un camión en la ruta salva miles de dólares.

- **Ficha Clínica del Vehículo:** Cada camión tiene un panel donde se expone su patente, marca, año, y su historial completo de mantenimiento y costos técnicos.
- **Semáforo de Kilómetros:** Una vista rápida con colores (Verde, Amarillo, Rojo) que indica la salud del vehículo basada en su desgaste.
- **Actualización de Odómetro:** Un formulario simple para asentar cuántos kilómetros tiene el camión en un momento dado.
- **Alertas Críticas Automáticas:** Si al actualizar el odómetro el sistema detecta que la distancia para el próximo Service Oficial es **menor a 1.000 kilómetros**, el CRM usa la tecnología de correos para enviar un **Email de Alerta** en formato HTML premium al dueño indicándole la gravedad, la patente y el chofer implicado.

---

## 7. Directorio Corporativo de Clientes
- **Agenda Centralizada:** Módulo para dar de alta a clientes corporativos (Razón Social, CUIT, Contacto, Correo).
- **Relaciones Dinámicas:** Estos clientes se enlazan para poder asignarles viajes y facturas, manteniendo la trazabilidad histórica de cuánto le hemos cobrado a cada empresa a lo largo del tiempo.

---
*Documento autogenerado por SoftTransporte - IA Logística.*
