# Stage 1: Build frontend
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app/websites_playground

COPY websites_playground/package.json websites_playground/package-lock.json* ./
RUN npm ci
COPY websites_playground/ ./
RUN npm run build

# Stage 2: Runtime (Python backend + nginx + static frontend)
FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends nginx && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend
COPY website_playground_server/requirements.txt website_playground_server/
RUN pip install --no-cache-dir -r website_playground_server/requirements.txt
COPY website_playground_server/ website_playground_server/

# Frontend (built)
COPY --from=frontend-build /app/websites_playground/build /app/websites_playground/build

# Nginx: serve static + proxy /api to backend
COPY nginx.conf /etc/nginx/sites-available/default
RUN ln -sf /dev/stdout /var/log/nginx/access.log && ln -sf /dev/stderr /var/log/nginx/error.log

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000 8089

ENTRYPOINT ["/docker-entrypoint.sh"]
