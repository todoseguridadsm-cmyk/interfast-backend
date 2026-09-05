# Arquitectura Interfast (Documento Maestro)

## 1. Stack Tecnológico y Entornos
*   **Infraestructura Monolítica (Render):** El sistema es un Monolito Estricto alojado 100% en Render. Se elimina Vercel de la arquitectura. El backend de Node.js centraliza la lógica de negocio, motor de facturación, envíos masivos y asume la responsabilidad total de servir los archivos estáticos de React (SPA).
*   **Regla de Enrutamiento SPA (Intocable):** El servidor Express DEBE utilizar obligatoriamente la expresión regular pura `app.get(/.*/)` para ceder el control del enrutamiento al frontend. Está prohibido usar strings como `app.get('*')` para evitar *crash loops* por la librería `path-to-regexp` en Express v5.
*   **Base de Datos (Supabase):** Motor PostgreSQL gestionado por Prisma ORM. Todo cambio estructural debe validarse mediante migraciones. **Regla de Arquitectura (Connection Pooling):** Para evitar el agotamiento de conexiones (P1017), el entorno de producción (Render) debe usar obligatoriamente el puerto `6543` (Supavisor/PgBouncer) con la bandera `?pgbouncer=true` en la variable `DATABASE_URL`, y reservar el puerto directo `5432` en la variable `DIRECT_URL` exclusivamente para uso interno de Prisma en las migraciones.
*   **Automatización (n8n):** Servidor independiente. Ejecuta el bot interactivo ("Sofi") y conecta al backend mediante x-api-key.
*   **Sincronización de Esquemas y Protección n8n (Intocable):** Al compartir la base de datos de Supabase con n8n, queda ESTRICTAMENTE PROHIBIDO ejecutar npx prisma db push --accept-data-loss. Prisma intentará eliminar las tablas nativas del bot por no estar mapeadas en el modelo. Todo cambio estructural debe inyectarse directamente vía SQL en el editor de Supabase o mediante migraciones hiper-controladas (prisma migrate dev) auditando exhaustivamente que no se alteren tablas ajenas a Invoice, Client, Payment, etc.

## 2. Flujos Críticos de Negocio (Intocables)
*   **Facturación Escalonada:** El motor mensual genera facturas con 4 vencimientos e inyecta centavos únicos (uniqueVariation).
*   **Emisión de Comprobantes AFIP (Estrictamente a demanda):** La generación en ARCA está desacoplada del cobro automático. Solo se emite si el cliente lo solicita o si el operador lo dispara manualmente.
*   **Conciliación Inteligente de Pagos:** Algoritmo en cascada (Referencia MP -> Nombre -> DNI -> Centavos). Diferencias >$200 van a billetera a favor o generan deuda a 7 días.
*   **Gestión de Morosidad y Cortes:** Ejecución automatizada el día 22 a las 08:00 AM. Clientes con manualCutoffOnly = true quedan protegidos. Reactivación inmediata al imputar el pago.

## 3. Módulo Preventivo: Servicio Técnico
*   **Telemetría y Kanban:** n8n consulta el estado físico de los puertos LAN. Ante degradación, envía webhook (/api/telemetry/alert). El backend aplica lógica anti-duplicados e inyecta la alerta en Ticket con el prefijo [TELEMETRÍA].

## 4. Reglas Críticas del Bot Sofi
*   **Buscador de Clientes:** Exige mínimo de 6 caracteres numéricos para teléfono. Búsqueda por DNI con coincidencia exacta (equals).
*   **Consulta de Deuda:** Prioriza estrictamente facturas PENDING. Solo devuelve PAID si hay deuda cero.
*   **Diagnóstico Obligatorio:** Prohibido crear tickets sin ejecutar Ping a la antena y guiar reinicio eléctrico.

## 5. Gestión de Caja y Arqueo (Tesorería)
*   **Contabilidad:** Gestionada sobre Payment (cobros) y CashMovement (libro diario). Trazabilidad innegociable con ID relacional (userId) y firma explícita (operator).

## 6. Optimización de Bajas y Retención
*   **Rendimiento:** Prohibido consultar a MikroTik en tiempo real para listados masivos. El estado isCutOff se cruza localmente.
*   **Corte Diferido y Retención:** El cambio a BAJA detiene la facturación pero estira el servicio hasta fin de ciclo. El motor de promociones usa promoEndDate para restablecer planes al expirar descuentos.

