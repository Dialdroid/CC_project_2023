FROM node:14

RUN apt-get update && apt-get install -y zip

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "worker.js"]
