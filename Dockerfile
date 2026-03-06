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
# Copy built frontend
COPY --from=build /app/dist ./dist
# Setup backend
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/index.js ./
# Environment variables can be injected at runtime
EXPOSE 80
CMD ["node", "index.js"]
