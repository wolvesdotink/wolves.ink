# syntax=docker/dockerfile:1.7

# Debian-based images keep prebuilt native binaries working out of the box
# (@resvg/resvg-js, @takumi-rs/core, @tailwindcss/oxide). Alpine/musl would
# force a from-source rebuild and balloon image size + build time.
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
# pnpm-workspace.yaml carries the allowBuilds allowlist (pnpm 11 blocks
# dependency lifecycle scripts unless they are listed there).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
USER node
CMD ["node", ".output/server/index.mjs"]
