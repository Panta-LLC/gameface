FROM node:20-alpine AS build
WORKDIR /workspace
COPY . .
RUN npm install --legacy-peer-deps
WORKDIR /workspace/apps/web

# Install workspace package devDependencies into apps/web/node_modules
# Run install from the package directory so npm finds the correct package.json
RUN npm install --legacy-peer-deps --include=dev

# Vite bakes env vars at build time. Passed as --build-arg by the deploy
# workflow from the DOMAIN repo secret; defaults are placeholders that won't
# actually work in production (but allow `docker build` to succeed in dev).
ARG VITE_API_URL=http://localhost:3000
ARG VITE_SIGNALING_URL=ws://localhost:3001
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SIGNALING_URL=${VITE_SIGNALING_URL}

WORKDIR /workspace/apps/web
RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
