FROM node:20-bookworm-slim

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

COPY artifacts/api-server ./artifacts/api-server
COPY lib ./lib
COPY tsconfig.base.json tsconfig.json ./

RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production
ENV UPLOAD_DIR=/app/uploads

RUN mkdir -p /app/uploads

EXPOSE 4000

CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
