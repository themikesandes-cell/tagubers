FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma Client in the SAME container that will run the app.
RUN npx prisma generate
RUN npm run build

RUN mkdir -p /app/uploads /app/uploads/profiles
ENV UPLOAD_DIR=/app/uploads
ENV PROFILE_DIR=/app/uploads/profiles

EXPOSE 4000

CMD ["sh", "-c", "npx prisma generate && npx prisma db push --skip-generate && node dist/server.js"]
