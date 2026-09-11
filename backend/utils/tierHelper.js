/**
 * Helper unificado para el cálculo de vencimientos, recargos y mora en INTERFAST.
 * Garantiza que hasta el día 10 inclusive (hasta las 23:59:59.999 hora de Argentina),
 * los clientes abonan la tarifa base ($22.990 o PriceV1) sin intereses ni mora.
 * A partir de las 00:00:00 hs del día 11 de cada mes entra en vigencia el Vencimiento 2 (con recargo).
 */

function getArgentinaDate(d = new Date()) {
  const arStr = d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' });
  return new Date(arStr);
}

function getInvoiceTierStatus(inv, checkDate = new Date()) {
  const arNow = getArgentinaDate(checkDate);
  const invMonth = inv.month || (inv.dueDate ? new Date(inv.dueDate).getMonth() + 1 : (arNow.getMonth() + 1));
  const invYear = inv.year || (inv.dueDate ? new Date(inv.dueDate).getFullYear() : arNow.getFullYear());

  // Días de corte por defecto: Día 10 para V1, Día 15 para V2, Día 20 para V3
  let day1 = 10;
  let day2 = 15;
  let day3 = 20;

  if (inv.dueDate1) {
    const d1Obj = new Date(inv.dueDate1);
    if (!isNaN(d1Obj.getTime())) day1 = d1Obj.getDate();
  }
  if (inv.dueDate2) {
    const d2Obj = new Date(inv.dueDate2);
    if (!isNaN(d2Obj.getTime())) day2 = d2Obj.getDate();
  }
  if (inv.dueDate3) {
    const d3Obj = new Date(inv.dueDate3);
    if (!isNaN(d3Obj.getTime())) day3 = d3Obj.getDate();
  }

  // Límites en horario de Argentina: fin del día respectivo (23:59:59.999)
  const limit1 = new Date(invYear, invMonth - 1, day1, 23, 59, 59, 999);
  const limit2 = new Date(invYear, invMonth - 1, day2, 23, 59, 59, 999);
  const limit3 = new Date(invYear, invMonth - 1, day3, 23, 59, 59, 999);

  let activeTier = 'V1';
  let totalAmount = inv.priceV1 || inv.originalAmount;
  let isLate = false;

  if (inv.status === 'PENDING') {
    if (arNow > limit3 && inv.priceV4) {
      activeTier = 'V4';
      isLate = true;
      totalAmount = inv.priceV4;
    } else if (arNow > limit2 && inv.priceV3) {
      activeTier = 'V3';
      isLate = true;
      totalAmount = inv.priceV3;
    } else if (arNow > limit1 && inv.priceV2) {
      activeTier = 'V2';
      isLate = true;
      totalAmount = inv.priceV2;
    }
  }

  const calculatedLateFee = isLate ? Math.max(0, totalAmount - (inv.priceV1 || inv.originalAmount)) : 0;

  return {
    activeTier,
    activeV: activeTier,
    totalAmount,
    calculatedLateFee,
    isLate,
    limit1,
    limit2,
    limit3
  };
}

module.exports = {
  getArgentinaDate,
  getInvoiceTierStatus
};
