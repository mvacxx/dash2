# Dashzada ROI

Base limpa para um SaaS multiusuário que compara gasto de campanhas Meta Ads com receita ActiveView/GAM para cálculo de ROI por campanha.

> Nesta etapa, o projeto usa dados manuais de Meta Insights e ActiveView/GAM para validar o ROI antes das integrações reais.

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

## Instalação local

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de exemplo e configure as variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

3. Ajuste o `.env` com os dados do seu ambiente:

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dashzada_roi?schema=public"
   NEXTAUTH_SECRET="replace-with-a-secure-random-secret"
   NEXTAUTH_URL="http://localhost:3000"
   TOKEN_ENCRYPTION_KEY="replace-with-a-token-encryption-secret"
   FACEBOOK_GRAPH_VERSION="v20.0"
   ```

   Gere `NEXTAUTH_SECRET` e `TOKEN_ENCRYPTION_KEY` com:

   ```bash
   openssl rand -base64 32
   ```

4. Rode as migrations locais e gere o Prisma Client:

   ```bash
   npx prisma migrate dev
   ```

   O projeto também executa `prisma generate` no `postinstall` e antes do build de produção para manter o Prisma Client atualizado.

5. Inicie o ambiente de desenvolvimento:

   ```bash
   npm run dev
   ```

O app ficará disponível em `http://localhost:3000`.

## Build de produção

1. Garanta que o `.env` de produção contém `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `TOKEN_ENCRYPTION_KEY` e `FACEBOOK_GRAPH_VERSION`.

2. Aplique migrations no banco de produção:

   ```bash
   npx prisma migrate deploy
   ```

3. Gere o build sem `ignoreBuildErrors`:

   ```bash
   npm run build
   ```

4. Suba o servidor Next.js:

   ```bash
   npm run start
   ```

## Deploy em VPS com PM2 e Nginx

Exemplo de fluxo para uma VPS Linux com Node.js, PostgreSQL, PM2 e Nginx instalados:

1. Clone o repositório e instale dependências:

   ```bash
   git clone <repo-url> dashzada-roi
   cd dashzada-roi
   npm install
   ```

2. Crie o `.env` de produção a partir do exemplo e ajuste `NEXTAUTH_URL` para o domínio público:

   ```bash
   cp .env.example .env
   nano .env
   ```

3. Aplique migrations e gere o build:

   ```bash
   npx prisma migrate deploy
   npm run build
   ```

4. Inicie com PM2 na porta padrão do Next.js (`3000`):

   ```bash
   pm2 start npm --name dashzada-roi -- run start
   pm2 save
   pm2 startup
   ```

5. Configure o Nginx como proxy reverso para `127.0.0.1:3000`:

   ```nginx
   server {
     server_name app.seu-dominio.com;

     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
     }
   }
   ```

6. Valide e recarregue o Nginx:

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

7. Em produção com HTTPS, emita certificado TLS (por exemplo, Certbot) e mantenha `NEXTAUTH_URL` com `https://`.

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
- `createdAt`
- `updatedAt`
- `lastSyncedAt`

O modelo `GamRevenueRow` armazena cada linha retornada por `response` da API ActiveView para debug e reprocessamento local:

- `id`
- `userId`
- `projectId`
- `gamConnectionId`
- `networkCode`
- `domain`
- `date`
- `adUnit`
- `country`
- `revenueGross`
- `revenueNet`
- `rawJson`
- `createdAt`
- `updatedAt`

O modelo `GamRevenueDaily` consolida receita diária sincronizada para o dashboard local:

- `id`
- `userId`
- `projectId`
- `date`
- `revenue`
- `domain`
- `networkCode`
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

O modelo `SyncLog` registra execuções de sincronização por usuário e projeto:

- `id`
- `userId`
- `projectId`
- `source` (`META`, `ACTIVEVIEW` ou `ROI`)
- `status` (`SUCCESS`, `ERROR` ou `RUNNING`)
- `message`
- `startedAt`
- `finishedAt`

## Autenticação

A autenticação usa provider de credenciais do NextAuth/Auth.js com páginas customizadas em `/login` e `/register`. As senhas são armazenadas como hash bcrypt no campo `passwordHash`.

O cadastro é feito por `POST /api/auth/register`, validado com zod, e nunca retorna `passwordHash`.

## Layout do SaaS

