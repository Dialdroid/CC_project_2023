const axios = require('axios');
const Minio = require('minio');

// Configura el cliente MinIO
const minioClient = new Minio.Client({
    endPoint: 'minio',
    port: 9000,
    useSSL: false,
    accessKey: 'minio',
    secretKey: 'minio123'
  });

// Configuración de JokeAPI
const JOKE_API_URL = 'https://v2.jokeapi.dev/joke/Any';
const BUCKET_NAME = 'chistes';

async function createBucketIfNotExists(bucketName) {
    try {
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            console.log(`Bucket '${bucketName}' no existe. Creando...`);
            await minioClient.makeBucket(bucketName, 'us-east-1');
            console.log(`Bucket '${bucketName}' creado exitosamente.`);
        }
    } catch (error) {
        console.error('Error al verificar o crear el bucket:', error);
        throw error; // Lanza el error para manejarlo en la función principal
    }
}

async function fetchJoke() {
    try {
        // Verificar si el bucket existe, si no, crearlo
        await createBucketIfNotExists(BUCKET_NAME);

        // Obtener un chiste de JokeAPI
        const response = await axios.get(JOKE_API_URL);
        const jokeData = response.data;
        
        // Convertir los datos a string para almacenamiento
        const jokeDataString = JSON.stringify(jokeData);

        // Guardar en MinIO
        const objectName = `joke-${Date.now()}.json`;
        const stream = Buffer.from(jokeDataString, 'utf-8');
        minioClient.putObject(BUCKET_NAME, objectName, stream, function(error, etag) {
            if (error) {
                return console.log(error);
            }
            console.log('Chiste almacenado con éxito en MinIO', etag);
        });
    } catch (error) {
        console.error('Error al obtener o almacenar el chiste:', error);
    }
}

// Programa el injector para ejecutarse periódicamente
setInterval(fetchJoke, 3600000); // Ejecutar cada hora

// Iniciar la primera ejecución
fetchJoke();
