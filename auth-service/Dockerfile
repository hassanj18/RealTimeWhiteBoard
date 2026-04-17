# Use lightweight Node image
FROM node:18-alpine AS build

# Create app directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci

# Copy rest of code
COPY . .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Expose port
EXPOSE 3001

# Start app
CMD ["node", "dist/infrastructure/server.js"]x 