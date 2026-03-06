# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
# Copiamos la web construida
COPY --from=build /app/dist ./dist
# Copiamos el servidor directamente a /app
COPY server/package*.json ./
RUN npm install --only=production
COPY server/index.js ./
# El servidor ahora estará en /app/index.js y la web en /app/dist
EXPOSE 3000
CMD ["node", "index.js"]
