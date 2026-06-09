const net = require('net');
const host = '94c30ae30743.sn.mynetname.net';
const port = 8787;

console.log(`Intentando conectar a ${host}:${port}...`);
const socket = new net.Socket();
socket.setTimeout(5000);

socket.on('connect', () => {
    console.log(`✅ Conexión exitosa a ${host}:${port}`);
    socket.destroy();
});

socket.on('timeout', () => {
    console.log(`⏳ Tiempo de espera agotado (Timeout) al conectar a ${host}:${port}`);
    socket.destroy();
});

socket.on('error', (err) => {
    console.log(`❌ Error de conexión a ${host}:${port} - ${err.message}`);
});

socket.connect(port, host);
