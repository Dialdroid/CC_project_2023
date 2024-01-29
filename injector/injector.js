const { connect } = require('nats');
const Minio = require('minio');
const crypto = require('crypto');

// Configurar cliente de MinIO
const minioClient = new Minio.Client({
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

// Función principal
(async () => {
  const nats = await connect({ servers: 'nats://nats:4222' });
  const sub = nats.subscribe('resultQueue');

  for await (const msg of sub) {
    const result = msg.data.toString();
    console.log(`Resultado recibido: ${result}`);

    const hash = crypto.createHash('sha256').update(result).digest('hex');
    await minioClient.putObject('hashes', `${hash}.txt`, Buffer.from(result));

    console.log(`Hash guardado en MinIO: ${hash}`);
  }
})();
