FROM node:22-alpine
RUN apk add --no-cache bash postgresql-client
RUN npm install -g pnpm@9
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN HUSKY=0 pnpm install --frozen-lockfile --config.unsafe-perm=true
COPY . .
RUN pnpm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]