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

Como o banco pode ainda não estar disponível localmente, a migration deve ser executada posteriormente, com o PostgreSQL ativo e o `DATABASE_URL` configurado.

## Executar

```bash
npm run start:dev
```

O health check fica disponível em `GET http://localhost:3000/health`.

O perfil de busca atual pode ser consultado em `GET http://localhost:3000/search-profile`.
Ele é mantido como configuração TypeScript tipada, sem persistência no PostgreSQL neste ciclo.

O classificador determinístico pode ser usado em `POST http://localhost:3000/job-classifier/classify` com um corpo contendo `title`, `description`, `employmentType`, `workMode` e `location`.

A decisão inicial pode ser avaliada em `POST http://localhost:3000/job-decision/evaluate`. O endpoint classifica a vaga e retorna a decisão, motivos, warnings e regras aplicadas sem persistir dados.

## Testes

```bash
npm test
npm run build
```
