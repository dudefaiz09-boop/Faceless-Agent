# Production Runtime
FROM node:20-slim
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies only
COPY package*.json ./
RUN npm install --only=production --legacy-peer-deps

# Copy all files (including pre-built dist/ folder from CI)
COPY . .

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
