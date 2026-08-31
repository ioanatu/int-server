# IntegrityNext PoC Server

Read-only REST API serving supplier master data, built with **NestJS 11 + TypeScript**.
This is a proof of concept: it has **no database** — every response is served from two
JSON fixtures that ship with the application.

- Base path: `/api/v1`
- Swagger UI: `/api-docs`
- OpenAPI document: `/api-docs-json` (and `/api-docs-yaml`)
- Health probe: `/health` (unauthenticated)

---

## Quick start

```bash
cd poc-server
npm install
cp .env.example .env          # then set SESSION_TOKEN to any value you like
npm run start:dev
```

Then open <http://localhost:3000/api-docs>, press **Authorize**, and paste your
`SESSION_TOKEN`. Every request from the docs page will carry the header from then on.

```bash
curl -H "X-SESSION: $SESSION_TOKEN" \
  "http://localhost:3000/api/v1/suppliers?search=example&country=DE&status=active&riskLevel=high&page=1&limit=10"
```

---

## Authentication

Every request to `/api/**` must carry an `X-SESSION` header whose value matches the
server's `SESSION_TOKEN` environment variable.

| | |
|---|---|
| Header | `X-SESSION: <token>` |
| Source of truth | `SESSION_TOKEN` env var (a Heroku config var in a deployed environment) |
| Missing / wrong token | `401 Unauthorized` |
| Not configured on the server | `401 Unauthorized` — the guard fails closed, it never opens up |
| Exempt routes | `GET /health`, the Swagger UI and the OpenAPI documents |

The token is never committed. It is compared in constant time so the comparison cannot
be used as an oracle, and `.env` is git-ignored.

---

## Endpoints

### `GET /api/v1/suppliers`

Paginated, searchable, filterable list. All query parameters are optional and are
combined with **AND**.

| Parameter | Type | Notes |
|---|---|---|
| `search` | string | Case-insensitive substring match across id, name, industry, country name and country code |
| `country` | string | ISO 3166-1 alpha-2, case-insensitive (`de` = `DE`) |
| `status` | enum | `active` \| `inactive` \| `onboarding` \| `offboarded` |
| `riskLevel` | enum | `low` \| `medium` \| `high` |
| `assessmentStatus` | enum | `completed` \| `in_progress` \| `not_started` \| `expired` |
| `industry` | string | Exact match, case-insensitive |
| `page` | integer | ≥ 1, default `1` |
| `limit` | integer | 1–100, default `10` |

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

| File | Contents |
|---|---|
| `src/data/suppliers.json` | Array of 50 supplier summaries — backs the list endpoint |
| `src/data/supplier.json` | Object keyed by supplier id → full supplier detail — backs the detail endpoint |

Both files are produced by `npm run generate:data`, which uses a **seeded PRNG**: re-running
it reproduces the committed files byte for byte. `sup_001` is the reference record from the
requirements verbatim, so the documented sample queries always return a predictable result.

The list endpoint projects the stored summary onto the flatter response contract given in
the requirements (`country` and `status` are flattened to scalars). `nest-cli.json` copies
both files next to the compiled output, so the same relative path resolves in development,
in tests and in the Heroku slug.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run start:dev` | Watch-mode development server |
| `npm run build` | Compile to `dist/` and copy the JSON fixtures |
| `npm run start:prod` | Run the compiled server (what Heroku's `Procfile` calls) |
| `npm test` | Unit tests (service, repository, guard) |
| `npm run test:e2e` | HTTP-level tests over the whole app, incl. auth and OpenAPI |
| `npm run test:cov` | Unit tests with coverage |
| `npm run lint` | ESLint + Prettier, autofixing |
| `npm run generate:data` | Regenerate the two JSON fixtures |

---

## Configuration

Validated at boot with Joi — the process refuses to start on a bad configuration.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `SESSION_TOKEN` | **yes** | — | Expected `X-SESSION` value (min. 8 characters) |
| `PORT` | no | `3000` | Injected by Heroku |
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test` |
| `SWAGGER_ENABLED` | no | `true` | Set to `false` to hide `/api-docs` |
| `CORS_ORIGINS` | no | `*` | Comma-separated allow-list, or `*` |

---

## Deploying to Heroku

The app is deploy-ready: it binds `0.0.0.0:$PORT`, ships a `Procfile`, pins a Node
version in `engines`, exposes an unauthenticated `/health` probe for the platform check,
and declares its config in `app.json`.

Because the repository root holds this project in a `poc-server/` subdirectory, either
push the subdirectory as the app root or add the monorepo buildpack.

**Option A — push the subdirectory (simplest):**

```bash
heroku create integritynext-poc-server
heroku config:set NODE_ENV=production SWAGGER_ENABLED=true \
  SESSION_TOKEN="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

# from the repository root, push only poc-server/ as the app root
git subtree push --prefix poc-server heroku main
```

**Option B — keep the monorepo layout:**

```bash
heroku buildpacks:add -i 1 https://github.com/lstoll/heroku-buildpack-monorepo
heroku config:set APP_BASE=poc-server
heroku buildpacks:add -i 2 heroku/nodejs
git push heroku main
```

Heroku's Node buildpack runs `npm run build` automatically, then `Procfile`'s
`web: node dist/main.js`. Verify with:

```bash
curl https://<your-app>.herokuapp.com/health
curl -H "X-SESSION: $SESSION_TOKEN" https://<your-app>.herokuapp.com/api/v1/suppliers?limit=2
```

> Rotating the secret is `heroku config:set SESSION_TOKEN=<new value>` — it restarts the
> dyno and takes effect immediately.

---

## Project layout

```
poc-server/
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
├── app.json               # Heroku app manifest
├── Procfile               # web: node dist/main.js
└── improvements.md        # what to change before this becomes a real service
```

The repository-level requirements live in `../server-requirements.md`.
