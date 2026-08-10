const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== AUDITORÍA DE FACTURACIÓN MES 08/2026 VS LISTA DE 79 CLIENTES ===");

  const list79 = [
    { name: "AMBROCIO RAUL", amount: 22999.94 },
    { name: "MUÑOZ CAROLINA", amount: 22990.00 },
    { name: "CORNEJO GIMENA", amount: 22990.27 },
    { name: "ACEBEDO ELISABETH", amount: 22990.00 },
    { name: "ARCE PATRICIA DEL VALLE", amount: 22991.54 },
    { name: "CHINI SANDRA", amount: 22990.00 },
    { name: "CLAUDIA ELSA ESCUDERO", amount: 22990.91 },
    { name: "RIERA RAUL LAFRE/ADELA BRANDI", amount: 22990.72, search: "ADELA BRANDI" },
    { name: "GUARDIA ANDREA LUICINA", amount: 22990.84 },
    { name: "YOLANDA ISABEL ECHAVE/JOFRE ROQUE", amount: 22990.91, search: "JOFRE ROQUE" },
    { name: "LUCAS GABRIEL CONSOLINI", amount: 22990.32 },
    { name: "ANDREA MICAELA BENZONI", amount: 22990.75 },
    { name: "VEGA BLANCA", amount: 22990.00 },
    { name: "MARIA LILIANA GOMEZ", amount: 22990.38 },
    { name: "ROBERTO JOSE DONA", amount: 22990.25, search: "DONA" },
    { name: "ARCE RICARDO QUINCHO", amount: 22990.03 },
    { name: "LILIANA MARIEL FERREYRA", amount: 22992.22 },
    { name: "ZUÑIGA VANESA PAMELA/GAUNA GUSTAVO", amount: 22991.78, search: "GAUNA GUSTAVO" },
    { name: "PALIZA INES SONIA", amount: 22991.31 },
    { name: "LEONOR GLADYS TALQUENCA", amount: 22992.35 },
    { name: "LETICIA PAOLA DOMINGUEZ", amount: 22990.00 },
    { name: "MARCELA ALEJANDRA VIDELA/LEONARDO SANTIAGO GONZALEZ", amount: 22992.33, search: "GONZALEZ LEONARDO SANTIAGO" },
    { name: "JOHANA GISEL PALOMO", amount: 22992.00 },
    { name: "ZOPULO GUZMAN MICAELA ESTEFANIA", amount: 22991.48 },
    { name: "DANIEL ROBERTO MARIN/ GALACHO LAURA", amount: 22990.30, search: "GALACHO LAURA" },
    { name: "PATRICIA SILVANA SFREDDO", amount: 22991.42 },
    { name: "DIEGO JOSE ESCUDERO", amount: 22990.71 },
    { name: "PAOLA JAQUELINA NARVAEZ/PERALTA GERARDO", amount: 22991.88, search: "PERALTA GERARDO" },
    { name: "MATUS MARIANA SOLEDAD", amount: 22990.45 },
    { name: "GATTO GRACIELA", amount: 22990.31 },
    { name: "ZORRILLA MABEL ALICIA", amount: 22991.72 },
    { name: "MARIA FERNANDA MORALES", amount: 22991.18 },
    { name: "JERONIMO IGNACIO BUSTOS", amount: 22990.16 },
    { name: "ORLANDO SANCHEZ", amount: 22991.25 },
    { name: "ANDREA NATALIA BERNARDELLI/FUNES MARIO", amount: 22990.29, search: "FUNES MARIO" },
    { name: "ALEJANDRO IRAÑETA", amount: 22990.39 },
    { name: "MARIA LAURA NADALES", amount: 22991.20 },
    { name: "EMILIANO SFREDDO", amount: 22990.13 },
    { name: "ROXANA LOURDES ORTIZ", amount: 22990.32 },
    { name: "MARIA FERNANDA NIETO", amount: 22990.77 },
    { name: "GONZALO EZEQUIEL GARCIA/NALON PABLO 2", amount: 22992.27, search: "NALON PABLO" },
    { name: "CARLOS ESTEBAN VILLENA", amount: 22990.68 },
    { name: "MARIANA DENISE TORRISI", amount: 22990.05 },
    { name: "LUIS MANUEL GUIRAO", amount: 23000.00 },
    { name: "LEANDRO FABIAN EZEQUIEL GUEVARA", amount: 22990.37 },
    { name: "FERNANDO SEBASTIAN GONZALEZ", amount: 22993.00 },
    { name: "MARIA MADELEINE / FUNDACION CIOMA", amount: 22990.07, search: "FUNDACION" },
    { name: "SANDRA ALEJANDRA CARABAJAL/ARCE RICARDO QUINCHO", amount: 22990.03, search: "ARCE RICARDO" },
    { name: "CARMAGNANI EDITH MARGARITA", amount: 22990.00 },
    { name: "EXEQUIEL ALEXIS REYMOND/ REYMOND SERGIO", amount: 22990.14, search: "REYMOND SERGIO" },
    { name: "BARRERA MARCOS/FERREYRA MARIA FLORENCIA", amount: 22991.63, search: "FERREYRA MARIA FLORENCIA" },
    { name: "LIPARI VANESA SILVINA", amount: 22991.37 },
    { name: "SANCHEZ OSCAR GABRIEL", amount: 22990.96 },
    { name: "MONICA ALEJANDRA OYOLA/ MARQUEZ OSCAR", amount: 22990.53, search: "MARQUEZ OSCAR" },
    { name: "CLAUDIA FABIANA IRUSTA/BAIGORRIA JOSE MANUEL", amount: 22990.69, search: "BAIGORRIA JOSE MANUEL" },
    { name: "GUSTAVO GUILLERMO FIADINO", amount: 22991.51 },
    { name: "LEANDRO MARTIN BARRERA LUCERO", amount: 22990.86 },
    { name: "DUTTO ROXANA PATRICIA", amount: 22990.59 },
    { name: "MARIA DE LA SOLEDAD ESPEJO/HERMOSO MIGUEL PEDRO", amount: 23000.00, search: "HERMOSO MIGUEL PEDRO" },
    { name: "CLAUDIA ANALIA AGUILERA", amount: 22990.70 },
    { name: "FUNES ELISA NOEMI", amount: 22991.50 },
    { name: "CLAUDIA ALEJANDRA LOPEZ", amount: 22991.38 },
    { name: "DAVID MAZARA", amount: 22990.46 },
    { name: "DOMINGO MAZARA", amount: 22990.47 },
    { name: "MAURICIO NICOLAS MORALES", amount: 22991.57 },
    { name: "NAHUEL NICOLAS NOGUERON/CARMAGNANI EDITH", amount: 22990.00, search: "CARMAGNANI" },
    { name: "AILIN EMILIANA ANDRADA/ GUEVARA LILIANA", amount: 22990.00, search: "GUEVARA LILIANA" },
    { name: "ELIO HERNAN ALMEIDA", amount: 22990.34 },
    { name: "SERGIO ROBERTO SEGURA/ ANGLADA HILDA DEL CARMEN", amount: 22991.71, search: "ANGLADA HILDA" },
    { name: "ALDANA BELEN SANCHEZ", amount: 22991.23 },
    { name: "MASHAD ALI KARIM/ MARTINEZ MONICA", amount: 22992.06, search: "MARTINEZ MONICA" },
    { name: "ESTRADA BRISA TERRAZA/ TERRAZA ESPERANZA", amount: 22991.62, search: "TERRAZA ESPERANZA" },
    { name: "RODRIGUEZ YANINA ANT", amount: 22990.52 },
    { name: "CALDERON JUAN ERNESTO", amount: 22990.00 },
    { name: "CONTE EUGENIO", amount: 22990.00 },
    { name: "BRITO SILVIO", amount: 22991.65 },
    { name: "GONZALEZ FERNANDO SEBASTIAN", amount: 22993.00 },
    { name: "ANITORI, MIRTA BEATRIZ ANA", amount: 22990.57 },
    { name: "GLADYS ANA PEREIRA", amount: 22990.16 }
  ];

  const pendingList = [];
  const paidList = [];
  const notFoundList = [];

  for (let i = 0; i < list79.length; i++) {
    const item = list79[i];
    const searchTerm = item.search || item.name;

    // Buscar cliente en BD
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: item.name.split('/')[0].trim(), mode: 'insensitive' } }
        ]
      }
    });

    if (clients.length === 0) {
      notFoundList.push({ idx: i + 1, name: item.name, amount: item.amount, reason: "Cliente NO ENCONTRADO en la BD por nombre" });
      continue;
    }

    const clientIds = clients.map(c => c.id);

    // Buscar factura de mes 8/2026
    const invoices = await prisma.invoice.findMany({
      where: {
        clientId: { in: clientIds },
        month: 8,
        year: 2026
      },
      include: { client: true, payments: true }
    });

    if (invoices.length === 0) {
      notFoundList.push({ idx: i + 1, name: item.name, clientFound: clients[0].name, amount: item.amount, reason: "Sin Factura 8/2026 en el CRM" });
      continue;
    }

    const paidInvoice = invoices.find(inv => inv.status === 'PAID');
    const pendingInvoice = invoices.find(inv => inv.status === 'PENDING');

    if (paidInvoice) {
      const pm = paidInvoice.payments[0];
      paidList.push({
        idx: i + 1,
        name: item.name,
        crmClientName: paidInvoice.client.name,
        amountExpected: item.amount,
        amountPaid: pm ? pm.amountPaid : paidInvoice.originalAmount,
        method: pm ? pm.method : 'PAID',
        status: 'PAID'
      });
    } else if (pendingInvoice) {
      pendingList.push({
        idx: i + 1,
        name: item.name,
        crmClientName: pendingInvoice.client.name,
        clientId: pendingInvoice.client.id,
        invoiceId: pendingInvoice.id,
        amountExpected: item.amount,
        status: 'PENDING'
      });
    } else {
      notFoundList.push({ idx: i + 1, name: item.name, clientFound: clients[0].name, amount: item.amount, reason: `Factura en estado ${invoices[0].status}` });
    }
  }

  console.log("\n=======================================================");
  console.log(`RESUMEN GENERAL AUDITORÍA 08/2026 (${list79.length} CLIENTES EN LISTA PLANILLA):`);
  console.log(`🟢 CARGADOS COMO PAGADOS (PAID) EN EL CRM: ${paidList.length}`);
  console.log(`🔴 PENDIENTES DE PAGO EN EL CRM (NO CARGADOS AÚN): ${pendingList.length}`);
  console.log(`⚠️ NO ENCONTRADOS / SIN FACTURA EN CRM: ${notFoundList.length}`);
  console.log("=======================================================\n");

  console.log("=== 🔴 DETALLE DE CLIENTES PENDIENTES (NO CARGADOS COMO PAGADOS EN EL CRM) ===");
  pendingList.forEach(p => {
    console.log(`${p.idx}. [ID CRM: ${p.clientId}] ${p.name} | Nombre CRM: "${p.crmClientName}" | Factura ID: ${p.invoiceId} | Monto Planilla: $${p.amountExpected}`);
  });

  console.log("\n=== ⚠️ DETALLE DE CLIENTES NO ENCONTRADOS O SIN FACTURA 8/2026 ===");
  notFoundList.forEach(p => {
    console.log(`${p.idx}. ${p.name} | Monto Planilla: $${p.amountExpected} | Razón: ${p.reason} ${p.clientFound ? `(Cliente CRM: ${p.clientFound})` : ''}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
