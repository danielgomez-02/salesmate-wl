# PHOTO_VERIFY Backend

Multi-tenant image verification backend for Salesmate Whitelabel. Uses OpenAI Vision API (GPT-4o / GPT-4o-mini) to verify photos against configurable criteria.

## Architecture

```
Frontend (Salesmate App)
    │
    ▼
┌────────────────────────┐
│   Next.js API Routes   │  ← Vercel Serverless Functions
│   (Multi-tenant JWT)   │
├────────────────────────┤
│  OpenAI Vision API     │  ← GPT-4o-mini / GPT-4o
│  Vercel Blob Storage   │  ← Photo storage per tenant
│  Vercel KV (Redis)     │  ← Rate limiting
│  Neon Postgres         │  ← Tasks, verifications, tenants
└────────────────────────┘
```

## Quick Start

### 1. Clone and Install

```bash
git clone <this-repo>
cd photo-verify-backend
npm install
```

### 2. Create Vercel Project

```bash
npm i -g vercel
vercel login
vercel link  # Create a new project
```

### 3. Add Storage (Vercel Dashboard)

Go to your project in [vercel.com](https://vercel.com) → Storage tab:

1. **Postgres** → Create Store → Select Neon → Connect
2. **KV** → Create Store → Connect
3. **Blob** → Create Store → Connect

This auto-populates the environment variables.

### 4. Add Remaining Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
OPENAI_API_KEY=sk-your-key-here
JWT_SECRET=generate-a-random-32-char-string
JWT_ISSUER=photo-verify-backend
DEFAULT_VISION_MODEL=gpt-4o-mini
MAX_IMAGE_SIZE_MB=10
```

### 5. Push Database Schema

```bash
# Pull env vars from Vercel
vercel env pull .env.local

# Push schema to Neon
npm run db:push
```

### 6. Seed Demo Data

```bash
npm run seed
```

### 7. Generate a Test Token

```bash
npm run generate-token
```

### 8. Deploy

```bash
vercel  # Preview deployment
# or
vercel --prod  # Production
```

## Local Development

```bash
# Pull env vars
vercel env pull .env.local

# Start dev server
npm run dev
```

The API will be available at `http://localhost:3000`.

## API Endpoints

All endpoints (except `/api/health`) require JWT authentication:
```
Authorization: Bearer <token>
```

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | `/api/health` | Health check | Public |
| POST | `/api/verify` | Verify photo against task criteria | Any |
| POST | `/api/upload` | Upload photo to Blob storage | Any |
| GET | `/api/tasks` | List tasks (filter: ?status=pending) | Any |
| POST | `/api/tasks` | Create a PHOTO_VERIFY task | Admin/Operator |
| GET | `/api/tasks/:id` | Get task + verification history | Any |
| PUT | `/api/tasks/:id` | Update task | Admin/Operator |
| DELETE | `/api/tasks/:id` | Delete task | Admin |
| GET | `/api/tenants` | List all tenants | Admin |
| POST | `/api/tenants` | Create new tenant | Admin |

## Example: Create a Task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Verificar planograma de nevera",
    "type": "photo_verify",
    "photoVerificationConfig": {
      "prompt": "Analiza esta foto de una nevera en punto de venta",
      "criteria": [
        {
          "id": "has_products",
          "label": "Productos de la marca visibles",
          "type": "boolean",
          "required": true,
          "expectedValue": true
        },
        {
          "id": "row_count",
          "label": "Cantidad de filas de productos",
          "type": "count",
          "required": true,
          "min": 3
        }
      ],
      "model": "gpt-4o-mini",
      "confidenceThreshold": 0.8,
      "fallbackToManual": true
    }
  }'
```

## Example: Verify a Photo

```bash
# With image URL
curl -X POST http://localhost:3000/api/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "<task-id-from-above>",
    "imageUrl": "https://example.com/fridge-photo.jpg"
  }'

# With base64 image
curl -X POST http://localhost:3000/api/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "<task-id>",
    "imageBase64": "/9j/4AAQSkZJRg..."
  }'
```

## Example: Upload a Photo

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "taskId=<task-id>" \
  -F "file=@./photo.jpg"
```

## Multi-Tenant Architecture

Each Bottler (client) is a tenant with:
- **Isolated data**: Tasks and verifications scoped by `tenantId`
- **Own rate limits**: Configurable per tenant
- **Separate storage**: Blob paths prefixed by `tenantId`
- **JWT auth**: Token embeds `tenantId`, `role`, and `tenantSlug`

### Roles
- `admin` — Full access, can manage tenants
- `operator` — Can create/update tasks and run verifications
- `viewer` — Read-only access

## Tech Stack

- **Runtime**: Next.js 15 on Vercel (Serverless Functions)
- **Database**: Neon Postgres + Drizzle ORM
- **Cache/Queue**: Vercel KV (Upstash Redis)
- **Storage**: Vercel Blob
- **Auth**: JWT via jose (Edge-compatible)
- **Validation**: Zod schemas
- **AI**: OpenAI Vision API (GPT-4o-mini / GPT-4o)

## Cost Estimate (Hobby Plan)

| Service | Free Tier | Estimated POC Usage |
|---------|-----------|-------------------|
| Vercel Functions | 100h/month | ~5h/month |
| Neon Postgres | 0.5GB | ~10MB |
| Vercel KV | 3K req/day | ~200 req/day |
| Vercel Blob | 250MB | ~50MB |
| OpenAI (GPT-4o-mini) | Pay per use | ~$5-15/month |

**Total POC cost: ~$5-15/month** (only OpenAI usage)