## 7. Control de Acceso y Empleados (RBAC)
*   **Permisos Granulares:** Jerarquía estricta (ADMIN, STAFF). Los accesos del personal se gestionan mediante un array JSON inyectado en el JWT, permitiendo asignar módulos específicos. Solo el Administrador puede crear o editar usuarios.

## 8. Topología de Red y Acceso Directo
*   **Estructura Jerárquica y Dinámica:** El modelo vincula a cada Client con un Panel (Antena AP), el cual pertenece a un Node (Router MikroTik). El mapeo de Nodos y Paneles se resuelve dinámicamente atado a la IP del cliente (`nodeRefId` y `panelRefId`).
*   **Integración Winbox (Protocolos Nativos):** Queda estrictamente PROHIBIDO usar eventos sintéticos de React (`onClick={() => window.location.assign...}`) para invocar la aplicación. Solo deben utilizarse etiquetas HTML nativas (`<a href="winbox://...">`) con estilos CSS en línea para garantizar que Windows intercepte la llamada sin bloqueos del navegador.

## 9. Conciliación Automática (Webhook Mercado Pago)
*   **Tolerancia Matemática:** El embudo de pagos maneja excedentes (inyectando saldo a favor en el `walletBalance` silenciosamente si sobra >$5), exactitud (+/- $5), y pagos parciales (marcando original como pagada y generando una nueva factura `PENDING` por el faltante junto a un aviso por webhook a n8n).
*   **Extracción Profunda (Transferencias 3.0 / CVU):** Antes de ejecutar la cascada, el webhook realiza una doble consulta al pago para rescatar el DNI y Nombre reales ocultos en el nodo `point_of_interaction.transaction_data.bank_info.payer_info`. Esto mitiga los "pagos ciegos" o anónimos provenientes de transferencias bancarias directas, alimentando correctamente las Fases A y B.
*   **Cascada de Identificación (4 Fases):** 1) Match por Regex DNI/CUIT. 2) Tokenización de Nombres (coincidencia cruzada de 2 palabras mínimas). 3) Distancia de Levenshtein (en observaciones `MP:` para sortear errores de tipeo). 4) Cálculo Inverso de Centavos (`uniqueVariation`) para derivación a la bandeja de No Identificados.
*   **Retención de Huérfanos:** Si las 4 fases fallan, el cobro se guarda en `UnidentifiedPayment`. El prefijo sugerido se antepone automáticamente al nombre en base a la coincidencia decimal exacta.
*   **Regla de Arquitectura (Intocable):** El módulo de Mercado Pago vive aislado físicamente en `routes/mercadopagoWebhook.js`. Queda ESTRICTAMENTE PROHIBIDO inyectar lógica de webhooks o pasarelas de pago dentro de `index.js` para evitar sobrescrituras accidentales por pérdida de contexto de la IA.

## 10. Conciliación Contable y Extractos (Excel/CSV)
*   **Inyección de Egresos:** El sistema asienta comisiones bancarias o de Mercado Pago en CashMovement como egresos (OUT).
*   **Seguro Anti-Duplicados:** Protegido por una tabla de auditoría (ReconciliationLog) y un índice único (externalTransactionId) en PostgreSQL para rechazar filas repetidas.

## 11. Terminal de Cobro y Caja Física (POS)
*   **Triple Impacto Contable:** Transacción atómica que actualiza la factura a pagado, guarda el registro en Payment e inyecta el ingreso en CashMovement.
*   **Renderizado Vectorial:** Utiliza jsPDF para dibujar el comprobante de pago interno en el navegador del cajero al instante.
*   **Emisión Fiscal a Demanda:** El cobro en caja no dispara la factura AFIP; esta acción queda reservada a una ejecución explícita.

## 12. Interfast WhatsApp Web (Chat en Vivo)
*   **Sincronización WebSocket:** Interfaz reactiva que reordena chats y actualiza globos de notificaciones en tiempo real consumiendo WAHA.
*   **Retención a 30 Días:** Un cron en el backend depura automáticamente los mensajes antiguos (ChatMessage) para proteger el almacenamiento.
*   **Frenar Bot:** Un control manual establece la bandera botPausedUntil, silenciando a Sofi para permitir la intervención humana sin interferencias.

