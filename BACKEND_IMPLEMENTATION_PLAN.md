# Wallet Backend — Implementation Plan
**Version:** 1.0 | **Date:** 2026-03-05 | **Status:** Authoritative

---

## 1. Technology Stack

| Category | Technology | Version | Rationale |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | LTS support; native crypto; best MongoDB + NATS ecosystem |
| Language | TypeScript | 5.x | Mandatory for complex RBAC logic and DB resolver typing |
| Framework | Fastify | 4.x | 2–3× faster than Express; plugin model maps to five engines; built-in schema validation |
| MongoDB | mongodb (native driver) | 6.x | Full multi-DB control; no ORM overhead; dynamic DB name resolution |
| NATS | nats | 2.x | Official JetStream client for Partner SM lifecycle events |
| Validation | Zod + Fastify JSON Schema | latest | Zod for internal logic; JSON Schema for fast HTTP serialization |
| JWT | jsonwebtoken | 9.x | JWT generation and verification; session management |
| Logger | Pino | 8.x | Fastest structured logger; built into Fastify |
| HTTP Client | got | 13.x | ENN proxy calls (OTP, SSO, partner onboard) |
| Email | nodemailer | 6.x | Notification Engine (future) |
| Testing | Vitest + mongodb-memory-server | latest | Fast, ESM-native; in-process MongoDB for isolated tests |
| Build | tsc | 5.x | Compile TypeScript to JS for production |
| Dev server | tsx --watch | latest | Fast dev iteration with TypeScript |

### 1.1 Environment Variables

```
MONGO_URI=mongodb://localhost:27017
MONGO_POOL_SIZE=10
NATS_URL=nats://localhost:4222
ENN_BASE_URL=https://keystore.paramwallet.com:8006
ENN_APP_KEY=<app-key>
ENN_EXCHANGE_KEY=<exchange-enn-key>
JWT_SECRET=<32+ char random string>
JWT_EXPIRES_IN=3600          # seconds (1 hour)
REFRESH_TOKEN_EXPIRES_IN=604800  # seconds (7 days)
PORT=3001
LOG_LEVEL=info
NODE_ENV=production
ALLOWED_ORIGINS=https://console.param.network
```

---

## 2. Project Structure

