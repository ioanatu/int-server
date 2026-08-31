# IntNext PoC Server

REST API serving supplier data, built with **NestJS 11 + TypeScript**.
This is a proof of concept: it has **no database** — every response is served from two JSON fixtures with hard-coded. Only read CRUD operation is supported.

- Base path: `/api/v1`
- Swagger UI: `/api-docs`
- OpenAPI document: `/api-docs-json` (and `/api-docs-yaml`)
- Health probe: `/health` (unauthenticated)

---

## Quick start

```bash
git clone git@github.com:ioanatu/int-server.git
cd int-server
npm install
cp .env.example .env          # set SESSION_TOKEN value
npm run start:dev
```

Then open <http://localhost:3000/api-docs>, press **Authorize**, and paste your `SESSION_TOKEN`. Every request from the docs page will carry the header from then on.

```bash
curl -H "X-SESSION: $SESSION_TOKEN" \
  "http://localhost:3000/api/v1/suppliers?search=example&country=DE&status=active&riskLevel=high&page=1&limit=10"
```

---

## Authentication

Every request to `/api/**` must carry an `X-SESSION` header whose value matches the
server's `SESSION_TOKEN` environment variable.

|                              |                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Header                       | `X-SESSION: <token>`                                                              |
| Source of truth              | `SESSION_TOKEN` env var (a Render environment variable in a deployed environment) |
| Missing / wrong token        | `401 Unauthorized`                                                                |
| Not configured on the server | `401 Unauthorized` — the guard fails closed, it never opens up                    |
| Exempt routes                | `GET /health`, the Swagger UI and the OpenAPI documents                           |

The token is never committed. It is compared in constant time so the comparison cannot
be used as an oracle, and `.env` is git-ignored.

---

## Endpoints

### `GET /api/v1/suppliers`

Paginated, searchable, filterable list. All query parameters are optional and are
combined with **AND**.

| Parameter          | Type    | Notes                                                                                     |
| ------------------ | ------- | ----------------------------------------------------------------------------------------- |
| `search`           | string  | Case-insensitive substring match across id, name, industry, country name and country code |
| `country`          | string  | ISO 3166-1 alpha-2, case-insensitive (`de` = `DE`)                                        |
| `status`           | enum    | `active` \| `inactive` \| `onboarding` \| `offboarded`                                    |
| `riskLevel`        | enum    | `low` \| `medium` \| `high`                                                               |
| `assessmentStatus` | enum    | `completed` \| `in_progress` \| `not_started` \| `expired`                                |
| `industry`         | string  | Exact match, case-insensitive                                                             |
| `page`             | integer | ≥ 1, default `1`                                                                          |
| `limit`            | integer | 1–100, default `10`                                                                       |

Unknown query parameters and out-of-range values are rejected with `400`.

```json
{
  "data": [
    {
      "id": "sup_001",
      "name": "Example Supplier GmbH",
      "country": "DE",
      "status": "active",
      "risk": { "level": "high", "score": 82 }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "hasNext": false }
}
```

### `GET /api/v1/suppliers/{supplierId}`

Returns the full supplier profile — identity, address, contact, company, relationship,
risk, assessment and document counters. Responds `404` with the standard error envelope
when the id is unknown.

### Error envelope

