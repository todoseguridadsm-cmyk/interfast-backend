# Playbook de Manejo de Errores (Interfast)

Este documento define los patrones de error más comunes en la infraestructura del CRM y los pasos de resolución que el agente debe proponer al usuario.

## 1. Patrón: Conflicto de Migración en Prisma
* **Palabras Clave:** `Drift detected`, `Migration failed`, `P3001`, `P3009`
* **Diagnóstico:** El esquema local de Prisma (`schema.prisma`) no coincide con el estado actual de la base de datos en Supabase, o una migración intentó alterar datos existentes de forma destructiva.
* **Resolución a proponer:**
  1. Detener cualquier intento de forzar el despliegue (`--force`).
  2. Ejecutar `prisma migrate diff` para comparar el estado local con producción.
  3. Proponer la creación de una migración vacía (`prisma migrate dev --create-only`) para resolver el conflicto manualmente con SQL sin pérdida de datos.

## 2. Patrón: Fallo de Compilación en Vercel
* **Palabras Clave:** `Command "build" exited with`, `Type error:`, `Module not found`
* **Diagnóstico:** El código del frontend tiene errores de TypeScript o dependencias faltantes que impiden la generación de la interfaz en Vercel.
* **Resolución a proponer:**
  1. Revisar los logs de compilación para identificar el archivo exacto del error.
  2. Ejecutar `npm run build` o `tsc --noEmit` localmente para replicar el fallo.
  3. Sugerir la corrección del tipado o la instalación del paquete faltante antes de volver a hacer push a GitHub.

## 3. Patrón: Timeout o Error en Webhooks de n8n
* **Palabras Clave:** `ECONNRESET`, `Timeout`, `Node execution failed`
* **Diagnóstico:** Un flujo automatizado en n8n tardó demasiado en responder o falló al comunicarse con una API externa (ej. AFIP o Resend).
* **Resolución a proponer:**
  1. Verificar el historial de ejecuciones (Execution History) en n8n para identificar el nodo exacto que falló.
  2. Comprobar si el servicio externo está caído.
  3. Sugerir agregar un nodo de "Error Trigger" o reintentos automáticos (Retries) en la configuración del nodo defectuoso.

## 4. Patrón: Rechazo de Envío en Resend
* **Palabras Clave:** `403 Forbidden`, `API key missing`, `rate limit`
* **Diagnóstico:** El sistema intentó enviar correos a los clientes (ej. avisos de factura) pero falló la autenticación o se superó el límite de la capa gratuita.
* **Resolución a proponer:**
  1. Verificar que la variable `RESEND_API_KEY` esté correctamente cargada en `.render_env`.
  2. Revisar el panel de Resend para confirmar el estado del dominio y los límites de envío diarios.