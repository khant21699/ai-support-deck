# Development image used by docker-compose. Production frontend is deployed on Vercel (no Docker needed).
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