Every error — validation, auth, not-found, unexpected — has the same shape:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Supplier with id 'sup_999' was not found.",
  "path": "/api/v1/suppliers/sup_999",
  "timestamp": "2026-08-30T14:00:00.000Z"
}
```

---

## Data

| File                      | Contents                                                                       |
| ------------------------- | ------------------------------------------------------------------------------ |
| `src/data/suppliers.json` | Array of 50 supplier summaries — backs the list endpoint                       |
| `src/data/supplier.json`  | Object keyed by supplier id → full supplier detail — backs the detail endpoint |

Both files are produced by `npm run generate:data`, which uses a **seeded PRNG**: re-running
it reproduces the committed files byte for byte. `sup_001` is the reference record from the
requirements verbatim, so the documented sample queries always return a predictable result.

The list endpoint projects the stored summary onto the flatter response contract given in
the requirements (`country` and `status` are flattened to scalars). `nest-cli.json` copies
both files next to the compiled output, so the same relative path resolves in development,
in tests and in the deployed build.

---

## Scripts

| Command                 | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `npm run start:dev`     | Watch-mode development server                               |
| `npm run build`         | Compile to `dist/` and copy the JSON fixtures               |
| `npm run start:prod`    | Run the compiled server (Render's start command)            |
| `npm test`              | Unit tests (service, repository, guard)                     |
| `npm run test:e2e`      | HTTP-level tests over the whole app, incl. auth and OpenAPI |
| `npm run test:cov`      | Unit tests with coverage                                    |
| `npm run lint`          | ESLint + Prettier, autofixing                               |
| `npm run generate:data` | Regenerate the two JSON fixtures                            |

---

## Configuration

Validated at boot with Joi — the process refuses to start on a bad configuration.

| Variable          | Required | Default       | Purpose                                        |
| ----------------- | -------- | ------------- | ---------------------------------------------- |
| `SESSION_TOKEN`   | **yes**  | —             | Expected `X-SESSION` value (min. 8 characters) |
| `PORT`            | no       | `3000`        | Injected by Render                             |
| `NODE_ENV`        | no       | `development` | `development` \| `production` \| `test`        |
| `SWAGGER_ENABLED` | no       | `true`        | Set to `false` to hide `/api-docs`             |
| `CORS_ORIGINS`    | no       | `*`           | Comma-separated allow-list, or `*`             |

---

## Deploying to Render

The app is deploy-ready: it binds `0.0.0.0:$PORT`, pins a Node version in `engines` and
`.node-version`, exposes an unauthenticated `/health` probe for the platform check, and
declares the whole service — build command, start command, health check and environment
— in `render.yaml` at the repository root.

`render.yaml` sits at the repository root, so Render picks it up with no extra
configuration.

**Option A — Blueprint (recommended, config lives in the repo):**

1. Push this repository to GitHub/GitLab.
2. In Render: **New → Blueprint**, select the repository.
3. Render reads `render.yaml`, creates the web service and generates a `SESSION_TOKEN`
   for you. Copy it from **Environment** in the dashboard to hand out to clients.

**Option B — manual web service:**

| Setting           | Value                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Runtime           | Node                                                                                          |
| Root directory    | _(repository root)_                                                                           |
| Build command     | `npm ci && npm run build`                                                                     |
| Start command     | `npm run start:prod`                                                                          |
| Health check path | `/health`                                                                                     |
| Environment       | `NODE_ENV=production`, `SESSION_TOKEN=<generate a secret>`, `SWAGGER_ENABLED`, `CORS_ORIGINS` |

Generate a token with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Verify the deploy:

```bash
curl https://<your-service>.onrender.com/health
curl -H "X-SESSION: $SESSION_TOKEN" \
  "https://<your-service>.onrender.com/api/v1/suppliers?limit=2"
```

> **Rotating the secret** — update `SESSION_TOKEN` in the Render dashboard; the service redeploys and the new value takes effect immediately.
>
> **Cold starts** — `render.yaml` requests the `free` plan, which spins the instance down after inactivity, so the first request afterwards is slow. Switch `plan` to `starter` for an always-on PoC.

---

## Project layout

```
int-server/
├── src/
│   ├── common/            # cross-cutting: session guard, error filter, shared DTOs
│   ├── config/            # typed configuration + Joi env validation
│   ├── data/              # the two JSON fixtures
│   ├── health/            # unauthenticated liveness probe
│   ├── suppliers/         # controller → service → repository, DTOs, types
│   ├── swagger.ts         # OpenAPI document + Swagger UI setup
│   ├── app.module.ts
│   └── main.ts
├── scripts/               # seeded fixture generator
├── test/                  # e2e specs
├── .node-version          # Node version for the Render build
├── render.yaml            # Render Blueprint
├── improvements.md        # what to change before this becomes a real service
└── server-requirements.md # the original requirements this PoC was built from
```
