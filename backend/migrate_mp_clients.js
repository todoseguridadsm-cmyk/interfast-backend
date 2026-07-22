const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

const clientNames = [
  "VAQUER LEANDRO", "GAVIOLA ADRIAN", "ADARO RAUL", "ALLISIARDI FEDERICO", "BARRERA SILVIA ANDREA", "BECERRA FIAMMA CANDELA", "BUSTO JERONIMO", "CALDERON JUAN ERNESTO", "DAVIRE JAVIER", "D ANGELO BEATRIZ LOCAL", "DEPOSITO PATAGONIA BOULOGNE SUR", "DOMINGUEZ PAOLA", "FALCONI MARIO", "FERRO WALTER", "FIGUEROA MAURICIO ESTUDIO", "FUNES MARIO ( ESCUELA CORRIENTE", "GALACHO LAURA ADRIANA", "GATTO GRACIELA ALEJANDRA", "NADALEZ ROMINA", "GUELI DANIEL IVAN", "IRAÑETA ALEJANDRO", "JUANA VIDIA", "MARTINEZ FERNANDO JOSE MANUEL", "MATEO MARCELO JAVIER", "MATUS MARIANA", "MAZARA DAVID", "MUÑOZ RICARDO VICTOR MARTIN", "NADALEZ LEONARDO ALBERTO", "ORTS JOSE", "MARQUEZ OSCAR", "PAEZ SERGIO ( MENEGHELLI PAOLA", "CHIMENDO ROCIO", "ROXANA BUSTOS", "SALINAS LUIS", "VARGAS GLORIA LOURDES", "VILA GONZALO", "VILLENAS CARLOS", "ZANON MARIO DAMIAN", "BENZONI ANDREA", "ALONSO MARIA ALEJANDRA", "MERCADO AGUSTINA", "CASTILLO SANDRA", "GUIRAO JESUS LUIS E HIJOS S.R.L.", "CORVALAN AGUSTIN", "ALTAMIRANO NADIA", "LEIVA ANDREA", "CONTE EUGENIO", "AMBRONOSOLI CESAR", "BLANES OSCAR ALFREDO", "SANCHEZ OSCAR", "LUCERO MERCEDES GLADYS", "DE CHAZAL JUAN MANUEL", "SOCIO JUAN CARLOS", "DIAZ CLAUDIA", "VELAZQUEZ YANELA", "MERLO ELIZABETH", "FERNANDEZ MONICA LILIANA", "ALTAMIRANO MIGUEL", "BENEDETTI ROMA", "BUFFINI DI CESARI DAYANA", "CRUZ ANGELA", "MORALES BETINA EMILCE", "SANCHEZ BELEN ALDANA", "SANCHEZ MARIA", "SANCHEZ ORLANDO", "JORGE RUBEN", "GUEVARA LILIANA LOURDES", "AVILA FABIAN", "DIAZ CARINA", "GENTILE CECILIA", "GOMEZ MARIA", "LIPARI VANESA SILVINA", "MAZARA DAVID DEPOSITO", "PALOMO JOHANA", "ARCE EDUARDO", "ZOPIOLO MICAELA", "VILLEGAS LAURA", "FUNES ELISA NOEMI", "GOMEZ PATRICIA", "FANIN VANESA", "ANTCHUL MIRTA BEATRIZ ANA", "SANCHEZ MEDINA GABRIEL DARIO", "MORALES MAURICIO NICOLAS", "BARRERA DIEGO", "OLGUIN JUANA", "FERREYRA MARIA FLORENCIA", "BAIGORRIA JOSE MANUEL", "AGUILERA CLAUDIA", "BLANES JUAN SEBASTIAN", "ZORRILLA MABEL", "CARMAGNANI EDITH MARGARITA", "CONSORCIO PROPIETARIOS B° PINAR", "PALACIOS SILVIA ELVIRA", "ANGLADA HILDA DEL CARMEN", "GUARDIA ANDREA LUISINA", "COMPLEJO EL OLIVO", "ROLDAN HAROLD", "KRAFLA SA", "SANCHEZ FEDERICO", "ROLDAN SANTIAGO", "PERALTA GERARDO", "ESCUDERO CLAUDIA", "NUEVAS RAICES S.A CASTIGLIA MARI", "GIL EUGENIA", "PETIOT ADRIANA", "DIAZ BELEN", "PEREIRA ALEJANDRA", "PEREIRA GLADYS ANA", "REYMOND SERGIO", "ROGGERONE HECTOR", "GRECO MAURICIO 2", "CONSORCIO B PRIV. PILAR", "MARON NICOLAS", "FERREYRA MARIEL", "A. S. & S. A.", "BAROCCHI CRISTIAN DARIO", "NALON PABLO 2", "ROLDAN HAROLD 2", "CONSOLINI LUCAS", "GONZALEZ LEONARDO SANTIAGO", "FERNANDO SEBASTIAN GONZALEZ"
];

async function run() {
  const notFound = [];
  const foundIds = [];
  try {
    const allClients = await prisma.client.findMany({ select: { id: true, name: true }});
    console.log("DB clients loaded", allClients.length);
    
    for (const searchName of clientNames) {
      const normSearch = searchName.toUpperCase().replace(/\s+/g, ' ').trim();
      const match = allClients.find(c => {
        const dbName = (c.name || '').toUpperCase().replace(/\s+/g, ' ').trim();
        return dbName.includes(normSearch) || normSearch.includes(dbName);
      });
      if (match) {
        foundIds.push({ id: match.id, searchName, dbName: match.name });
      } else {
        notFound.push(searchName);
      }
    }
    
    console.log(`--- FOUND: ${foundIds.length} ---`);
    console.log(`--- NOT FOUND: ${notFound.length} ---`);
    
    let paidCount = 0;
    
    for (let i = 0; i < foundIds.length; i++) {
      const client = foundIds[i];
      console.log(`Processing ${i+1}/${foundIds.length}: ${client.dbName}`);
      
      const pending = await prisma.invoice.findMany({
        where: { clientId: client.id, status: 'PENDING' }
      });
      console.log(` > Found ${pending.length} pending invoices for ${client.dbName}`);
      
      for (const inv of pending) {
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { status: 'PAID' }
        });
        
        await prisma.payment.create({
          data: {
            invoiceId: inv.id,
            method: 'MERCADOPAGO_VIEJO',
            amountPaid: inv.originalAmount,
            lateFeeApplied: 0
          }
        });
        paidCount++;
      }
    }
    
    console.log(`\nUpdated ${paidCount} invoices to PAID.`);
    if (notFound.length > 0) {
      console.log("\nNOT FOUND CLIENTS:");
      console.log(notFound.join("\n"));
    }
  } catch (err) {
    console.error("ERROR CAUGHT:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
