# Controle de Visitas & Uber

MVP full-stack para registro, aprovação e relatório de despesas de deslocamento.

## Estrutura

- `frontend/` — React + Vite + TypeScript
- `backend/` — Node.js + Express + TypeScript + Prisma
- PostgreSQL — Railway ou outro Postgres compatível
- Uploads — diretório persistente no backend (`/app/uploads` em produção)

## Rodar localmente

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:push
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:4000`

Admin inicial (criado automaticamente no primeiro start, via variáveis de ambiente):
- e-mail: `admin@empresa.com`
- senha: `Admin@123456`

Troque a senha imediatamente em ambiente real.

## Deploy no Railway

Use um único repositório GitHub com dois serviços independentes. O Railway suporta monorepos isolados configurando o Root Directory de cada serviço. citeturn972360search0

### 1. Banco

No projeto Railway, adicione um PostgreSQL. O Railway fornece `DATABASE_URL` automaticamente para os serviços que forem conectados ao banco. citeturn972360search1

### 2. Backend

Crie um serviço apontando para este GitHub e configure:

- Root Directory: `/backend`
- Start Command: `npm run start`
- Build Command: `npm run build`

Variáveis:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=troque-por-uma-chave-grande-e-secreta
CORS_ORIGIN=https://SEU-FRONTEND.up.railway.app
PORT=4000
UPLOAD_DIR=/app/uploads
ADMIN_EMAIL=admin@empresa.com
ADMIN_PASSWORD=Admin@123456
```

Depois, crie um volume no backend montado em `/app/uploads`. Volumes mantêm os comprovantes entre deploys; arquivos no filesystem comum do serviço são efêmeros. citeturn972360search3turn972360search8

### 3. Frontend

Crie um segundo serviço no mesmo projeto/repositório:

- Root Directory: `/frontend`
- Build Command: `npm run build`
- Start Command: `npm run start`

Variáveis:

```env
VITE_API_URL=https://SEU-BACKEND.up.railway.app/api
```

### 4. Domínio

Gere domínios do Railway para frontend e backend, ou conecte seu domínio próprio. O Railway oferece networking e domínios por serviço. citeturn972360search7

## Observações importantes

Este MVP usa `prisma db push` no start para simplificar a primeira instalação; para evolução de schema em produção crítica, prefira Prisma Migrate. Antes de colocar em produção crítica, migre para Prisma Migrate, configure backups do PostgreSQL e considere Storage S3/R2 para grande volume de comprovantes.

O upload aceita JPG, PNG e PDF e foi preparado para celular com câmera/galeria por meio de `<input type="file" accept="image/*,application/pdf" capture="environment">`.


## Deploy no Railway (monorepo)

Crie 3 serviços no mesmo projeto: `Backend`, `Frontend` e `PostgreSQL`.

- Backend → **Root Directory:** `/backend`
- Frontend → **Root Directory:** `/frontend`
- Backend → `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- Backend → adicione um **Volume** montado em `/app/uploads` para persistir comprovantes e fotos de perfil.

O backend usa `prisma generate && tsc` no build e o CLI do Prisma está nas dependências de produção para o comando de inicialização.


## Railway — configuração atual

Este repositório é um monorepo. Crie três serviços no mesmo projeto Railway:

- **Backend**: Root Directory `/backend`
- **Frontend**: Root Directory `/frontend`
- **PostgreSQL**: banco do projeto

No Backend, use as variáveis `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `PORT`. O backend inicia o HTTP imediatamente em `0.0.0.0` e tenta conectar/sincronizar o banco em segundo plano.

Para persistir os comprovantes e fotos, adicione um Volume ao Backend montado em `/app/uploads`.


### Backend simplificado
A imagem do backend agora usa um único estágio Docker. O Prisma Client é gerado dentro do mesmo container que executa a API, evitando o erro `@prisma/client did not initialize yet`.
