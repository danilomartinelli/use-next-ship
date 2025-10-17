FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS deps

RUN apt-get update && apt-get -y --no-install-recommends install \
    openssl

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS builder

ARG NEXT_PUBLIC_BASE_URL
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM base AS runner

RUN apt-get update && apt-get -y --no-install-recommends install \
    curl \
    ca-certificates

ENV PID1_VERSION=0.1.3.1
RUN curl -sSL "https://github.com/fpco/pid1/releases/download/v${PID1_VERSION}/pid1" -o /sbin/pid1 && \
    chown root:root /sbin/pid1 && \
    chmod +x /sbin/pid1

COPY docker-entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

ENV HOME=/home/nextjs

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/drizzle ./drizzle


EXPOSE 8000
CMD [ "pnpm", "start" ]
