# Stage 1: Build TypeScript and prepare production dependencies
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

# Remove development dependencies, retaining only production modules
RUN npm prune --omit=dev

# Stage 2: Minimal Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy production node_modules and compiled output from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
COPY public ./public

# Ensure uploads directory exists
RUN mkdir -p /app/public/uploads

VOLUME ["/app/public/uploads"]

EXPOSE 3000

CMD ["node", "dist/server.js"]
