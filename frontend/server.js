const express = require('express');
const { connect } = require('nats');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;

// Configura Express para servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

// Permite parseo de cuerpos de solicitud JSON
app.use(express.json());

// Ruta POST modificada para '/submit-repo'
app.post('/submit-repo', async (req, res) => {
  const { repoUrl } = req.body;
  const nats = await connect({ servers: 'nats://nats:4222' });
  nats.publish('workQueue', repoUrl);
  res.json({ message: 'URL del repositorio enviada!' });
});

io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado');
});

// Escuchar la cola de resultados de NATS y enviar mensajes a través de WebSockets
(async () => {
  const nats = await connect({ servers: 'nats://nats:4222' });
  const sub = nats.subscribe('resultQueue');

  for await (const msg of sub) {
    const result = msg.data.toString();
    io.emit('result', result);
  }
})();

server.listen(port, () => {
  console.log(`Frontend escuchando en http://localhost:${port}`);
});
