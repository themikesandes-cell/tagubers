#!/bin/sh
set -u

echo "Iniciando sincronização do schema Prisma em segundo plano..."
(
  while true; do
    if npx prisma db push --skip-generate; then
      echo "Schema Prisma sincronizado."
      break
    fi
    echo "PostgreSQL ainda não está disponível. Tentando novamente em 5s..."
    sleep 5
  done
) &

exec node dist/server.js