## 13. Difusión Masiva y Motor Anti-Ban
*   **Ejecución Asíncrona (Desacople HTTP):** Todos los envíos masivos de WhatsApp deben correr de forma asíncrona en **segundo plano**, totalmente desacoplados del ciclo de respuesta HTTP principal. Esto evita *timeouts* y permite al operador navegar por otras pestañas sin interrumpir el proceso.
*   **Segmentación por Topología:** Capacidad de enviar mensajes filtrando clientes por Node o Panel específico.
*   **Motor Anti-Ban (Intocable):** Impone obligatoriamente: ofuscación dinámica de texto, pausas aleatorias de 15-25 segundos entre mensajes, y un enfriamiento estricto de 90 segundos cada 40 envíos.

## 14. Facturación Masiva e Individual
*   **Ciclo de Ejecución:** El motor ignora a los clientes VIP e itera sobre los abonados ACTIVE. Si se ejecuta del día 25 en adelante, liquida automáticamente el mes calendario siguiente.
*   **Centavos Dinámicos y Seguridad API (Mercado Pago):** El sistema inyecta la `uniqueVariation` a cada opción de pago. Como estándar estricto, todo `unit_price` debe ser tipado numéricamente de forma obligatoria y siempre contar con un email de *fallback* para evitar rechazos (Error 400) de la API de MercadoPago.
*   **Motor de Retenciones (Cero Mantenimiento):** Evalúa `promoEndDate` y restaura automáticamente el plan base (regularPlanId) al expirar descuentos.
*   **Desacople Fiscal Total:** Prohibido disparar llamadas automáticas a la API de ARCA durante la facturación masiva.
*   **Generación a Demanda (Devengamiento):** La creación manual de deuda se limita a inyectar un registro PENDING en Invoice (con sus respectivos centavos dinámicos). No altera CashMovement ni dispara facturación electrónica. Un cliente VIP ignora el ciclo masivo, pero el sistema permite facturarle si la ejecución individual envía su ID explícito.

## 15. Gestión de Clientes y Ficha de Abonado
*   **Identidad Visual Continua (TK000):** El número de cliente se renderiza en tiempo real formateando matemáticamente la clave primaria (id).
*   **Integridad Topológica (Cascada):** Es imposible por sistema asignar a un cliente a un panel que no corresponda al nodo matriz.
*   **Control de IA en Vivo:** Switch maestro para silenciar a Sofi de inmediato (inyectando botPausedUntil).

## 16. Dashboard 360 y Centro de Control de WhatsApp
*   **Dashboard Financiero y Telemetría:** Promesas asíncronas para métricas financieras y exposición de tickets de infraestructura. Libre de renderizados de QR.
*   **Arquitectura Híbrida de WhatsApp:** El Músculo (Baileys/QR Local) para envíos salientes; El Cerebro (n8n/Sofi) para webhooks entrantes y flujos conversacionales.
*   **Centro de Control Centralizado:** Gestión de sesión (QR, estado) administrada exclusivamente desde `/whatsapp`.

## 17. Gestión de Secretos y Variables de Entorno (.env)
*   **Aislamiento de Credenciales:** Prohibido guardar credenciales hardcodeadas en el código fuente.
*   **Directiva para la IA (DevOps):** Los asistentes tienen estrictamente prohibido detener la generación de código para solicitar credenciales reales.

## 18. Gestión, Mantenimiento y Versionado de n8n (Bot Sofi)
*   **Estructura Intocable (JSON):** Prohibido alterar la propiedad `typeVersion` de los nodos existentes.
*   **Seguridad de Credenciales:** Todo acceso autenticado debe referenciar al "Credential Manager" nativo de n8n.
*   **Protocolo de Parcheo:** Exportar JSON -> Modificar lógica en editor -> Importar como pruebas antes de producción.

## 19. Tolerancia a Fallos, Alertas y Respaldos (Disaster Recovery)
*   **Fallas de Sincronización MikroTik:** Ante cortes, el sistema continúa iterando y genera un Ticket con prefijo [FALLA MIKROTIK].
*   **Reportes Administrativos:** Notificaciones silenciosas a gerencia sobre procesos críticos.
*   **Política de Respaldo:** Código fuente en GitHub y JSONs de n8n en almacenamiento externo.
