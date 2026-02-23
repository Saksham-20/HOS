# Backend for TruckLog Pro (Node 20 LTS, Alpine for small image)
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

RUN chmod +x /app/scripts/docker-entrypoint.sh

USER node

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
