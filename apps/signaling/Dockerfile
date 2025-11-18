FROM node:20-alpine AS build
WORKDIR /workspace

# Copy full repo so root-level deps and shared packages resolve
COPY . .
RUN npm install --legacy-peer-deps

WORKDIR /workspace/apps/signaling
RUN npm run build
# tsc in a monorepo may emit files nested under dist/.../src — flatten them
RUN if [ -d dist/apps/signaling/src ]; then cp -R dist/apps/signaling/src/* dist/ || true; fi

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/signaling/dist ./dist
COPY --from=build /workspace/apps/signaling/package.json ./package.json
EXPOSE 3001
CMD ["node", "dist/index.js"]
