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
COPY package.json pnpm-lock.yaml ./
# pnpm 10+ refuses to run dependency build scripts unless explicitly allowed.
# These four need their postinstall: esbuild fetches its native binary, sharp
# builds image bindings, vue-demi switches to Vue 3 mode, @parcel/watcher
# fetches its native watcher. --allow-build approves them at install time
# without depending on package.json or lockfile metadata being in sync.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile \
      --allow-build="@parcel/watcher" \
      --allow-build=esbuild \
      --allow-build=sharp \
      --allow-build=vue-demi
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