```
packages/wallet-backend/
├── src/
│   ├── index.ts                    # Entry: starts Fastify, graceful shutdown
│   ├── app.ts                      # Fastify instance; registers all engine plugins
│   ├── config.ts                   # Typed env config (zod-validated on startup)
│   ├── logger.ts                   # Pino logger configuration
│   │
│   ├── db/
│   │   ├── mongo.ts                # MongoClient singleton + connection pool
│   │   ├── resolver.ts             # DB name resolution (orgPartition, superApp, workspace, definitions)
│   │   ├── indexes.ts              # createIndexes() called on startup for all collections
│   │   └── queries.ts              # Shared MongoDB query builders (plant filter, partner filter)
│   │
│   ├── nats/
│   │   └── client.ts               # NATS JetStream client singleton + reconnect logic
│   │
│   ├── middleware/
│   │   ├── auth.ts                 # authMiddleware: validates JWT + session in param_auth
│   │   ├── request-context.ts      # deriveRequestContext: resolves dbName from headers
│   │   ├── platform-context.ts     # platformContextMiddleware: resolves role/team from app_users
│   │   ├── rbac.ts                 # requireWorkspaceAdmin / requireOrgAdmin guards
│   │   └── error-handler.ts        # Global Fastify error handler; maps errors to HTTP codes
│   │
│   └── engines/
│       │
│       ├── platform/
│       │   ├── router.ts           # Fastify plugin; mounts all platform routes at /api/v1
│       │   ├── schemas.ts          # Zod + JSON Schema for all platform endpoints
│       │   ├── workspace.handler.ts
│       │   ├── definitions.handler.ts
│       │   ├── superapp.handler.ts
│       │   ├── partner.handler.ts  # /partners/onboard + NATS PartnerLifecycleHandler
│       │   ├── user.handler.ts
│       │   ├── team-rbac.handler.ts
│       │   ├── profile.handler.ts
│       │   └── org.handler.ts      # /orgs, /plants, /org/profile
│       │
│       ├── query/
│       │   ├── router.ts
│       │   ├── schemas.ts
│       │   ├── documents.handler.ts    # GET /documents, GET /documents/:docId
│       │   ├── chain.handler.ts        # GET /documents/:docId/chain, /diff
│       │   ├── actions.handler.ts      # GET /documents/:docId/actions
│       │   ├── offchain.handler.ts     # GET /offchain/registry/*, /offchain/config/*
│       │   ├── schema-filter.ts        # Dynamic schema field filter builder (Section 16.1.1)
│       │   └── rbac-filter.ts          # resolveDocumentAccess, L1+L2+L3 enforcement
│       │
│       ├── auth/
│       │   ├── router.ts
│       │   ├── schemas.ts
│       │   ├── enn-client.ts           # HTTP wrapper for all ENN endpoints
│       │   ├── otp.handler.ts          # POST /auth/otp/request, /auth/otp/verify
│       │   ├── sso.handler.ts          # POST /auth/sso/:provider
│       │   └── session.handler.ts      # POST /auth/refresh, /auth/logout, /auth/addapp
│       │
│       ├── realtime/               # [FUTURE — scaffold only]
│       │   ├── ws-router.ts
│       │   ├── ws-hub.ts
│       │   ├── nats-subscriber.ts
│       │   └── types.ts
│       │
│       └── notification/           # [FUTURE — scaffold only]
│           ├── router.ts
│           ├── inbox.handler.ts
│           ├── preferences.handler.ts
│           └── intent-processor.ts
│
├── tests/
│   ├── setup.ts                    # MongoMemoryServer global setup; test client helpers
│   ├── helpers/
│   │   ├── seed.ts                 # Seed helpers: create workspace, superapp, users
│   │   └── request.ts              # Authenticated request builders for tests
│   └── engines/
│       ├── platform/
│       │   ├── workspace.test.ts
│       │   ├── definitions.test.ts
│       │   ├── superapp-install.test.ts
│       │   ├── partner.test.ts
│       │   ├── user.test.ts
│       │   ├── team-rbac.test.ts
│       │   └── profile.test.ts
│       ├── query/
│       │   ├── documents.test.ts
│       │   ├── actions.test.ts
│       │   ├── chain-diff.test.ts
│       │   ├── offchain.test.ts
│       │   └── rbac-filter.test.ts
│       └── auth/
│           ├── otp.test.ts
│           ├── sso.test.ts
│           └── session.test.ts
│
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 3. Implementation Sequence

Build in this strict order. Each phase is independently runnable and testable before the next begins.

### Phase 1: Foundation (Days 1–2)

**Goal:** A working Fastify server with MongoDB + middleware. No business logic yet.

1. **Project bootstrap**
   - `pnpm init`, TypeScript config (`strict: true`, `moduleResolution: bundler`), Vitest config
   - Fastify instance in `app.ts` with CORS (`@fastify/cors`), sensible defaults
   - `config.ts`: Zod-validated env config — fail fast on startup if required vars missing

2. **MongoDB connection** (`db/mongo.ts`)
   - Single `MongoClient` instance; `connect()` on startup, `close()` on shutdown
   - `getDb(dbName: string): Db` — returns handle from existing client (no new connection)
   - `MongoMemoryServer` setup in `tests/setup.ts` for test isolation

3. **DB Resolver** (`db/resolver.ts`)
   - `resolveOrgPartitionDbName(workspace, superAppId, paramId, portal): string`
   - `resolveSuperAppDbName(workspace, superAppId): string`
   - `resolveWorkspaceDb(workspace): string`
   - `resolveDefinitionsDb(): string`
   - Full unit test coverage — these are critical correctness-sensitive functions

4. **NATS client** (`nats/client.ts`)
   - `connect()` singleton with retry logic; `getNatsClient(): NatsConnection`
   - Graceful drain on shutdown

5. **Middleware chain**
   - `auth.ts`: extract Bearer token + `X-Param-ID`; compute `SHA256(token)`; lookup in `param_auth.{paramId}` collection; attach `authContext` to request; 401 if missing/expired
   - `request-context.ts`: read `X-Workspace`, `X-SuperApp-ID`, `X-Portal` headers; compute dbName via resolver; attach `requestContext`
   - `platform-context.ts`: `GET /profile` skips this; for all other routes, query `sapp.app_users` for caller; attach `platformContext = { role, plantTeams, isOrgAdmin, isWorkspaceAdmin }`
   - `error-handler.ts`: map Fastify errors + Zod errors + MongoDB errors to clean HTTP responses
   - `rbac.ts`: `requireWorkspaceAdmin(req)` and `requireOrgAdmin(req, role)` guards

6. **Index creation** (`db/indexes.ts`)
   - `createIndexes(client)` — called at startup
   - Creates all indexes listed in Architecture Plan Section 5.1

---

### Phase 2: Platform Manager — Engine 1 (Days 3–6)

**Goal:** All workspace, SuperApp, org, user, and definition management APIs working.

**Implementation order within this phase:**

#### 2.1 Definitions Handler (`definitions.handler.ts`)

Reads from `param_definitions`. Wallet Backend writes only `superapp_definitions` and `team_rbac_matrix`. The collections `onchain_sm_definitions`, `onchain_schema_definitions`, `offchain_sm_definitions`, `offchain_schema_definitions` are written by SyncFactory (triggered by ParamGateway pipelines executed from the frontend); the backend only reads them.

```
GET  /definitions/superapps
GET  /definitions/superapps/:superAppId
POST /definitions/superapps              ← writes superapp_definitions
PUT  /definitions/superapps/:superAppId  ← updates superapp_definitions

