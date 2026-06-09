const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const prisma = new PrismaClient();

function normalizeName(name) {
    if (!name) return "";
    return name.toLowerCase().replace(/[_,]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function run() {
    try {
        const filePath = 'C:\\Users\\MATIAS BRANDI\\Downloads\\Vialidad.xlsx';
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const data = xlsx.utils.sheet_to_json(worksheet);
        if (data.length === 0) {
            console.log("El Excel está vacío");
            return;
        }
        const keys = Object.keys(data[0]);
        const nameKey = keys.find(k => k.toLowerCase().includes('nombre')) || keys[0];
        const ipKey = keys.find(k => k.toLowerCase().includes('ip')) || keys[1];

        console.log(`Usando columnas: '${nameKey}' para Nombre y '${ipKey}' para IP`);

        const allClients = await prisma.client.findMany({
            select: { id: true, name: true, ipNumber: true, mainNode: true }
        });

        const notFound = [];
        let updatedCount = 0;

        for (const row of data) {
            const rawName = row[nameKey];
            const ip = row[ipKey];

            if (!rawName || !ip) continue;

            const normalizedRowName = normalizeName(rawName);

            // Find client in DB. We try exact match after normalization, then includes
            let client = allClients.find(c => normalizeName(c.name) === normalizedRowName);
            
            // If not found exactly, try partial match (e.g. "Adaro Raul" matches "Adaro Raul Eduardo")
            if (!client) {
                client = allClients.find(c => {
                    const dbName = normalizeName(c.name);
                    // allow match if one is a substring of another and length difference is not huge
                    return (dbName.includes(normalizedRowName) && normalizedRowName.length > 5) || 
                           (normalizedRowName.includes(dbName) && dbName.length > 5);
                });
            }

            if (client) {
                // Update
                await prisma.client.update({
                    where: { id: client.id },
                    data: {
                        ipNumber: String(ip).trim(),
                        mainNode: "vialidad"
                    }
                });
                updatedCount++;
                console.log(`[OK] Actualizado: ${client.name} (ID: ${client.id}) -> IP: ${ip}, Node: vialidad`);
            } else {
                notFound.push(rawName);
            }
        }

        console.log(`\n================================`);
        console.log(`🎉 Proceso completado. Se actualizaron ${updatedCount} clientes.`);
        console.log(`================================`);
        
        if (notFound.length > 0) {
            console.log(`\n❌ No se encontraron los siguientes clientes en la base de datos (${notFound.length}):`);
            notFound.forEach(n => console.log(` - ${n}`));
        } else {
            console.log("\n✅ Todos los clientes del Excel fueron encontrados y actualizados.");
        }

    } catch (error) {
        console.error("Error durante el proceso:", error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
