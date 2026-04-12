FROM node:22-alpine
RUN apk add --no-cache bash postgresql-client
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]