GET  /definitions/sm
GET  /definitions/sm/:smId
GET  /definitions/sm/:smId/states        ← returns navigable state hierarchy

GET  /definitions/schemas
GET  /definitions/schemas/:schemaId

GET  /definitions/offchain-sm
GET  /definitions/offchain-sm/:offchainSmId
GET  /definitions/offchain-schemas/:schemaId

GET  /definitions/team-rbac-matrix/:superAppId
GET  /definitions/team-rbac-matrix/:superAppId/:smId
POST /definitions/team-rbac-matrix       ← writes team_rbac_matrix
PUT  /definitions/team-rbac-matrix/:superAppId/:smId
```

Key rule: `POST /definitions/superapps` generates `superAppId` as a 20-char hex hash (use `crypto.randomBytes(10).toString('hex')`).

#### 2.2 Workspace Handler (`workspace.handler.ts`)

```
POST /workspace/create       ← inserts param_saas.subdomains; initializes workspace DB
GET  /workspace/list         ← reads subdomain_users[userId].subdomains → subdomains
GET  /workspace              ← reads param_saas.subdomains for X-Workspace
PUT  /workspace              ← updates workspaceName

GET  /workspace/plants       ← reads {subdomain}.plants
POST /workspace/plants       ← inserts into {subdomain}.plants
PUT  /workspace/plants/:code
DELETE /workspace/plants/:code  ← sets isActive: false
```

#### 2.3 Profile Handler (`profile.handler.ts`)

```
GET /profile       ← always returns user; optionally returns org if X-Workspace + X-SuperApp-ID present
GET /user/profile
PUT /user/profile  ← updates name in subdomain_users
```

Note: `GET /profile` does NOT require `X-Workspace` or `X-SuperApp-ID` — skip `platformContextMiddleware` for this route.

#### 2.4 SuperApp Handler (`superapp.handler.ts`)

```
POST /superapp/install      ← 6-step install sequence (see Architecture Section 2.3)
GET  /superapp              ← lists installed_superapps for workspace
GET  /superapp/:superAppId  ← single app + org bindings grouped by role
PUT  /superapp/:superAppId/status
```

Install sequence (atomic — roll back on any failure):
1. Read `param_definitions.superapp_definitions`
2. Read `param_definitions.team_rbac_matrix` for all linkedSMs
3. Write `{subdomain}.installed_superapps`
4. Write `{subdomain}_{superAppId[0:8]}.organizations` (sponsor only)
5. Write `{subdomain}_{superAppId[0:8]}.team_rbac_matrix` for each SM
6. AddToSet workspace in `param_saas.subdomain_users[caller.userId].subdomains`

#### 2.5 Org Handler (`org.handler.ts`)

```
GET  /superapp/:superAppId/org/profile   ← caller's own org(s)
GET  /superapp/:superAppId/orgs
GET  /superapp/:superAppId/orgs/:role
POST /superapp/:superAppId/partners/onboard
PUT  /superapp/:superAppId/orgs/:role/:paramId/status
```

#### 2.6 User Handler (`user.handler.ts`)

```
GET    /superapp/:superAppId/roles/:role/users
POST   /superapp/:superAppId/roles/:role/users   ← batch user insert
GET    /superapp/:superAppId/users/:userId
PUT    /superapp/:superAppId/users/:userId
DELETE /superapp/:superAppId/users/:userId        ← sets status: suspended
```

Validation: each `plant` must exist in `{subdomain}.plants`; each team must exist in `team_rbac_matrix`.

#### 2.7 Team RBAC Handler (`team-rbac.handler.ts`)

```
GET /superapp/:superAppId/team-rbac-matrix
GET /superapp/:superAppId/team-rbac-matrix/:smId
PUT /superapp/:superAppId/team-rbac-matrix/:smId   ← full permissions replacement
```

#### 2.8 Manifest Handler (`superapp.handler.ts` or separate)

```
POST /superapp/:superAppId/manifest   ← atomic batch: onboard orgs + assign users
```

#### 2.9 Partner SM Lifecycle (NATS) (`partner.handler.ts`)

- Subscribe to `param.syncfactory.{workspace}.{superAppId}.create` where `smType = "@sm/Partner"`
- On `Partner:Active`: run `PartnerLifecycleHandler` — write organizations, plants, subdomain_users, app_users (see Architecture Section 15.5.1 field mapping)
- On `Partner:Inactive`: update organizations + app_users to `suspended`
- REST override: `POST /superapp/:superAppId/partners/onboard` calls same handler

---

### Phase 3: Query Engine — Engine 2 (Days 7–10)

**Goal:** All document read APIs with full L1/L2/L3 RBAC enforcement.

**Build RBAC filter utilities first — they underpin everything else.**

#### 3.1 RBAC Filter Utilities (`rbac-filter.ts`)

Implement in this order, with unit tests at each step:

1. `resolveAllUserPlants(appUsersCol, userId, superAppId, callerOrgParamId): Promise<string[]>`
2. `resolveAppUserContext(appUsersCol, userId, superAppId, callerOrgParamId, doc, partnerIdHint?): Promise<AppUser | null>`
3. `passesL1(doc, callerOrgParamId): boolean`
4. `passesPlantFilter(doc, callerOrgParamId, appUser): boolean`
5. `resolveCallerTeams(appUser, callerOrgParamId, docPlantIDs): string[]`
6. `getTeamAccess(teamRbacMatrix, roleName, teamName, state, subState, microState): "RW" | "RO" | "N/A"`
7. `resolveTeamAccess(teamRbacMatrix, roleName, teams, state, subState, microState): "RW" | "RO" | "N/A"`
8. `passesL3(doc, callerId, callerRole, callerTeam): boolean`
9. `resolveDocumentAccess(doc, appUser, teamRbacMatrix, callerOrgParamId): "RW" | "RO" | null`
10. `buildPartnerIdFilter(callerRole, callerIsSponsor, partnerIdParam): Record | null`

**Test scenarios for rbac-filter.ts:**
- Sponsor user sees all documents for their org
- Vendor user sees only documents where their vendorId matches `_participants.{role}.C_InternalID`
- Team with `N/A` at state level: document hidden
- Team with `RO` at state level: document visible, no action buttons
- Team with `RW` at state level: document visible, action buttons shown
- SubState `N/A` with state `RO`: document visible, substate detail hidden
- L3 `restrictedTo` blocks non-listed users in the same team
- L3 `restrictedTo` does NOT block users from other teams
- Multi-vendor user: correct vendor context resolved per document plant

#### 3.2 Dynamic Schema Filter (`schema-filter.ts`)

Per Section 16.1.1:
1. `buildFieldWhitelist(schema: SchemaDefinition): Set<string>` — walks schema properties tree
2. `buildSchemaFilter(filterParams, whitelist, schemaProperties): MongoFilter` — validates + coerces filter params
3. Array field handling: `$elemMatch` when multiple fields from same array group are filtered

#### 3.3 Documents Handler (`documents.handler.ts`)

```
GET /documents      ← paginated list with full RBAC filter (10-step algorithm)
GET /documents/:docId
```

Performance notes:
- Default `limit=25`, max `limit=100`
- Sort by `_local.timestamp DESC`
- `include_actions=true`: compute actions inline (adds 1 DB lookup per doc — use sparingly)
- `include_diff=true`: compute diff inline (adds N child doc lookups — warn in docs)
- Dynamic schema filters: validated against whitelist before any MongoDB query

#### 3.4 Actions Handler (`actions.handler.ts`)

```
GET /documents/:docId/actions
```

8-step algorithm (see Architecture Plan Section 2.x and backend spec Section 3.4):
1. L3 check first (short-circuit if blocked)
2. Parse `chain_head.stateTo` → currentState, currentSubState, currentMicroState
3. Load SM definition from `param_definitions.onchain_sm_definitions`
4. Collect all candidate transitions (nextState, alternateNext, subState, microState, linkedSMs)
5. L1 check per candidate (owner[] contains callerRole)
6. L2 check per candidate (team_rbac_matrix RW at target level)
7. Resolve landing position (start subState → start microState)
8. Diff check for actions creating child documents

#### 3.5 Chain Handler (`chain.handler.ts`)

```
GET /documents/:docId/chain    ← txn_history ordered by sequence asc
GET /documents/:docId/diff     ← quantity balance check (parent minus all children per SKU)
```

Diff algorithm: fetch parent → fetch all child docIds from `_chain.refs.docIds` → per-SKU subtraction → return reduced OrderedItems + diff block.

#### 3.6 OffChain Handler (`offchain.handler.ts`)

```
GET /offchain/registry/:collectionName
GET /offchain/registry/:collectionName/:keyValue
GET /offchain/config/:collectionName
GET /offchain/definitions
GET /offchain/definitions/:offchainSmId
```

Access check: caller's `paramId` must exist in `sapp.organizations`. No L1/L2/L3 per-org filtering — offchain data is shared across all orgs.

---

### Phase 4: Auth Gate — Engine 3 (Day 11)

**Goal:** Complete OTP + SSO + session management.

#### 4.1 ENN Client (`enn-client.ts`)

Wrapper for all ENN HTTP calls. Never throws on non-2xx — always check `data.status`:

```typescript
async function sendOtp(email: string): Promise<EnnResponse>
async function verifyOtp(email: string, otp: string): Promise<EnnResponse>
async function verifySso(provider: string, code: string, verifierId: string): Promise<EnnResponse>
async function registerExchange(payload): Promise<EnnResponse>
async function onboardPartner(email: string, subdomain: string, headers): Promise<EnnResponse>
```

ENN `encryptedPayload` decryption:
```typescript
// AES-CTR; key = SHA256(otp), iv = first 16 bytes of key
const key = crypto.createHash('sha256').update(otp).digest();
const decipher = crypto.createDecipheriv('aes-256-ctr', key, key.slice(0, 16));
const payload = JSON.parse(decipher.update(encryptedPayload, 'hex', 'utf8'));
// ethID → paramId, paramID → pennId
```

#### 4.2 OTP Handler (`otp.handler.ts`)

```
POST /auth/otp/request   ← calls ENN /v2/send_otp
POST /auth/otp/verify    ← calls ENN /v2/verify_otp; decrypts payload; creates session
```

Session creation on verify:
- `userId = SHA256(email.toLowerCase())`
- Generate JWT: `{ userId, email, paramId, exp }` (signed with `JWT_SECRET`)
- Generate `refreshToken = UUID v4`
- Store in `param_auth.{paramId}`: `_id = "session:" + SHA256(token)`, all fields
- Return token + refreshToken + enn data to client

#### 4.3 SSO Handler (`sso.handler.ts`)

```
POST /auth/sso/:provider  ← calls ENN /v2/verify_sso; no encryptedPayload decryption
```

`paramId` comes directly from `ennResult.data.paramId`, or falls back to `subdomain_users[email].paramId`.

#### 4.4 Session Handler (`session.handler.ts`)

```
POST /auth/refresh        ← find session by refreshToken; rotate token pair
POST /auth/logout         ← delete session by SHA256(token)
POST /auth/addapp         ← calls ENN /v2/register_exchange
POST /auth/domain/register ← proxies ENN /v4/onboard for partner registration
```

---

### Phase 5: Integration & Hardening (Days 12–14)

**Goal:** Production-ready server; all edge cases handled.

30. **End-to-end integration tests** — full HTTP request → DB write → response cycle:
    - Login → workspace create → superapp install → add users → list documents
    - Partner onboard via NATS mock → verify organizations + app_users written
    - RBAC: confirm N/A team cannot access document; RO team cannot see actions

31. **Error handling audit**
    - Missing required headers → 400 with clear message
    - DB collection not found → 404 (not 500)
    - MongoDB duplicate key → 409
    - ENN timeout → 502 with `{ error: "Auth service unavailable" }`
    - JWT expired → 401 with `{ error: "Token expired" }`
    - Unknown schema field in filter → 400 with field name

32. **Index creation on startup** (`db/indexes.ts`)
    - Call `createIndexes(client)` after `client.connect()`
    - Log index creation results; don't fail startup if index already exists

33. **Graceful shutdown**
    - `SIGTERM`/`SIGINT` → `fastify.close()` → drain NATS → `client.close()`

---

## 4. API Endpoint Checklist

### Engine 1: Platform Manager

- [ ] `POST /workspace/create`
- [ ] `GET /workspace/list`
- [ ] `GET /workspace`
- [ ] `PUT /workspace`
- [ ] `GET /workspace/plants`
- [ ] `POST /workspace/plants`
- [ ] `PUT /workspace/plants/:code`
- [ ] `DELETE /workspace/plants/:code`
- [ ] `GET /profile`
- [ ] `GET /user/profile`
- [ ] `PUT /user/profile`
- [ ] `GET /definitions/superapps`
- [ ] `GET /definitions/superapps/:superAppId`
- [ ] `POST /definitions/superapps`
- [ ] `PUT /definitions/superapps/:superAppId`
- [ ] `GET /definitions/sm`
- [ ] `GET /definitions/sm/:smId`
- [ ] `GET /definitions/sm/:smId/states`
- [ ] `GET /definitions/schemas`
- [ ] `GET /definitions/schemas/:schemaId`
- [ ] `GET /definitions/offchain-sm`
- [ ] `GET /definitions/offchain-sm/:offchainSmId`
- [ ] `GET /definitions/offchain-schemas/:schemaId`
- [ ] `GET /definitions/team-rbac-matrix/:superAppId`
- [ ] `GET /definitions/team-rbac-matrix/:superAppId/:smId`
- [ ] `POST /definitions/team-rbac-matrix`
- [ ] `PUT /definitions/team-rbac-matrix/:superAppId/:smId`
- [ ] `POST /superapp/install`
- [ ] `GET /superapp`
- [ ] `GET /superapp/:superAppId`
- [ ] `PUT /superapp/:superAppId/status`
- [ ] `GET /superapp/:superAppId/org/profile`
- [ ] `GET /superapp/:superAppId/orgs`
- [ ] `GET /superapp/:superAppId/orgs/:role`
- [ ] `POST /superapp/:superAppId/partners/onboard`
- [ ] `PUT /superapp/:superAppId/orgs/:role/:paramId/status`
- [ ] `GET /superapp/:superAppId/roles/:role/users`
- [ ] `POST /superapp/:superAppId/roles/:role/users`
- [ ] `GET /superapp/:superAppId/users/:userId`
- [ ] `PUT /superapp/:superAppId/users/:userId`
- [ ] `DELETE /superapp/:superAppId/users/:userId`
- [ ] `GET /superapp/:superAppId/team-rbac-matrix`
- [ ] `GET /superapp/:superAppId/team-rbac-matrix/:smId`
- [ ] `PUT /superapp/:superAppId/team-rbac-matrix/:smId`
- [ ] `POST /superapp/:superAppId/manifest`

### Engine 2: Query Engine

- [ ] `GET /documents`
- [ ] `GET /documents/:docId`
- [ ] `GET /documents/:docId/chain`
- [ ] `GET /documents/:docId/diff`
- [ ] `GET /documents/:docId/actions`
- [ ] `GET /offchain/registry/:collectionName`
- [ ] `GET /offchain/registry/:collectionName/:keyValue`
- [ ] `GET /offchain/config/:collectionName`
- [ ] `GET /offchain/definitions`
- [ ] `GET /offchain/definitions/:offchainSmId`

### Engine 3: Auth Gate

- [ ] `POST /auth/otp/request`
- [ ] `POST /auth/otp/verify`
- [ ] `POST /auth/sso/:provider`
- [ ] `POST /auth/refresh`
- [ ] `POST /auth/logout`
- [ ] `POST /auth/addapp`
- [ ] `POST /auth/domain/register`

### Future (Scaffold only)

- [ ] `GET /notifications/inbox`
- [ ] `PUT /notifications/inbox/:id/read`
- [ ] `PUT /notifications/inbox/read-all`
- [ ] `GET /notifications/preferences/:superAppId`
- [ ] `PUT /notifications/preferences/:superAppId`
- [ ] `GET /notifications/logs`
- [ ] `WS /ws`
- [ ] `GET /sse`

---

## 5. Database Setup and Indexing

All indexes created at startup via `db/indexes.ts`. The `createIndex` calls are idempotent — safe to run on every startup.

### Critical Indexes (hot path — must exist before launch)

```typescript
// sm_* collections in Org Partition DB
// These must be created when a SuperApp is installed (dynamic collection names)
const SM_INDEXES = [
  { key: { "_local.state": 1, "_local.subState": 1, "_local.timestamp": -1 } },
  { key: { "_local.timestamp": -1 } },
  { key: { "_local.phase": 1, "_local.timestamp": -1 } },
];

