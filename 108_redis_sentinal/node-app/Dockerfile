FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
CMD ["node", "index.js"]


