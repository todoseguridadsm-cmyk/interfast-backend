const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const restoreEndpoint = \
app.post('/api/cutoffs/restore', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No se enviaron IDs válidos' });
    }

    let successCount = 0;
    for (const cutoffId of ids) {
      const cutoff = await prisma.cutoffList.findUnique({
        where: { id: cutoffId },
        include: { client: true }
      });
      
      if (cutoff && cutoff.client) {
        try {
          await prisma.client.update({
            where: { id: cutoff.clientId },
            data: { status: 'ACTIVE' }
          });
          await prisma.invoice.updateMany({
            where: { clientId: cutoff.clientId, status: 'PENDING' },
            data: { status: 'PAID' }
          });
          await prisma.cutoffList.update({
            where: { id: cutoff.id },
            data: { status: 'RESOLVED' }
          });
          if (cutoff.client.ipNumber && cutoff.client.mainNode) {
            await mikrotik.removeIpFromCutoffList(cutoff.client.ipNumber, cutoff.client.mainNode);
          }
          successCount++;
        } catch (err) {
          console.error(\Error restaurando servicio para IP \:\, err);
        }
      }
    }
    res.json({ message: \Servicio restaurado y facturas marcadas como pagadas para \ clientes.\ });
  } catch (error) {
    res.status(500).json({ error: 'Error restaurando los servicios' });
  }
});
\;

if (!code.includes('/api/cutoffs/restore')) {
  code = code.replace(
    /app\.post\('\/api\/cutoffs\/execute', async \(req, res\) => \{[\s\S]*?\}\);/,
    match => match + '\n\n' + restoreEndpoint
  );
  fs.writeFileSync('index.js', code, 'utf8');
  console.log('Restore endpoint added.');
} else {
  console.log('Restore endpoint already exists.');
}
