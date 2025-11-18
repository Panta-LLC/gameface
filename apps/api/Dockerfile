FROM node:20-alpine AS build
WORKDIR /workspace

# Copy the whole repository into the build image so workspace installs
# and shared packages resolve correctly for TypeScript builds.
COPY . .

RUN npm install --legacy-peer-deps

WORKDIR /workspace/apps/api
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Copy only the runtime artifacts into a small runtime image
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/dist ./dist
COPY --from=build /workspace/apps/api/package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/index.js"]
