# 1) Compila el frontend
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) Lo sirve con nginx, que además reenvía /api al backend
FROM nginx:alpine
# Valores para docker compose; en Render se sobrescriben con variables de entorno
ENV PORT=80 \
    API_UPSTREAM=http://backend:8000 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
