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

  const extractArDay = (dt, fallbackDay) => {
    if (!dt) return fallbackDay;
    const dObj = new Date(dt);
    if (isNaN(dObj.getTime())) return fallbackDay;
    const arD = getArgentinaDate(dObj);
    return arD.getDate();
  };

  let day1 = extractArDay(inv.dueDate1, 10);
  let day2 = extractArDay(inv.dueDate2, 15);
  let day3 = extractArDay(inv.dueDate3, 20);

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
