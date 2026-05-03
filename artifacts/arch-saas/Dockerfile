FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN npm install -g pnpm@10.33.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json .npmrc ./
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY artifacts/arch-saas/package.json ./artifacts/arch-saas/package.json
COPY lib/api-client-react/package.json ./lib/api-client-react/package.json
COPY lib/api-spec/package.json ./lib/api-spec/package.json
COPY lib/api-zod/package.json ./lib/api-zod/package.json
COPY lib/db/package.json ./lib/db/package.json
COPY scripts/package.json ./scripts/package.json

RUN pnpm install --frozen-lockfile

COPY artifacts/arch-saas ./artifacts/arch-saas
COPY lib ./lib
COPY tsconfig.base.json tsconfig.json ./

ENV NODE_ENV=production
ENV BASE_PATH=/

RUN pnpm --filter @workspace/arch-saas run build

FROM nginx:1.27-alpine

COPY artifacts/arch-saas/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/artifacts/arch-saas/dist/public /usr/share/nginx/html

EXPOSE 80