O dashboard possui layout premium em dark mode com sidebar fixa em desktop, navegação inferior responsiva em telas menores, header superior, cards de métricas iniciais e estado vazio sem dados reais. O módulo de Projetos permite listar, criar, editar e excluir projetos do usuário logado em `/dashboard/projects`. O módulo Meta Ads permite cadastrar múltiplas contas por projeto em `/dashboard/meta-ads`, sincronizar insights reais pela Meta Ads API e inserir insights manuais em `/dashboard/meta-ads/insights`. O módulo GAM / ActiveView permite cadastrar conexões por projeto em `/dashboard/gam`, sincronizar receitas reais por endpoint flexível e inserir receita manual em `/dashboard/gam/revenue`. O módulo de Mapeamentos em `/dashboard/mappings` vincula campanhas Meta Ads a campos ActiveView/GAM por projeto. O Tracking Builder em `/dashboard/tracking-builder` gera URLs com UTMs e macros para uso no Meta Ads Manager, sem persistência em banco. O relatório de ROI em `/dashboard/roi` calcula resultado por campanha usando dados manuais e sincronizados. A página `/dashboard/sync-logs` exibe o histórico das sincronizações com data, fonte, status, mensagem e duração.

## API de projetos

As rotas protegidas de projetos usam a sessão atual e impedem acesso a projetos de outros usuários:

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/[id]`
- `PATCH /api/projects/[id]`
- `DELETE /api/projects/[id]`

## API de Meta Ads

As rotas protegidas de contas Meta Ads usam a sessão atual, validam `adAccountId` começando com `act_`, criptografam `accessToken` com `TOKEN_ENCRYPTION_KEY`, nunca retornam o token real ao frontend e permitem sincronizar insights reais via Graph API:

- `GET /api/meta/accounts`
- `POST /api/meta/accounts`
- `PATCH /api/meta/accounts/[id]`
- `DELETE /api/meta/accounts/[id]`
- `GET /api/meta/insights`
- `POST /api/meta/insights/manual`
- `POST /api/meta/sync`

## API de GAM / ActiveView

As rotas protegidas de conexões GAM / ActiveView usam a sessão atual, criptografam `authToken` com `TOKEN_ENCRYPTION_KEY` e nunca retornam o token real ao frontend. O cadastro de conexão apenas salva `networkCode`, `domain` e `authToken`. O dashboard, `/home` e o ROI não chamam ActiveView durante server render: eles leem apenas dados locais já salvos. A sincronização acontece somente quando o usuário clica em **Sincronizar agora**, via `POST /api/sync/trigger`; o backend chama `https://external-api.activeview.app/report/${networkCode}/${domain}?start_date=${start}&end_date=${end}`, valida `json.response` como array, detecta receita em `revenue`, `estimated_revenue`, `gross_revenue`, `net_revenue` ou `earnings`, usa exatamente o domínio salvo após `trim()`, remoção de protocolo e barra final, salva rows em `GamRevenueRow` e agrega `GamRevenueDaily`:

- `GET /api/gam/connections`
- `POST /api/gam/connections`
- `PATCH /api/gam/connections/[id]`
- `DELETE /api/gam/connections/[id]`
- `POST /api/gam/sync`
- `POST /api/gam/auto-sync`
- `POST /api/sync/trigger`
- `GET /api/gam/revenue`
- `POST /api/gam/revenue/manual`

## Debug GAM / ActiveView

A página `/dashboard/gam/debug` mostra a última sync ActiveView, URL chamada, status HTTP, rows retornadas e amostras do `rawJson` persistido. O botão **Sincronizar agora** da página ROI envia `projectId`, `dateFrom` e `dateTo` em formato `YYYY-MM-DD` para `POST /api/sync/trigger`, respeitando exatamente o período selecionado nos filtros. Esse endpoint sincroniza todas as contas Meta do projeto, sincroniza as conexões GAM do projeto, recalcula o ROI local e retorna `accounts`, `gamConnections`, `metaRows`, `gamRows` e `rows`.

## Tracking Builder

A página `/dashboard/tracking-builder` gera URLs para anúncios Meta Ads com os parâmetros `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `fb_campaign_id`, `fb_adset_id` e `fb_ad_id`. A ferramenta exibe preview, permite copiar a URL final e não grava dados no banco.

## API de ROI

A rota protegida de ROI usa a sessão atual, valida projeto/conta Meta Ads e agrega Meta Insights, mapeamentos e receita GAM/ActiveView já persistida localmente por campanha, sem disparar sincronização externa automaticamente:

- `GET /api/roi/campaigns`

## API de Mapeamentos

As rotas protegidas de mapeamentos usam a sessão atual e validam que projeto, conta Meta Ads e conexão GAM pertencem ao usuário logado:

- `GET /api/mappings`
- `POST /api/mappings`
- `PATCH /api/mappings/[id]`
- `DELETE /api/mappings/[id]`
