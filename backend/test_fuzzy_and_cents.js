const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== PROBANDO ALGORITMO DE 999 COMBINACIONES DE CENTAVOS UNICOS ===");

  const centsSet = new Set();
  const duplicateCents = [];

  for (let i = 1; i <= 999; i++) {
    const centsVal = (((i % 999) + 1) / 100).toFixed(2);
    if (centsSet.has(centsVal)) {
      duplicateCents.push({ id: i, cents: centsVal });
    } else {
      centsSet.add(centsVal);
    }
  }

  console.log(`Combinaciones únicas generadas de 1 a 999: ${centsSet.size} de 999`);
  console.log(`Duplicados encontrados de 1 a 999: ${duplicateCents.length}`);

  if (centsSet.size === 999) {
    console.log("✅ ÉXITO MATEMÁTICO: Las 999 combinaciones de centavos son 100% ÚNICAS e INCONTAGIABLES entre sí.");
  }

  // Ejemplo de tarifas V1 a V4 para cliente 15 (Jeronimo Bustos) y cliente 16 (Calderon Juan Ernesto)
  const baseV1 = 22990, baseV2 = 24370, baseV3 = 25750, baseV4 = 26900;
  
  [15, 16, 211, 77].forEach(cId => {
    const offset = ((cId % 999) + 1) / 100;
    console.log(`\nCliente ID ${cId}:`);
    console.log(` - V1 (Mes 9+): $${(baseV1 + offset).toFixed(2)}`);
    console.log(` - V2 (Día 10 23:59hs): $${(baseV2 + offset).toFixed(2)}`);
    console.log(` - V3 (Día 16): $${(baseV3 + offset).toFixed(2)}`);
    console.log(` - V4 (Día 22): $${(baseV4 + offset).toFixed(2)}`);
  });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
