FROM node:24.13.0-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

WORKDIR /workspace
COPY . .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile && \
    pnpm --filter @backlog-syntax/contracts build && \
    pnpm --filter @backlog-syntax/api build && \
    pnpm --filter @backlog-syntax/api deploy --prod --legacy /opt/api

FROM node:24.13.0-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=8787

WORKDIR /app
COPY --from=build --chown=node:node /opt/api ./

USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/src/server.js"]
