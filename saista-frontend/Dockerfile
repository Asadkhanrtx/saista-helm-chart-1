# Build stage — compile React app
FROM node:16-alpine AS build

WORKDIR /app

# Install deps first (layer cache)
COPY src/package*.json ./
RUN npm install

# Copy all React source (src/, public/, etc.)
COPY src/ .
RUN npm run build

# Production stage — serve with Nginx
FROM nginx:alpine

# SPA-only nginx config (no proxy — Gateway API handles routing)
COPY src/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled React build
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
