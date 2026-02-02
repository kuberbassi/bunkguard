# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and lock files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx config (optional, but good for SPA)
# We'll create a simple inline config or default for now, 
# but usually need one for React Router to work on refresh.
RUN echo 'server { \
    listen 80; \
    client_max_body_size 20M; \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    \
    location /assets/ { \
        try_files $uri =404; \
    } \
    \
    location ~ \.(js|css|png|jpg|jpeg|gif|ico|svg|json)$ { \
        try_files $uri =404; \
    } \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/ { \
        proxy_pass http://backend:5000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
