FROM node:24.13.0-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
ARG PUBLIC_WEB_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=$NEXT_PUBLIC_GOOGLE_AUTH_ENABLED
ENV PUBLIC_WEB_URL=$PUBLIC_WEB_URL

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

WORKDIR /workspace
COPY . .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile && \
    pnpm --filter @backlog-syntax/contracts build && \
    pnpm --filter @backlog-syntax/web build

FROM node:24.13.0-bookworm-slim AS runtime

ARG PUBLIC_WEB_URL
ENV PUBLIC_WEB_URL=$PUBLIC_WEB_URL
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app
COPY --from=build --chown=node:node /workspace/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /workspace/apps/web/public ./apps/web/public

# Next writes optimized images under .next/cache. The standalone output does not
# ship that directory, so create it here.
RUN mkdir -p apps/web/.next/cache && chown -R node:node apps/web/.next/cache

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Fail closed at boot instead of hanging at runtime. When .next/cache is not
# writable the image optimizer rejects unhandled and never answers the request,
# so every WebP-capable browser waits forever on /_next/image while health
# checks stay green. A hardened read-only root filesystem must mount a writable
# volume or tmpfs at that path.
CMD ["sh", "-c", "node -e \"const fs=require('node:fs'),d='apps/web/.next/cache';try{fs.mkdirSync(d,{recursive:true});fs.writeFileSync(d+'/.probe','');fs.unlinkSync(d+'/.probe')}catch(e){console.error('FATAL: '+d+' must be writable; Next image optimization hangs otherwise ('+e.code+')');process.exit(1)}\" && exec node apps/web/server.js"]
