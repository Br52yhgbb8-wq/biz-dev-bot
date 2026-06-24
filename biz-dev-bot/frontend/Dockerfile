FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Build for production
RUN NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm build

# Production stage
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

RUN npm install -g pnpm@latest && pnpm install --frozen-lockfile --prod

EXPOSE 3000

CMD ["pnpm", "start"]
