---
name: verify-interfast-stack
description: Flujo de trabajo de seguridad para gestionar recursos, despliegues y bases de datos en el ecosistema Interfast (Vercel, Render, Supabase, Prisma, n8n, Resend). Exige validación local y análisis de impacto antes de alterar producción.
---

# Verify Interfast Stack Skill (V1)

## Overview

Esta skill establece un proceso riguroso para cualquier modificación en la infraestructura del CRM. Su objetivo es evitar despliegues accidentales y corrupción de datos, obligando al agente a verificar el impacto en el entorno local antes de tocar el sistema en vivo.

## Workflow: Verificación y Ejecución de Cambios

Cuando el usuario solicite un cambio estructural, de base de datos o de despliegue, sigue estos pasos:

### Step 1: Seleccionar la Capa de Infraestructura
Consulta el archivo `references/stack_selection_guide.md` para determinar qué tecnología (Prisma, Vercel CLI, API de Supabase, Render o n8n) debe utilizarse para la tarea solicitada.

### Step 2: Validar el Entorno Local
Antes de proponer un comando que afecte la producción, utiliza la skill `validador-base-datos` (con sus excepciones para PascalCase y n8n) o revisa la compilación de Next.js de forma local para garantizar que el código no contenga errores críticos.

### Step 3: Identificar el Comando Correcto
Formula el comando de despliegue o migración (ej. `npx prisma migrate deploy`, `vercel --prod`).

### Step 4: Proteger Producción (Análisis de Impacto)
Nunca ejecutes una migración de base de datos o un despliegue sin mostrar antes el impacto. Si es Prisma, utiliza comandos de validación como `prisma migrate diff` para mostrar qué tablas o columnas se crearán, alterarán o eliminarán.

### Step 5: Solicitar Aprobación Final
Presenta el resultado del análisis de impacto al usuario. Solicita una confirmación explícita antes de ejecutar el comando final que afectará la infraestructura en vivo.

### Step 6: Ejecución y Monitoreo
Tras recibir aprobación, ejecuta el comando. Si la tarea falla, detén el proceso inmediatamente.

### Step 7: Diagnóstico de Errores
Si ocurre un fallo (ej. error de compilación en Vercel o conflictos de relación en Prisma), consulta el archivo `references/error_playbook.md` para identificar el patrón del problema y proponer una solución técnica específica sin alterar datos.