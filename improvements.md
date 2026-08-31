# Improvements

Recommendations for turning this proof of concept into a production service, ordered by
what I would do first. The missing database is out of scope by design and is only
mentioned where it changes the shape of the recommendation.

Each item states the current behaviour, why it matters, and the concrete change.

---

## 1. Security

### 1.1 Replace the shared session token with real authentication — *highest priority*

**Now:** one static `X-SESSION` secret shared by every client (requirement 12).

**Why it matters:** a shared secret has no identity behind it. You cannot tell which
client made a call, revoke one client without breaking all of them, or scope access.
Rotation is a coordinated outage.

**Change:** move to OAuth 2.0 client credentials or OIDC (Auth0, Entra ID, Cognito,
Keycloak) with short-lived JWTs. Validate the signature and `aud`/`iss` in a guard,
cache the JWKS. Keep the `X-SESSION` guard as a fallback for machine-to-machine callers
that cannot do OAuth yet, and give each of those its *own* token so tokens can be
revoked individually.

### 1.2 Add authorisation on top of authentication

**Now:** any caller with the token sees every supplier.

**Change:** scopes (`suppliers:read`) plus tenant scoping — in a multi-tenant product a
caller must only see their own organisation's suppliers. Enforce the tenant filter in
the repository layer, not the controller, so no future endpoint can forget it.

### 1.3 Rate limiting

**Now:** none. A single client can trivially saturate the instance.

**Change:** `@nestjs/throttler` with a global default (e.g. 100 req/min per token) and
per-route overrides. Behind a proxy, set `app.set('trust proxy', 1)` so the throttler
keys on the real client IP rather than the router's.

### 1.4 Tighten CORS and CSP before going public

**Now:** `CORS_ORIGINS` defaults to `*`, and Helmet's CSP is disabled so the Swagger UI
renders.

**Change:** set an explicit origin allow-list per environment. Re-enable CSP and scope
the relaxed directives to the `/api-docs` path only, rather than disabling it globally.

### 1.5 Do not expose the Swagger UI publicly in production

**Change:** either set `SWAGGER_ENABLED=false` in production and publish the spec through
an internal developer portal, or put the docs route behind the same auth as the API.
The switch already exists; the decision does not.

---

## 2. Observability

### 2.1 Structured logging with correlation ids

**Now:** Nest's default text logger; nothing correlates the lines of a single request.

**Change:** `nestjs-pino` emitting JSON, with a middleware that reads `X-Request-Id`
(or generates one), puts it in an `AsyncLocalStorage` context, echoes it on the response
and includes it in the error envelope. Redact `x-session` and `authorization` in the
serialiser so secrets never reach the log drain.

### 2.2 Metrics and tracing

**Change:** `/metrics` in Prometheus format (`@willsoto/nestjs-prometheus`) for request
rate, latency histograms and error ratio; OpenTelemetry traces exported to your APM.
On Render, ship logs and metrics off the instance — the local filesystem is ephemeral
and is wiped on every deploy.

### 2.3 Readiness separate from liveness

**Now:** a single `/health`.

**Change:** `/health/live` (process is up) and `/health/ready` (fixtures loaded — later,
database reachable) via `@nestjs/terminus`. Point `healthCheckPath` in `render.yaml` at
readiness so an instance is not sent traffic before it can actually serve it.

---

## 3. API design

### 3.1 Caching headers

**Now:** every response is computed and sent in full, with no cache metadata.

**Why:** this data changes rarely and is read constantly — the cheapest performance win
available.

**Change:** emit `ETag` and `Last-Modified` (the max `updatedAt` in the result set) and
honour `If-None-Match` with `304`. Add `Cache-Control: private, max-age=60`.

### 3.2 Cursor pagination for large result sets

**Now:** offset pagination, which is right for 50 records.

**Change:** once the dataset is database-backed and large, deep offsets get expensive and
skip or repeat rows when records shift between pages. Offer `cursor`/`nextCursor`
alongside `page`/`limit`. Also consider returning `totalPages` and `hasPrevious` for
easier client rendering.

### 3.3 Sorting

**Change:** `?sort=riskScore:desc,name:asc`. "Show me my riskiest suppliers first" is the
single most likely thing a user of this data wants, and today it can only be done client
-side over a single page.

### 3.4 Richer filtering

**Change:** ranges (`riskScoreMin`/`riskScoreMax`, `updatedSince`), multi-value filters
(`country=DE,FR`), and `tier`. Add `fields=` sparse fieldsets if clients start
over-fetching the detail payload.

