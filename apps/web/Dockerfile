FROM node:20-alpine AS build
WORKDIR /workspace
COPY . .
RUN npm install --legacy-peer-deps
WORKDIR /workspace/apps/web

# Install workspace package devDependencies into apps/web/node_modules
# Run install from the package directory so npm finds the correct package.json
RUN npm install --legacy-peer-deps --include=dev

WORKDIR /workspace/apps/web
RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
