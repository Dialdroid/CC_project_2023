# Dockerfile (Guardar como ./observer/Dockerfile)
FROM node:14

# Crea el directorio de la app
WORKDIR /usr/src/observer

# Instala las dependencias de la app
COPY package*.json ./
RUN npm install

# Copia los archivos de la app
COPY . .

# Expone el puerto que el observer usará
EXPOSE 4000

# Comando para correr la app
CMD [ "node", "observer.js" ]
