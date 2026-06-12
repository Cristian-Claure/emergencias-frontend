# 1. Instalar dependencias solo cuando sea necesario
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar archivos de definición de paquetes
COPY package*.json ./
RUN npm ci

# 2. Reconstruir el código fuente solo cuando sea necesario
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Add build arguments for Next.js environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# Desactivar telemetría de Next.js durante la compilación
ENV NEXT_TELEMETRY_DISABLED=1

# Compilar Next.js con soporte standalone
RUN npm run build

# 3. Imagen de producción para correr el servidor
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Crear un usuario de sistema y grupo para seguridad (no ejecutar como root)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos públicos y el build optimizado standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

# server.js es generado automáticamente por Next.js standalone
CMD ["node", "server.js"]