### 3.5 Deprecation policy for the URI version

**Now:** `/api/v1` exists but nothing describes what happens at `v2`.

**Change:** document the support window, and emit `Deprecation` / `Sunset` headers on
routes scheduled for removal so clients learn about it from the API itself.

---

## 4. Data layer

### 4.1 Validate the fixtures at boot

**Now:** the JSON files are cast to a TypeScript interface — a compile-time claim about a
runtime file. A malformed fixture would surface as a confusing runtime error deep in a
request.

**Change:** parse them through a Zod (or Joi) schema in `SuppliersRepository.onModuleInit`
so a bad file fails the deploy loudly instead of failing a user's request quietly. Cheap
to add and it is the same schema you will reuse as the database-row contract later.

### 4.2 Keep the repository boundary when the database arrives

**Now:** `SuppliersRepository` already isolates all file access; the service never touches
the filesystem.

**Change:** keep it that way — swap the class for a TypeORM/Prisma repository and the
service, controller, DTOs and tests are untouched. Index `country_code`, `relationship_status`,
`risk_level` and a trigram/full-text index for `search`, and push filtering and pagination
into SQL rather than into `Array.filter`.

### 4.3 Search will not survive the move to a database as-is

**Now:** a `String.includes` scan over 50 in-memory records — correct and instant here.

**Change:** at real volume this needs `ILIKE` with a trigram index, Postgres full-text
search, or OpenSearch if you want relevance ranking, typo tolerance and highlighting.
Plan which before the dataset grows, because it changes the response contract (a
`score`/`highlight` field).

---

## 5. Testing and quality

### 5.1 Contract-test the OpenAPI document

**Now:** the e2e suite asserts the document exists and describes both endpoints.

**Change:** snapshot the generated spec in CI and fail on unreviewed diffs, so a DTO
change cannot silently break published clients. Validate responses against the schema
with a tool like `jest-openapi`.

### 5.2 Coverage thresholds

**Change:** add a `coverageThreshold` to the Jest config (start at the current level,
ratchet up) so coverage cannot silently regress.

### 5.3 CI pipeline

**Change:** GitHub Actions running `lint`, `test`, `test:e2e` and `build` on every PR,
plus `npm audit --production` and Dependabot. Add a `--frozen-lockfile`-style install
(`npm ci`) so builds are reproducible.

### 5.4 Load test before the first real client

**Change:** a k6 or autocannon baseline against the list endpoint gives you a number to
regress against once the database lands, and reveals the p99 that offset pagination and
`Array.filter` are hiding at this size.

---

## 6. Operations

### 6.1 Graceful shutdown is enabled — make sure the platform uses it

**Now:** `app.enableShutdownHooks()` is called.

**Change:** confirm in-flight requests drain within Render's 30-second `SIGTERM` window
before `SIGKILL`, and set `server.keepAliveTimeout` above the load balancer's idle timeout
to avoid 502s from races on connections the proxy still considers open.

### 6.2 Secret management

**Now:** `SESSION_TOKEN` is a Render environment variable, generated by the Blueprint —
correct for a PoC.

**Change:** for production, source secrets from a managed store (AWS Secrets Manager,
Vault, Doppler) with an audited rotation schedule, and support two valid tokens during a
rotation window so clients can roll over without downtime.

### 6.3 Containerise for parity

**Change:** a multi-stage `Dockerfile` (build → `npm ci --omit=dev` → distroless runtime)
plus `docker-compose` makes local, CI and production identical, and gives you the same
artifact on any host if you ever move off Render. Render deploys a `Dockerfile` natively,
so this is a drop-in swap for the native Node runtime rather than a rewrite.

### 6.4 Pin the toolchain

**Change:** `engines` pins Node `22.x` and `.node-version` pins the Render build; add a
matching `.nvmrc` and a `packageManager` field so local developers, CI and the deployed
build all resolve the same versions.

---

## 7. Nice to have

- **`GET /api/v1/suppliers/{id}/documents`** and other sub-resources, once documents are
  more than counters.
- **Aggregate endpoint** (`/suppliers/stats`) for the dashboard tiles a UI will want —
  counts by risk level, country and assessment status — so the client does not fetch all
  50 records to compute them.
- **Idempotent, versioned fixture regeneration**: the generator is already seeded; commit
  the seed in the file header so a future contributor can prove the files match the script.
- **`X-Total-Count` header** alongside the pagination envelope for clients that prefer it.
- **API changelog** in the repository, generated from conventional commits.
