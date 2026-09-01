# Arquitectura Interfast CRM

## Topología de Infraestructura
El sistema Interfast CRM opera bajo un esquema de **Monolito estricto**, alojado en un único Web Service de **Render** (`https://interfast-backend-95ww.onrender.com`).

> [!IMPORTANT]
> **NO se utiliza Vercel ni Hostinger para el frontend.** Todo el enrutamiento web, lógica de base de datos (Prisma/PostgreSQL) y el servicio de assets visuales de React están centralizados y expuestos desde este único servidor Node.js en Render.

## Flujo de Despliegue (Build Flow)
Al realizarse un despliegue (Deploy) en Render, el ciclo de vida del proyecto es el siguiente:
1. **Compilación Frontend:** El script ingresa a la subcarpeta `frontend/`, instala dependencias y ejecuta Vite (`npm run build`) para empaquetar el código React.
2. **Generación de Binarios:** El frontend compilado y optimizado se deposita en la carpeta estática `frontend/dist/`.
3. **Despliegue Backend:** El script retorna, ingresa a la subcarpeta `backend/`, instala sus dependencias, regenera el cliente de Prisma para la base de datos y levanta el servidor Express.
4. **Static Serving:** A partir de ese momento, el backend asume el rol de Web Server, sirviendo todos los archivos de `frontend/dist` hacia el exterior, y utilizando un comodín (`app.get('*')`) para cederle el control de las URL al enrutador de React, evitando errores 404.

## Comandos Oficiales de Despliegue en Render
Para que este ecosistema funcione correctamente y los cambios visuales se impacten en producción, la configuración en el panel de control del **Web Service de Render** debe ser exactamente la siguiente:

- **Root Directory:** *(Dejar en blanco / vacío para que apunte a la raíz del repositorio de GitHub)*
- **Build Command:** 
  ```bash
  npm run build
  ```
- **Start Command:**
  ```bash
  npm start
  ```

> [!NOTE]
> Estos comandos disparan los scripts unificados que se encuentran pre-configurados en el archivo `package.json` de la raíz del repositorio, los cuales se encargan de orquestar el salto de carpetas.
