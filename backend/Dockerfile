FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
RUN mkdir -p /app/uploads
ENV UPLOAD_DIR=/app/uploads
ENV PROFILE_DIR=/app/profiles
RUN mkdir -p /app/uploads /app/profiles
EXPOSE 4000
CMD ["node", "dist/server.js"]
