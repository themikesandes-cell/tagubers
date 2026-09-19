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
ENV PROFILE_DIR=/app/uploads/profiles
RUN mkdir -p /app/uploads/profiles
EXPOSE 4000
COPY start.sh ./start.sh
RUN chmod +x ./start.sh
CMD ["./start.sh"]
