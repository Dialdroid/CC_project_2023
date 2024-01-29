const { connect } = require('nats');
const { createClient } = require('redis');
const Minio = require('minio');
const { exec } = require('child_process');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configurar cliente de Redis
const redisClient = createClient({ url: 'redis://redis:6379' });
redisClient.connect().catch(err => {
    console.error(`Error al conectar con Redis: ${err.message}`);
});

// Configurar cliente de MinIO
const minioClient = new Minio.Client({
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

// Función para verificar y crear bucket si no existe
async function checkAndCreateBucket(bucketName) {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`Bucket '${bucketName}' creado exitosamente.`);
    }
  } catch (error) {
    console.error(`Error al verificar o crear el bucket: ${error.message}`);
    throw error;
  }
}

// Función para clonar y comprimir el repositorio
async function cloneAndZip(repoUrl) {
  try {
    await redisClient.set('worker-status', 'working');
    const repoName = repoUrl.split('/').pop().split('.').shift();

    // Asegurarse de que el bucket 'repositorios' exista
    await checkAndCreateBucket('repositorios');

    const cloneCmd = `git clone ${repoUrl}`;
    const zipCmd = `zip -r ${repoName}.zip ${repoName}`;

    exec(cloneCmd, async (cloneError, cloneStdout, cloneStderr) => {
      if (cloneError) {
        console.error(`Error al clonar el repositorio: ${cloneError.message}`);
        console.error(cloneStderr);
        await redisClient.set('worker-status', 'error');
        return;
      }

      console.log(`Repositorio ${repoName} clonado exitosamente.`);
      console.log(cloneStdout);

      exec(zipCmd, async (zipError, zipStdout, zipStderr) => {
        if (zipError) {
          console.error(`Error al comprimir el repositorio: ${zipError.message}`);
          console.error(zipStderr);
          await redisClient.set('worker-status', 'error');
          return;
        }

        console.log(`Repositorio ${repoName} comprimido exitosamente.`);
        console.log(zipStdout);

        const file = fs.createReadStream(`${repoName}.zip`);
        await minioClient.putObject('repositorios', `${repoName}.zip`, file);

        await redisClient.set('worker-status', 'success');
      });
    });
  } catch (error) {
    console.error(`Error en el proceso: ${error.message}`);
    await redisClient.set('worker-status', 'error');
  }
}

// Función principal
(async () => {
  const nats = await connect({ servers: 'nats://nats:4222' });
  const sub = nats.subscribe('workQueue');

  for await (const msg of sub) {
    const repoUrl = msg.data.toString();
    console.log(`Mensaje recibido en workQueue: ${repoUrl}`);
    await redisClient.set('worker-status', 'free');
    
    await cloneAndZip(repoUrl);
  }
})();
