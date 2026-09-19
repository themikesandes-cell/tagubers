# Controle de Visitas & Uber

Monorepo para Railway:
- `/backend`: API Node.js + Express + Prisma + PostgreSQL
- `/frontend`: React + Vite

## Railway
Crie 3 serviços no mesmo projeto:
1. PostgreSQL
2. Backend com Root Directory `/backend`
3. Frontend com Root Directory `/frontend`

O backend usa o CMD do próprio Dockerfile. Não é necessário `start.sh` nem `railway.toml` no backend.
