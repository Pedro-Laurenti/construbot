FROM node:24-alpine3.22 AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY . .

# BACKEND_URL é necessário em build-time pelo next.config.ts (rewrites)
ARG BACKEND_URL=http://localhost:8000
ENV BACKEND_URL=$BACKEND_URL

RUN mkdir -p public && npm run build

# ---- runner ----
FROM node:24-alpine3.22 AS runner

WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
