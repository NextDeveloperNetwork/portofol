# Stage 1: Build TypeScript
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY public ./public

# Ensure uploads directory exists
RUN mkdir -p /app/public/uploads

VOLUME ["/app/public/uploads"]

EXPOSE 3000

CMD ["node", "dist/server.js"]

