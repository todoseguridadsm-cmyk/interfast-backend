const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const pagosAtrasados = [
  { name: "ROMINA FALCON", amount: 26901.09, month: "09" },
  { name: "MAURICIO DARIO ACOSTA/CARMAGNANI EDITH MARGARITA", amount: 22991.74, month: "09" },
  { name: "ANDREA MICAELA BENZONI", amount: 22990.75, month: "09" },
  { name: "LETECIA PAOLA DOMINGUEZ", amount: 22990.24, month: "09" },
  { name: "PATRICIA SILVANA SFREDDO", amount: 22991.43, month: "09" },
  { name: "MABEL ZORRILLA/ZORRILLA MABEL ALICIA", amount: 22991.73, month: "09" },
  { name: "ADRIANA ELISA PETIOT", amount: 22992.01, month: "09" },
  { name: "FUNES ELISA NOEMI", amount: 22991.52, month: "09" },
  { name: "MYRNA ELISABETH ALTAMIRANO/RAUL AMBROSIO", amount: 22990.93, month: "09" },
  { name: "SILVIO CHARBEL BRITO/BRITO SILVIO", amount: 22991.66, month: "09" },
  { name: "MARIA FERNANDA MORALES/ MORALES BETINA EMILSE", amount: 22991.19, month: "09" },
  { name: "SANDRA ELIZABETH CASTILLO", amount: 22990.79, month: "09" },
  { name: "MATUS MARIANA SOLEDAD", amount: 22990.46, month: "09" },
  { name: "GUARDIA ANDREA LUISINA", amount: 22991.83, month: "09" },
  { name: "SERGIO ROBERTO SEGURA/ANGLADA HILDA DEL CARMEN", amount: 22991.80, month: "09" },
  { name: "GONZALEZ ARTURO (todo lustre) 1/ARTURO CRISTIAN DAVID GONZALEZ", amount: 22991.18, month: "09" },
  { name: "GONZALEZ ARTURO (todo lustre) 2//ARTURO CRISTIAN DAVID GONZALEZ", amount: 22990.35, month: "09" },
  { name: "JOHANA GISEL PALOMO", amount: 22992.00, month: "09" },
  { name: "PAOLA JAQUELINA NARVAEZ/ PERALTA GERARDO", amount: 22991.89, month: "09" },
  { name: "PATRICIA GOMEZ", amount: 27000.00, month: "08" },
  { name: "MACHADO MARTIN", amount: 20300.43, month: "09" },
  { name: "MARIANA DENISE TORRIS", amount: 22990.06, month: "09" },
  { name: "PALIZA INES SONIA", amount: 25289.00, month: "09" },
  { name: "AILIN EMILIANA ANDRADA/GUEVARA LILIANA LOURDES", amount: 22991.31, month: "09" },
  { name: "MARCELA ALEJANDRA VIDELA/GONZALEZ LEONARDO SANTIAGO", amount: 22992.34, month: "09" },
  { name: "SANCHEZ MEDINA GABRIEL DARIO", amount: 22991.57, month: "09" },
  { name: "RODRIGUEZ JULIETA MAGA/MARTINEZ FERNANDO JOSE MANUEL", amount: 22990.44, month: "09" },
  { name: "YOLANDA ISABEL ECHAVE/JOFRE ROQUE", amount: 22990.91, month: "09" },
  { name: "ORLANDO SANCHEZ", amount: 22991.26, month: "09" },
  { name: "MARIO FELIX ROVIGATTI/ ROVIGATTI MARTIN", amount: 22991.60, month: "09" },
  { name: "MARIA MADELEINE GIAMPORTONE POLONIO/FUNDACION C.I.O.M.A", amount: 22990.08, month: "09" },
  { name: "SANDRA CLAUDIA CHINI/CHINI SANDRA", amount: 22990.18, month: "09" },
  { name: "CIPOLLA JOSE LUIS", amount: 22991.81, month: "09" },
  { name: "EMILIANO SFREDDO", amount: 22990.14, month: "09" },
  { name: "GUERRERO ROBERTO OSVALDO/MUÑOZ CAROLINA", amount: 22990.50, month: "09" },
  { name: "ROLANDO FABIO ZALAZAR", amount: 26901.30, month: "09" },
  { name: "GALACHO MABEL", amount: 25289.00, month: "09" }
];

async function run() {
  console.log('=== INICIANDO CARGA MASIVA DE PAGOS ATRASADOS DE MERCADO PAGO ===\n');
  const operatorName = 'CARGA_MASIVA_MP';
  let exitosos = 0;
  let fallidos = 0;

  for (const pago of pagosAtrasados) {
    try {
      // 1. Limpiar y extraer la primera parte del nombre
      const nameParts = pago.name.split('/');
      let searchName = nameParts[0].trim();
      
      // Ajuste para casos especficos como "GONZALEZ ARTURO (todo lustre) 1"
      if (searchName.includes('(todo lustre)')) {
          searchName = searchName.replace(/\(todo lustre\)\s*\d*/i, '').trim();
      }

      // 2. Buscar al cliente
      let client = await prisma.client.findFirst({
        where: { name: { contains: searchName, mode: 'insensitive' } }
      });

      // Búsqueda alternativa si no lo encuentra por nombre exacto
      if (!client) {
        const firstToken = searchName.split(' ')[0];
        const secondToken = searchName.split(' ')[1] || '';
        client = await prisma.client.findFirst({
          where: {
            AND: [
              { name: { contains: firstToken, mode: 'insensitive' } },
              { name: { contains: secondToken, mode: 'insensitive' } }
            ]
          }
        });
      }

      if (!client) {
        console.error(`[ERROR] Cliente NO encontrado para: "${pago.name}" (Buscando por: "${searchName}")`);
        fallidos++;
        continue;
      }

      // 3. Buscar la factura en PENDING para el mes especificado (Parseando a Int)
      const invoice = await prisma.invoice.findFirst({
        where: { 
            clientId: client.id, 
            month: parseInt(pago.month, 10), 
            status: 'PENDING' 

        }
      });

      if (!invoice) {
        console.error(`[ERROR] Factura PENDING del mes ${pago.month} NO encontrada para: ${client.name} (ID: ${client.id})`);
        fallidos++;
        continue;
      }

      // 4. Iniciar Transaccin Atmica
      const descriptionText = `Pago manual MP atrasado - ${pago.name}`;
      
      await prisma.$transaction(async (tx) => {
        // A) Actualizar Invoice
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            paymentDate: new Date(),
            paymentMethod: 'MERCADOPAGO',
            operator: operatorName
          }
        });

        // B) Registrar Payment
        await tx.payment.create({
          data: {
            amount: pago.amount,
            method: 'MERCADOPAGO',
            operator: operatorName,
            clientId: client.id,
            invoiceId: invoice.id,
            description: descriptionText
          }
        });

        // C) Asiento Contable en CashMovement
        await tx.cashMovement.create({
          data: {
            type: 'IN',
            amount: pago.amount,
            description: descriptionText,
            operator: operatorName,
            method: 'MERCADOPAGO'
          }
        });
      });

      console.log(`[EXITO] Pago de $${pago.amount} imputado correctamente a: ${client.name} (Factura #${invoice.id})`);
      exitosos++;
      
    } catch (err) {
      console.error(`[ERROR CRITICO] Fallo al procesar el pago de "${pago.name}":`, err.message);
      fallidos++;
    }
  }

  console.log(`\n=== PROCESO FINALIZADO ===`);
  console.log(`o. Exitosos: ${exitosos}`);
  console.log(`?O Fallidos: ${fallidos}`);
}

run()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
