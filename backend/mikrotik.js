const { RouterOSClient } = require('routeros-client');

async function connectToMikrotik() {
  const host = process.env.MIKROTIK_HOST || 'a7e009d5e5ce.sn.mynetname.net';
  const port = process.env.MIKROTIK_PORT ? parseInt(process.env.MIKROTIK_PORT) : 8293;
  const user = process.env.MIKROTIK_USER;
  const password = process.env.MIKROTIK_PASSWORD;

  if (!user || !password) {
    throw new Error('Las credenciales de Mikrotik (MIKROTIK_USER, MIKROTIK_PASSWORD) no están configuradas en el entorno (.env).');
  }

  const client = new RouterOSClient({
    host: host,
    port: port,
    user: user,
    password: password,
    timeout: 10000 // 10 segundos de timeout
  });

  await client.connect();
  return client;
}

/**
 * Agrega una IP a la lista de morosos (cortados) en Mikrotik.
 * @param {string} ipAddress - La IP estática del cliente
 * @param {string} listName - El nombre de la Address List (por defecto 'Morosos')
 */
async function addIpToCutoffList(ipAddress, listName = 'Morosos', comment = 'Corte Automático CRM') {
  let client = null;
  try {
    client = await connectToMikrotik();
    const api = client.menu('/ip/firewall/address-list');

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
    console.error(`❌ Mikrotik Error al agregar IP ${ipAddress}:`, err.message);
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
async function removeIpFromCutoffList(ipAddress, listName = 'Morosos') {
  let client = null;
  try {
    client = await connectToMikrotik();
    const api = client.menu('/ip/firewall/address-list');

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
    console.error(`❌ Mikrotik Error al remover IP ${ipAddress}:`, err.message);
    throw err;
  } finally {
    if (client) {
      client.close();
    }
  }
}

module.exports = {
  addIpToCutoffList,
  removeIpFromCutoffList
};
