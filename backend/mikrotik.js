const { RouterOSClient } = require('routeros-client');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function connectToMikrotik(nodeName) {
  if (!nodeName) {
    throw new Error('El nombre del nodo (mainNode) es requerido para conectarse al Mikrotik.');
  }

  const node = await prisma.node.findUnique({
    where: { name: nodeName }
  });

  if (!node) {
    throw new Error(`El nodo '${nodeName}' no está registrado en el sistema. Asegúrese de agregarlo en la pestaña Nodos.`);
  }

  if (!node.isActive) {
    throw new Error(`El nodo '${nodeName}' está desactivado.`);
  }

  const client = new RouterOSClient({
    host: node.host,
    port: node.port,
    user: node.user,
    password: node.password,
    timeout: 10000 // 10 segundos de timeout
  });

  const api = await client.connect();
  return { client, api };
}

/**
 * Agrega una IP a la lista de morosos (cortados) en Mikrotik.
 * @param {string} ipAddress - La IP estática del cliente
 * @param {string} listName - El nombre de la Address List (por defecto 'Morosos')
 */
async function addIpToCutoffList(ipAddress, nodeName, listName = 'Morosos', comment = 'Corte Automático CRM') {
  let client = null;
  try {
    const conn = await connectToMikrotik(nodeName);
    client = conn.client;
    const api = conn.api.menu('/ip/firewall/address-list');

    // Revisar si la IP ya está en la lista
    const existing = await api.where('address', ipAddress).where('list', listName).get();
    
    if (existing.length === 0) {
      await api.add({
        list: listName,
        address: ipAddress,
        comment: comment
      });
      console.log(`✅ Mikrotik: IP ${ipAddress} agregada a la lista '${listName}' exitosamente.`);
    } else {
      console.log(`ℹ️ Mikrotik: La IP ${ipAddress} ya se encontraba en la lista '${listName}'.`);
    }
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    console.error(`❌ Mikrotik Error al agregar IP ${ipAddress}:`, msg);
    throw err;
  } finally {
    if (client) {
      client.close();
    }
  }
}

/**
 * Elimina una IP de la lista de morosos (restaura el servicio) en Mikrotik.
 * @param {string} ipAddress - La IP estática del cliente
 * @param {string} listName - El nombre de la Address List (por defecto 'Morosos')
 */
async function removeIpFromCutoffList(ipAddress, nodeName, listName = 'Morosos') {
  let client = null;
  try {
    const conn = await connectToMikrotik(nodeName);
    client = conn.client;
    const api = conn.api.menu('/ip/firewall/address-list');

    // Buscar el registro de la IP en la lista
    const records = await api.where('address', ipAddress).where('list', listName).get();
    
    if (records.length > 0) {
      // Eliminar por su .id
      for (const record of records) {
        await api.remove(record['.id']);
      }
      console.log(`✅ Mikrotik: IP ${ipAddress} eliminada de la lista '${listName}' exitosamente. Servicio restaurado.`);
    } else {
      console.log(`ℹ️ Mikrotik: La IP ${ipAddress} no estaba en la lista '${listName}', nada que remover.`);
    }
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    console.error(`❌ Mikrotik Error al remover IP ${ipAddress}:`, msg);
    throw err;
  } finally {
    if (client) {
      client.close();
    }
  }
}

module.exports = {
  addIpToCutoffList,
  removeIpFromCutoffList,
  connectToMikrotik
};
