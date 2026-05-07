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
   TOKEN_ENCRYPTION_KEY="replace-with-a-token-encryption-secret"
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

O schema Prisma inclui o modelo `User`:

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

O modelo `MetaAccount` vincula contas Meta Ads criptografadas ao usuário e ao projeto:

- `id`
- `userId`
- `projectId`
- `label`
- `adAccountId`
- `accessToken`
- `connectionType`
- `createdAt`
- `updatedAt`

O modelo `GamConnection` vincula conexões GAM / ActiveView criptografadas ao usuário e ao projeto:

- `id`
- `userId`
- `projectId`
- `networkCode`
- `domain`
- `authToken`
- `apiBaseUrl`
- `reportEndpoint`
- `createdAt`
- `updatedAt`

O modelo `CampaignMapping` vincula campanhas Meta Ads aos campos ActiveView/GAM por projeto:

- `id`
- `userId`
- `projectId`
- `metaAccountId`
- `gamConnectionId`
- `facebookCampaignId`
- `facebookCampaignName`
- `trackingType`
- `activeViewFieldOne`
- `activeViewValueOne`
- `activeViewFieldTwo`
- `activeViewValueTwo`
- `notes`
- `createdAt`
- `updatedAt`

O modelo `MetaInsight` armazena dados manuais ou importados de performance de campanhas Meta Ads por data:

- `id`
- `userId`
- `projectId`
- `metaAccountId`
- `campaignId`
- `campaignName`
- `spend`
- `impressions`
- `clicks`
- `cpc`
- `cpm`
- `ctr`
- `date`
- `level`
- `createdAt`

O modelo `ActiveViewRevenue` armazena dados manuais ou importados de receita ActiveView/GAM por data:

- `id`
- `userId`
- `projectId`
- `gamConnectionId`
- `date`
- `domain`
- `networkCode`
- `source`
- `campaignKey`
- `adKey`
- `revenueGross`
- `revenueNet`
- `views`
- `rpm`
- `currency`
- `rawJson`
- `createdAt`

## Autenticação

A autenticação usa provider de credenciais do NextAuth/Auth.js com páginas customizadas em `/login` e `/register`. As senhas são armazenadas como hash bcrypt no campo `passwordHash`.

O cadastro é feito por `POST /api/auth/register`, validado com zod, e nunca retorna `passwordHash`.

## Layout do SaaS

O dashboard possui layout premium em dark mode com sidebar fixa em desktop, navegação inferior responsiva em telas menores, header superior, cards de métricas iniciais e estado vazio sem dados reais. O módulo de Projetos permite listar, criar, editar e excluir projetos do usuário logado em `/dashboard/projects`. O módulo Meta Ads permite cadastrar múltiplas contas por projeto em `/dashboard/meta-ads`, sem sincronizar ou chamar APIs externas, e inserir insights manuais em `/dashboard/meta-ads/insights`. O módulo GAM / ActiveView permite cadastrar conexões por projeto em `/dashboard/gam`, também sem sincronização, e inserir receita manual em `/dashboard/gam/revenue`. O módulo de Mapeamentos em `/dashboard/mappings` vincula campanhas Meta Ads a campos ActiveView/GAM por projeto. O Tracking Builder em `/dashboard/tracking-builder` gera URLs com UTMs e macros para uso no Meta Ads Manager, sem persistência em banco. O item de ROI aparece apenas como navegação planejada, sem lógica de relatório nesta etapa.

## API de projetos

As rotas protegidas de projetos usam a sessão atual e impedem acesso a projetos de outros usuários:

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/[id]`
- `PATCH /api/projects/[id]`
- `DELETE /api/projects/[id]`

## API de Meta Ads

As rotas protegidas de contas Meta Ads usam a sessão atual, validam `adAccountId` começando com `act_`, criptografam `accessToken` com `TOKEN_ENCRYPTION_KEY` e nunca retornam o token real ao frontend:

- `GET /api/meta/accounts`
- `POST /api/meta/accounts`
- `PATCH /api/meta/accounts/[id]`
- `DELETE /api/meta/accounts/[id]`
- `GET /api/meta/insights`
- `POST /api/meta/insights/manual`

## API de GAM / ActiveView

As rotas protegidas de conexões GAM / ActiveView usam a sessão atual, criptografam `authToken` com `TOKEN_ENCRYPTION_KEY` e nunca retornam o token real ao frontend:

- `GET /api/gam/connections`
- `POST /api/gam/connections`
- `PATCH /api/gam/connections/[id]`
- `DELETE /api/gam/connections/[id]`
- `GET /api/gam/revenue`
- `POST /api/gam/revenue/manual`

## Tracking Builder

A página `/dashboard/tracking-builder` gera URLs para anúncios Meta Ads com os parâmetros `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `fb_campaign_id`, `fb_adset_id` e `fb_ad_id`. A ferramenta exibe preview, permite copiar a URL final e não grava dados no banco.

## API de Mapeamentos

As rotas protegidas de mapeamentos usam a sessão atual e validam que projeto, conta Meta Ads e conexão GAM pertencem ao usuário logado:

- `GET /api/mappings`
- `POST /api/mappings`
- `PATCH /api/mappings/[id]`
- `DELETE /api/mappings/[id]`
