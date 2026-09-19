FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma Client during image build. DATABASE_URL is NOT required for generate.
RUN npx prisma generate
RUN npm run build

RUN mkdir -p /app/uploads/profiles
ENV UPLOAD_DIR=/app/uploads
ENV PROFILE_DIR=/app/uploads/profiles

EXPOSE 8080

# DATABASE_URL is supplied by Railway at runtime.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/server.js"]
