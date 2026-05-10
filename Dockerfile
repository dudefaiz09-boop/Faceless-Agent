# Stage 1: Build the frontend
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN touch firebase-applet-config.json

# Stage 2: Production runtime
FROM node:20-slim
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies only
COPY package*.json ./
RUN npm install --only=production --legacy-peer-deps

# Copy built assets and necessary server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/firebase-applet-config.json ./
COPY --from=builder /app/tsconfig.json ./

# Expose port
EXPOSE 8080

# Start the application using tsx
CMD ["npm", "start"]
