const cron = require('node-cron');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { processMercadoPagoPayment } = require('../services/mercadopagoConciliator');

// Corre cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  if (!process.env.MP_ACCESS_TOKEN) return;
  console.log('🔄 [CRON] Iniciando Auto-Rastreador de MercadoPago...');
  
  try {
    // Buscamos los últimos 50 pagos, ordenados por fecha descendente
    const url = 'https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=50';
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });

    const payments = response.data.results || [];
    let newProcessedCount = 0;
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    for (const mpPayment of payments) {
      if (mpPayment.status !== 'approved') continue;
      if (new Date(mpPayment.date_created) < twoDaysAgo) continue; // Salvaguarda: ignorar pagos viejos
      
      const paymentId = mpPayment.id;
      const transactionAmount = parseFloat(mpPayment.transaction_amount) || 0;

      // Usamos el servicio de conciliación compartido
      const result = await processMercadoPagoPayment(prisma, mpPayment, transactionAmount, paymentId, 'AUTO_RASTREADOR_CRON');
      
      if (result.status === 'success' || result.status === 'orphan') {
        newProcessedCount++;
      }
    }
    
    if (newProcessedCount > 0) {
      console.log(`✅ [CRON] Rastreador finalizado. Se procesaron ${newProcessedCount} nuevos ingresos.`);
    }
  } catch (error) {
    console.error('❌ [CRON] Error en el Auto-Rastreador de MercadoPago:', error.message);
  }
});
