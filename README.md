# Dashzada ROI

Base limpa para um SaaS multiusuário que futuramente comparará gasto de campanhas Meta Ads com receita ActiveView/GAM para cálculo de ROI por campanha.

> Nesta etapa inicial, o projeto **não** possui integrações Meta Ads, ActiveView/GAM, mapeamentos ou relatórios de ROI.

## Stack

- Next.js 15 com App Router
- TypeScript
- TailwindCSS
- Prisma ORM
- PostgreSQL
- Auth.js / NextAuth
- bcrypt
- zod
- Recharts
- lucide-react

## Requisitos

- Node.js compatível com Next.js 15
- npm
- PostgreSQL disponível localmente ou em um provedor externo

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo de ambiente:

   ```bash
   cp .env.example .env
   ```

3. Ajuste as variáveis no `.env`:

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dashzada_roi?schema=public"
   AUTH_SECRET="replace-with-a-secure-random-secret"
   AUTH_URL="http://localhost:3000"
   ```

4. Gere o Prisma Client:

   ```bash
   npx prisma generate
   ```

5. Rode a primeira migration:

   ```bash
   npx prisma migrate dev
   ```

6. Valide o build:

   ```bash
   npm run build
   ```

7. Inicie o ambiente de desenvolvimento:

   ```bash
   npm run dev
   ```

O app ficará disponível em `http://localhost:3000`.

## Estrutura inicial

```text
prisma/schema.prisma          # Schema inicial do banco
src/lib/prisma.ts             # Singleton do Prisma Client
src/lib/auth.ts               # Configuração básica do Auth.js/NextAuth
src/app/page.tsx              # Página inicial pública
src/app/login/page.tsx        # Página de login customizada
src/app/register/page.tsx     # Página de cadastro customizada
src/app/dashboard/page.tsx    # Página protegida simples
src/app/layout.tsx            # Layout global dark mode
src/app/globals.css           # Tailwind e estilos globais
middleware.ts                 # Proteção da rota /dashboard
src/components/dashboard/*    # Layout e componentes do dashboard
src/components/ui/*           # Button, Input e Badge reutilizáveis
```

## Modelo inicial do banco

O schema Prisma começa apenas com o modelo `User`:

- `id`
- `name`
- `email`
- `passwordHash`
- `createdAt`
- `updatedAt`

O modelo `Project` vincula cada projeto/site ao usuário proprietário e será a base para os dados futuros:

- `id`
- `userId`
- `name`
- `domain`
- `timezone`
- `currency`
- `loveTaxPercent`
- `operationalCostPercent`
- `createdAt`
- `updatedAt`

## Autenticação

A autenticação usa provider de credenciais do NextAuth/Auth.js com páginas customizadas em `/login` e `/register`. As senhas são armazenadas como hash bcrypt no campo `passwordHash`.

O cadastro é feito por `POST /api/auth/register`, validado com zod, e nunca retorna `passwordHash`.

## Layout do SaaS

O dashboard possui layout premium em dark mode com sidebar fixa em desktop, navegação inferior responsiva em telas menores, header superior, cards de métricas iniciais e estado vazio sem dados reais. O módulo de Projetos permite listar, criar, editar e excluir projetos do usuário logado em `/dashboard/projects`. Os itens de Meta Ads, GAM / ActiveView, mapeamentos, Tracking Builder e ROI aparecem apenas como navegação planejada, sem lógica de integração nesta etapa.

## API de projetos

As rotas protegidas de projetos usam a sessão atual e impedem acesso a projetos de outros usuários:

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/[id]`
- `PATCH /api/projects/[id]`
- `DELETE /api/projects/[id]`
