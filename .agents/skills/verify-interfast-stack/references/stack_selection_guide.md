# Guía de Selección de Stack (Interfast)

## 1. Base de Datos: Estructura y Esquemas
* **Herramienta:** Prisma CLI
* **Cuándo usarla:** Para crear, modificar o eliminar tablas, columnas y relaciones.
* **Regla Crítica:** Todo cambio estructural debe originarse en `schema.prisma`. Usa comandos como `prisma format` y `prisma migrate diff`. Nunca alteres la estructura manualmente con SQL; mantener esta sincronización es vital para no corromper el registro de los 250 clientes del proveedor de internet.

## 2. Base de Datos: Lectura y Consultas Rápidas
* **Herramienta:** Supabase / SQL Selects
* **Cuándo usarla:** Para extraer reportes, leer métricas o realizar auditorías rápidas de datos sin tocar la estructura del sistema.

## 3. Frontend y UI (Interfaz de Usuario)
* **Herramienta:** Vercel CLI (Next.js)
* **Cuándo usarla:** Para cambios en el panel visual del CRM, nuevas pantallas, o ajustes de React.
* **Regla Crítica:** Exige siempre que la compilación local pase sin errores de TypeScript antes de autorizar un pase a producción.

## 4. Backend y Servidor
* **Herramienta:** Render
* **Cuándo usarla:** Para actualizaciones en la lógica principal del servidor, configuración de variables de entorno y procesamiento de pagos o validaciones de AFIP.

## 5. Automatizaciones y Tareas de Fondo
* **Herramienta:** n8n
* **Cuándo usarla:** Para gestionar flujos recurrentes, lectura de webhooks, sincronización de tickets o tareas programadas de mantenimiento.
* **Excepción:** Sus tablas y bases de datos internas no requieren formato `snake_case` ni columna genérica `id`.

## 6. Comunicaciones y Correos
* **Herramienta:** API de Resend
* **Cuándo usarla:** Para configurar o enviar correos transaccionales, avisos de corte y facturación.