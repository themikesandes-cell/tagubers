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


## Railway + MySQL

Este projeto usa Prisma com MySQL. No Railway, crie um serviço MySQL e, no serviço do Backend, adicione uma Reference Variable chamada `DATABASE_URL` apontando para `MySQL.DATABASE_URL`. Se o nome do serviço for diferente, use o nome exato do serviço, por exemplo `${{MySQL.DATABASE_URL}}`.

O Backend escuta a porta fornecida pelo Railway (`PORT`) e executa `prisma db push --skip-generate` antes de iniciar a API.
