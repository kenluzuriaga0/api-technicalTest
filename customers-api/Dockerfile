FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

# Nota: Asegúrate de tener el script "start" en tu package.json o usa "node index.js"
CMD ["npm", "start"]