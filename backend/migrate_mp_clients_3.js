const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const targetClients = [
  { id: 96, name: "SANCHEZ OSCAR" },
  { id: 41, name: "LASAR SANTIAGO" }, // LASAR JAVIER SANTIAGO
  { id: 195, name: "PETRI BRUNELA" },
  { id: 128, name: "VILLEGAS ELIANA" },
  { id: 205, name: "GONZALEZ FERNANDO SEBASTIAN" }
];

async function run() {
  let updatedCount = 0;
  try {
    for (const target of targetClients) {
      const client = await prisma.client.findUnique({
        where: { id: target.id },
        include: {
          invoices: {
            where: {
              month: 7,
              year: 2026
            },
            include: {
              payments: true
            }
          }
        }
      });

      if (!client) {
        console.log(`[NOT FOUND] Client ID ${target.id} (${target.name})`);
        continue;
      }

      console.log(`\nProcessing client #${client.id}: ${client.name}`);

      for (const inv of client.invoices) {
        const today = new Date();
        const d1 = inv.dueDate1 ? new Date(inv.dueDate1) : null;
        const d2 = inv.dueDate2 ? new Date(inv.dueDate2) : null;
        const d3 = inv.dueDate3 ? new Date(inv.dueDate3) : null;

        let currentAmount = inv.originalAmount;
        if (d3 && today > d3 && inv.priceV4) {
          currentAmount = inv.priceV4;
        } else if (d2 && today > d2 && inv.priceV3) {
          currentAmount = inv.priceV3;
        } else if (d1 && today > d1 && inv.priceV2) {
          currentAmount = inv.priceV2;
        } else if (inv.priceV1) {
          currentAmount = inv.priceV1;
        }

        const lateFeeApplied = parseFloat((currentAmount - inv.originalAmount).toFixed(2));
        const cents = ((client.id % 99) + 1) / 100;
        const amountPaid = parseFloat((currentAmount + cents).toFixed(2));
        const mpTax = parseFloat((amountPaid * 0.006).toFixed(2)); // 0.6% Impuesto Ley 25.413 (Créditos y Débitos)

        console.log(`  > Invoice #${inv.id} (${inv.month}/${inv.year}) | Total Paid: $${amountPaid} | Impuesto (0.6%): $${mpTax} | Neto recibido: $${(amountPaid - mpTax).toFixed(2)}`);

        await prisma.invoice.update({
          where: { id: inv.id },
          data: { status: 'PAID' }
        });

        if (inv.payments && inv.payments.length > 0) {
          for (const payment of inv.payments) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                mpTax: mpTax,
                lateFeeApplied: lateFeeApplied
              }
            });
            console.log(`    Updated Payment #${payment.id} -> mpTax: $${mpTax}`);
          }
        } else {
          await prisma.payment.create({
            data: {
              invoiceId: inv.id,
              method: 'MERCADOPAGO',
              amountPaid: amountPaid,
              lateFeeApplied: lateFeeApplied,
              mpTax: mpTax
            }
          });
          console.log(`    Created Payment with mpTax: $${mpTax}`);
        }

        await prisma.cutoffList.deleteMany({
          where: { invoiceId: inv.id }
        });

        updatedCount++;
      }

      await prisma.client.update({
        where: { id: client.id },
        data: { status: 'ACTIVE' }
      });
    }

    console.log(`\nSuccessfully updated ${updatedCount} invoices and applied 0.6% Impuesto a Créditos y Débitos (mpTax).`);
  } catch (err) {
    console.error("Error processing payments:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
