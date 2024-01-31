const NATS = require('nats');

async function connectToNats() {
  try {
    const natsConnection = await NATS.connect({ servers: "nats://nats:4222" });
    console.log('Observer conectado a NATS');

    // Variables de estado para el control de escalado
    let currentWorkers = 0;
    const MAX_WORKERS = 10;
    const MIN_WORKERS = 1;
    const SCALE_UP_THRESHOLD = 5;
    const SCALE_DOWN_THRESHOLD = 1;

    // Monitorear la longitud de la cola de trabajos
    setInterval(async () => {
      const jobQueueLength = await getJobQueueLength();

      if (jobQueueLength > SCALE_UP_THRESHOLD && currentWorkers < MAX_WORKERS) {
        scaleUp();
      } else if (jobQueueLength <= SCALE_DOWN_THRESHOLD && currentWorkers > MIN_WORKERS) {
        scaleDown();
      }
    }, 1000);

    // Funciones scaleUp y scaleDown
    function scaleUp() {
      currentWorkers++;
      natsConnection.publish('cola.escalado', JSON.stringify({ action: 'scale_up' }));
      console.log(`Escalar hacia arriba, ahora hay ${currentWorkers} trabajadores.`);
    }

    function scaleDown() {
      currentWorkers--;
      natsConnection.publish('cola.escalado', JSON.stringify({ action: 'scale_down' }));
      console.log(`Escalar hacia abajo, ahora hay ${currentWorkers} trabajadores.`);
    }

    // Función simulada para obtener la longitud de la cola de trabajos
    async function getJobQueueLength() {
      return Math.floor(Math.random() * 10);
    }

    natsConnection.on('error', (err) => {
      console.error('Error en la conexión NATS:', err);
    });

  } catch (err) {
    console.error('Error al conectar con NATS:', err);
  }
}

connectToNats();
