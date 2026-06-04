const net = require('net');
const host = '7dd109d1d713.sn.mynetname.net';
const port = 8786;

console.log(`Connecting to ${host}:${port}...`);
const client = net.createConnection({ host, port }, () => {
  console.log(`Connected to ${host}:${port}!`);
  client.end();
});
client.on('error', (err) => {
  console.log(`Error ${port}:`, err.message);
});
