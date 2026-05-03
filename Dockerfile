# Stage 1: Build the frontend
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:20-slim
WORKDIR /app

# Install dependencies (including tsx)
COPY package*.json ./
RUN npm install

# Copy built assets and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/firebase-applet-config.json ./
COPY --from=builder /app/tsconfig.json ./

# Expose port
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
