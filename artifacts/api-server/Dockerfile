FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json .npmrc ./
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY artifacts/arch-saas/package.json ./artifacts/arch-saas/package.json
COPY lib/db/package.json ./lib/db/package.json
COPY lib/api-client-react/package.json ./lib/api-client-react/package.json
COPY lib/api-spec/package.json ./lib/api-spec/package.json
COPY lib/api-zod/package.json ./lib/api-zod/package.json
COPY scripts/package.json ./scripts/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY artifacts/api-server ./artifacts/api-server
COPY lib ./lib
COPY tsconfig.base.json tsconfig.json ./
RUN pnpm --filter @workspace/api-server run build

FROM build AS runtime
ENV NODE_ENV=production
RUN mkdir -p /app/uploads
EXPOSE 4000
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
