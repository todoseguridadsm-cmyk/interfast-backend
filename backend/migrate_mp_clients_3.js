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
  let paidCount = 0;
  try {
    for (const target of targetClients) {
      const client = await prisma.client.findUnique({
        where: { id: target.id },
        include: {
          invoices: {
            where: { status: 'PENDING' }
          }
        }
      });

      if (!client) {
        console.log(`[NOT FOUND] Client ID ${target.id} (${target.name})`);
        continue;
      }

      console.log(`\nProcessing client #${client.id}: ${client.name} (Pending Invoices: ${client.invoices.length})`);

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

        console.log(`  > Invoice #${inv.id} (${inv.month}/${inv.year}) | Base: $${inv.originalAmount} | Current: $${currentAmount} | LateFee: $${lateFeeApplied} | Cents: $${cents} | Total Paid: $${amountPaid}`);

        await prisma.invoice.update({
          where: { id: inv.id },
          data: { status: 'PAID' }
        });

        await prisma.payment.create({
          data: {
            invoiceId: inv.id,
            method: 'MERCADOPAGO',
            amountPaid: amountPaid,
            lateFeeApplied: lateFeeApplied
          }
        });

        await prisma.cutoffList.deleteMany({
          where: { invoiceId: inv.id }
        });

        paidCount++;
      }

      await prisma.client.update({
        where: { id: client.id },
        data: { status: 'ACTIVE' }
      });
    }

    console.log(`\nSuccessfully updated ${paidCount} invoices to PAID.`);
  } catch (err) {
    console.error("Error processing payments:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