// txn_history
const TXN_INDEXES = [
  { key: { docId: 1, sequence: 1 } },
  { key: { rootTxn: 1 } },
  { key: { timestamp: -1 } },
];

// app_users in SuperApp DB (hot path — read every request by platformContextMiddleware)
const APP_USERS_INDEXES = [
  { key: { userId: 1, superAppId: 1 }, options: { background: true } },
  { key: { userId: 1, superAppId: 1, partnerId: 1 } },
];

// subdomain_users in param_saas
const SUBDOMAIN_USERS_INDEXES = [
  { key: { userId: 1 }, options: { unique: true } },
  { key: { email: 1 } },
];
```

Note: `sm_*` collections are created by SyncFactory. Wallet Backend should attempt index creation on app startup for known SM collections, and also as a `POST /superapp/install` side effect for the new SuperApp's collections.

### Scale-Specific Decisions

- Do NOT use `skip()` for pagination beyond the first 1000 results — switch to cursor-based pagination (timestamp + _id cursor)
- `estimatedDocumentCount()` for total count on unfiltered queries; `countDocuments()` with indexed filter for filtered queries
- `projection` on all document list queries — only return fields that the UI needs (exclude `_chain._sys` internals in list responses, full document in detail response)

---

## 6. Key Implementation Rules

### Rule 1: Never Write to SM Collections

`sm_*`, `txn_history`, `chain_head` are read-only for Wallet Backend. Any attempt to write must be rejected at the handler level, not caught at the DB level.

### Rule 2: All DB Names from Resolver Functions

No hardcoded DB name strings anywhere except in `resolver.ts`. All handler code must call resolver functions.

### Rule 3: Vendor Users Have Multiple app_users Documents

Never use `findOne({ userId, superAppId })` for vendor users — they have one document per `partnerId`. Always use `resolveAppUserContext(...)` which handles both sponsor (single doc) and vendor (multiple docs, plant-based resolution).

### Rule 4: Install Is Atomic

`POST /superapp/install` must complete all 6 steps or roll back entirely. Use a try/catch with compensating deletes if MongoDB sessions/transactions are not available.

### Rule 5: ENN Never Throws on Business Errors

ENN returns HTTP 500 for invalid OTP, user not found, etc. Wallet Backend must never throw on non-2xx ENN responses — always check `data.status`. Wrap all ENN calls in a try/catch for network errors only.

### Rule 6: Definitions Not Replicated to SuperApp DB

`onchain_sm_definitions`, `onchain_schema_definitions`, `offchain_sm_definitions`, `offchain_schema_definitions` are always read directly from `param_definitions` at query time — never copied on install. Only `team_rbac_matrix` and sponsor org binding are copied on install.

### Rule 6a: Wallet Backend Does NOT Call ParamGateway

ParamGateway is called **from the Wallet Frontend only**. The Wallet Backend never calls ParamGateway. Definitions (onchain SM, schema, offchain SM, schema) are written to `param_definitions` by SyncFactory after the frontend executes ParamGateway pipelines and polls until synced. The backend reads these collections; it does not submit pipeline executions.

### Rule 7: Pagination Always Required for Document Lists

`GET /documents` always returns paginated results — never returns all documents without a page/limit. Default: `page=1, limit=25`. Maximum: `limit=100`.

### Rule 8: Partner ID Filter Is Vendor-Only

`partner_id` query param is silently ignored for sponsor users (`callerIsSponsor = !appUser.partnerId`). Only applied when caller is a vendor user AND `partner_id` is present in the request.

---

## 7. Testing Strategy

### Unit Tests (Vitest + MongoMemoryServer)

Test in isolation — each test starts with clean DB state seeded by helpers:

- `rbac-filter.test.ts` — every RBAC scenario (50+ cases); this is the most critical test file
- `resolver.test.ts` — all DB name resolver edge cases (long subdomains, special chars, boundary slicing)
- `schema-filter.test.ts` — whitelist building, type coercion, error cases
- `actions.test.ts` — action computation for all transition types (state, subState, microState, linkedSM); diff integration

### Integration Tests

Tests that make real HTTP requests through Fastify's `inject()`:

- Full auth flow: request OTP → mock ENN → verify OTP → get token → use token
- Workspace lifecycle: create → list → install SuperApp → verify org bindings
- User management: add user → verify plantTeams → update → suspend
- Document list: seed sm_* documents → GET /documents → verify RBAC filtering

### Test Helpers

```typescript
// tests/helpers/seed.ts
export async function seedWorkspace(client, subdomain)
export async function seedSuperApp(client, workspace, superAppId)
export async function seedOrg(client, workspace, superAppId, role, paramId)
export async function seedUser(client, workspace, superAppId, userId, role, plantTeams)
export async function seedSmDocument(client, workspace, superAppId, orgParamId, portal, state, subState)
export async function seedRbacMatrix(client, workspace, superAppId, smId, permissions)
```

### Test Coverage Targets

- `rbac-filter.ts`: 100% line coverage (RBAC is safety-critical)
- `resolver.ts`: 100% line coverage
- All Platform Manager endpoints: happy path + missing auth + forbidden (wrong role)
- All Query Engine endpoints: happy path + RBAC filtering verified
- Auth Gate: OTP happy path + ENN failure handling
