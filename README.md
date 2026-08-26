# job-hunter

Bootstrap técnico de um sistema pessoal para buscar e priorizar vagas de emprego.

## Requisitos

- Node.js 20+
- PostgreSQL 14+

## Instalação

```bash
npm install
copy .env.example .env
```

No `.env`, ajuste `DATABASE_URL` para apontar para seu PostgreSQL.

## Banco de dados

Gere o cliente Prisma e execute a primeira migration:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## Executar

```bash
npm run start:dev
```

O health check fica disponível em `GET http://localhost:3000/health`.

## Testes

```bash
npm test
npm run build
```
