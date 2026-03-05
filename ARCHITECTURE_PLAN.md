# Wallet Application — Architecture Plan
**Version:** 1.0 | **Date:** 2026-03-05 | **Status:** Authoritative

---

## 1. System Overview

The Wallet Application is a mono-repo (`wallet-backend` + `wallet-frontend`) that serves as the **operational control tower** for the Param 5.0 platform. It sits in the DATA LAYER alongside ParamGateway, above the KERNEL LAYER (NATS JetStream, paramledger, gPRM, SyncFactory).

### 1.1 The Three Services This Application Talks To

| Service | Purpose | Protocol |
|---|---|---|
| **Wallet Backend** (this app) | Platform ops: workspace, SuperApp install, org/user/RBAC, plants, file; document **reads only**; auth via ENN | REST/HTTP |
| **ParamGateway** | Data-in layer: definitions (onchain SM, schema, offchain SM, schema) via execute pipeline + poll; document create/transition stubbed | REST (frontend only) |
| **ENN (Keystore)** | Auth delegation: OTP send/verify, SSO verify, partner onboard | HTTP (proxied) |

### 1.2 What Wallet Backend Does

- **Platform operations server**: workspace creation, SuperApp install/config, org/user/team/RBAC management
- **Read layer**: serves SM documents, transaction history, available actions, offchain data — all filtered by three-level RBAC (L1 org, L2 team, L3 document-level)
- **Thin auth proxy**: OTP + SSO flows delegated to ENN; session management via `param_auth` DB

### 1.3 What Wallet Backend Does NOT Do

- Does **not** write business documents (SM collections, txn_history, chain_head) — SyncFactory owns those writes
- Does **not** submit blockchain transactions — that is ParamGateway → gPRM
- Does **not** sync on-chain definitions — SyncFactory `define` mnemonic does that

---

## 2. Data Flow Diagrams

### 2.1 Login Flow

```
Browser → POST /auth/otp/request → Wallet Backend → ENN POST /v2/send_otp
                                                    ← { status: true }
         ← { status: "sent" }

Browser → POST /auth/otp/verify  → Wallet Backend → ENN POST /v2/verify_otp
                                                    ← { encryptedPayload }
                                  decrypt AES-CTR(SHA256(otp))
                                  extract paramId, pennId, publicKey
                                  create session in param_auth.{paramId}
         ← { token, refreshToken, user, enn }

Browser stores token + paramId → sends in all subsequent requests as
  Authorization: Bearer <token>
  X-Param-ID: <paramId>
  X-Workspace: <subdomain>
  X-SuperApp-ID: <superAppId>  (when in app context)
  X-Portal: <portal>           (when in org partition context)
```

### 2.2 Workspace Creation Flow

```
Browser → POST /workspace/create { subdomain, workspaceName, exchangeParamId }
        → Wallet Backend (Platform Manager)
          1. Insert param_saas.subdomains
          2. Initialize {subdomain} Workspace DB (collections created on first write)
        ← { subdomain, workspaceName, createdAt }
```

### 2.3 SuperApp Install Flow

```
Browser → POST /superapp/install { superAppId }
        → Wallet Backend (Platform Manager)
          1. Read param_definitions.superapp_definitions by superAppId
          2. Read param_definitions.team_rbac_matrix for all linkedSMs
          3. Write {subdomain}.installed_superapps (full copy + install metadata)
          4. Write {subdomain}_{superAppId[0:8]}.organizations (sponsor org only)
          5. Write {subdomain}_{superAppId[0:8]}.team_rbac_matrix (copied from definitions)
          6. Append workspace to param_saas.subdomain_users[caller.userId].subdomains
        ← created installed_superapps document
```

### 2.4 Document List Flow (Read, RBAC-filtered)

```
Browser → GET /documents?superAppId=...&smId=...&state=Contract&subState=Booking
  Headers: Authorization, X-Param-ID, X-Workspace, X-SuperApp-ID, X-Portal

Wallet Backend (Query Engine):
  1. Resolve Org Partition DB: {subdomain}_{superAppId[0:8]}_{org[2:22]}_{portal}
  2. Collect all user plants via resolveAllUserPlants (app_users)
  3. L1 query: find docs in sm_* collection where _chain.roles matches caller's org
  4. Plant filter: intersect doc plants with user's plants
  5. Partner ID filter (vendor only, if partner_id param present)
  6. Per-doc L2: resolve team via team_rbac_matrix; exclude if N/A
  7. Per-doc L3: check _chain._sys.restrictedTo; exclude if blocked
  8. Paginate, annotate with access level
  ← { total, page, limit, documents: [...] }
```

### 2.5 Document Create Flow (via ParamGateway stub)

```
Browser → ParamGateway stub (document create API not yet provided)
  → return { success: true }   ← stub; replace when API documented

Real flow (future, when ParamGateway document-create API is provided):
  Browser → ParamGateway POST /api/pipelines/{pipelineId}/execute → poll tasks until synced
  ParamGateway → gPRM → paramledger → SyncFactory → MongoDB
  (SM document written by SyncFactory, not Wallet Backend)
```

### 2.6 Definition Flow (on-chain/offchain SM/Schema via ParamGateway — full integration)

```
Definitions (onchain SM, onchain schema, offchain SM, offchain schema):
  Browser → ParamGateway POST /api/pipelines/{pipelineId}/execute?dryRun=false
        → response: { status: "accepted", data: { batchIds: [...] } }
  Browser → poll GET /api/batches/{batchId}/tasks until all tasks status: "synced"
        → SyncFactory has written to param_definitions; Wallet Backend serves on next read

Pipeline IDs: pipe:sys:define-sm-v1, pipe:sys:define-schema-v1,
             pipe:sys:define-offchain-sm-v1, pipe:sys:define-offchain-schema-v1

SuperApp & RBAC (Wallet Backend writes):
  Browser → POST /definitions/superapps → Wallet Backend
        → write param_definitions.superapp_definitions
  Browser → POST /definitions/team-rbac-matrix → Wallet Backend
        → write param_definitions.team_rbac_matrix
```

---

## 3. Tech Stack Recommendation with Justification

### 3.1 Backend Stack

| Category | Choice | Justification |
|---|---|---|
| Runtime | **Node.js 20+** | Native async/await, excellent MongoDB driver, NATS JetStream client, matches Param 5.0 ecosystem (TypeScript-first) |
| Language | **TypeScript 5.x** | Strong typing essential for complex RBAC logic, DB resolver, schema validation. Catches errors at compile time across 50+ API endpoints |
| Framework | **Fastify 4.x** | 2–3× faster than Express (benchmarked at 80k req/s); built-in JSON schema validation; plugin architecture maps perfectly to the five-engine design; Pino logging built-in |
| MongoDB Driver | **mongodb 6.x** (native driver) | Native driver gives full control over connection pooling, session management, and multi-DB patterns needed for the 6-database topology. ORMs like Mongoose add overhead and fight against dynamic DB name resolution |
| Validation | **Zod** (internal) + Fastify JSON Schema (HTTP) | Zod for RBAC logic and complex internal validation; Fastify JSON Schema for fast HTTP request parsing (serialization is 10× faster than manual JSON.stringify) |
| Auth | **JWT + UUID refresh tokens** | Stateless access tokens; stateful refresh tokens for rotation (stored in param_auth DB); no external session store needed |
| Crypto | **Node.js crypto** (built-in) | SHA256 for userId/sessionId computation; AES-CTR for ENN encryptedPayload decryption |
| NATS | **nats 2.x** (JetStream) | Official NATS client; JetStream consumer for Partner SM lifecycle events |
| Logger | **Pino 8.x** | Fastest structured logger for Node.js; Fastify native; 5× faster than Winston |
| Test runner | **Vitest 1.x** | ESM-native, fast, compatible with TypeScript; MongoMemoryServer for in-process MongoDB |
| Process | **tsx --watch** (dev), compiled JS (prod) | Fast dev iteration; clean compiled output for production |

**Why Fastify over Express/NestJS:**
- Fastify's plugin/encapsulation model maps directly to the five-engine architecture (each engine is a Fastify plugin mounted at a prefix)
- Schema-based serialization is critical for performance at 100k+ documents
- NestJS adds heavy DI overhead not justified for this server's clear handler-per-route pattern

### 3.2 Frontend Stack

| Category | Choice | Justification |
|---|---|---|
| Framework | **React 18+ with Vite** | React 18 Concurrent features (Suspense, transitions) enable smooth loading at scale; Vite gives sub-second HMR; the ecosystem has the best virtualization libraries for large tables |
| Language | **TypeScript 5.x** | Type safety across 50+ API calls and complex RBAC-driven UI state |
| State Management | **Zustand** | Minimal boilerplate; excellent for shared UI state (active workspace, active SuperApp, demo mode, user context); avoids Redux complexity for this bounded state set |
| Server State | **TanStack Query (React Query) v5** | Built-in caching, pagination, background refetch, optimistic updates — critical for document lists at 100k+ records; eliminates manual loading/error states |
| UI Library | **shadcn/ui** (Radix + Tailwind CSS) | Unstyled, accessible Radix primitives; Tailwind for rapid custom styling aligned to the three-panel layout; dark mode built-in via CSS variables; enterprise-grade accessibility |
| Table/Virtualization | **TanStack Table v8 + TanStack Virtual** | Handles 100k+ rows via windowing (only renders visible rows); integrates with React Query for server-side pagination; best-in-class for enterprise data tables |
| Forms | **React Hook Form + Zod** | Schema-driven forms from `onchain_schema_definitions`; Zod for runtime validation matching backend schemas |
| Routing | **React Router v6** | File-based routing with nested layouts; URL encodes workspace + SuperApp context cleanly |
| HTTP Client | **Axios with interceptors** | Interceptors handle Authorization header, X-Param-ID, X-Workspace, X-SuperApp-ID, X-Portal injection and token refresh |
| Icons | **Lucide React** | Consistent, tree-shakeable icon set |
| Build | **Vite 5** | Code splitting per route; tree-shaking; fast builds |

**Why not Next.js:** The Wallet Console is a pure SPA (no SSR/SEO needs, internal tool, complex client state). Next.js adds server overhead with no benefit. Vite + React is faster to build and deploy for this use case.

**Why TanStack Query over SWR:** TanStack Query has better support for cursor-based pagination, infinite scroll, and the `select` transformer needed to compute RBAC-filtered UI state from API responses.

---

## 4. Database Topology

Six databases with strict ownership:

```
MongoDB Instance
│
├── param_definitions        ← Global singleton
│   ├── superapp_definitions          (Wallet Backend writes)
│   ├── team_rbac_matrix              (Wallet Backend writes)
│   ├── onchain_sm_definitions        (SyncFactory writes)
│   ├── onchain_schema_definitions    (SyncFactory writes)
│   ├── offchain_sm_definitions       (SyncFactory writes)
│   └── offchain_schema_definitions   (SyncFactory writes)
│
├── param_saas               ← Global singleton (Wallet Backend writes)
│   ├── subdomains
│   └── subdomain_users
│
├── param_auth               ← Global singleton (Auth Gate writes/reads)
│   └── {paramId}            ← one collection per org identity
│
├── {subdomain}              ← Per workspace (Platform Manager writes)
│   ├── installed_superapps
│   ├── plants
│   ├── tax_master
│   ├── delegates
│   ├── holiday_calendars
│   ├── email_config
│   ├── notification_templates
│   ├── notification_preferences
│   ├── notification_logs
│   └── notification_inbox
│
├── {subdomain}_{superAppId[0:8]}    ← Per installed SuperApp per workspace
│   ├── organizations                 (Platform Manager writes)
│   ├── team_rbac_matrix              (Platform Manager writes; copied from param_definitions)
│   ├── app_users                     (Platform Manager writes)
│   ├── offchain_registry_{Name}      (SyncFactory/ParamGateway writes; Query Engine reads)
│   ├── offchain_config_{Name}        (SyncFactory/ParamGateway writes; Query Engine reads)
│   ├── notification_templates
│   ├── notification_preferences
│   ├── notification_logs
│   └── notification_inbox
│
└── {subdomain}_{superAppId[0:8]}_{org[2:22]}_{portal}   ← Per participating org per SuperApp
    ├── drafts                        (Platform Manager writes)
    ├── sm_{state}_{smId[0:6]}        (SyncFactory writes; Query Engine reads)
    ├── txn_history                   (SyncFactory writes; Query Engine reads)
    └── chain_head                    (SyncFactory writes; Query Engine reads)
```

---

## 5. Scalability Strategy for 100k+ Documents

### 5.1 Database Indexing Strategy

**Org Partition DB (`sm_*` collections):**
```javascript
// Primary RBAC + plant filter — used in every GET /documents query
{ "_chain.roles.{roleName}": 1, "_chain._sys.plantIDs.{orgParamId}": 1 }

// State/subState filtering (sidebar navigation)
{ "_local.state": 1, "_local.subState": 1, "_local.timestamp": -1 }

// Phase filtering
{ "_local.phase": 1, "_local.timestamp": -1 }

// Partner ID filtering (vendor document filter)
{ "_participants.{roleName}.C_InternalID": 1 }

// Text search (compound)
{ "$text": { "$search": "..." } }  // text index on schema fields

// Timestamp descending for "recent documents" queries
{ "_local.timestamp": -1 }
```

**txn_history:**
```javascript
{ "docId": 1, "sequence": 1 }    // chain traversal
{ "rootTxn": 1 }                  // full chain lookup
{ "timestamp": -1 }               // recent activity
```

**chain_head:** `_id` is docId — O(1) lookup by default.

**param_saas.subdomain_users:**
```javascript
{ "userId": 1 }                   // login + profile lookup
{ "email": 1 }                    // email-based lookup
```

**SuperApp DB app_users:**
```javascript
{ "userId": 1, "superAppId": 1 }  // platform context middleware (hot path)
{ "userId": 1, "superAppId": 1, "partnerId": 1 }  // vendor context
```

**Definitions DB:**
```javascript
// superapp_definitions: _id is the superAppId
// onchain_sm_definitions: _id is the smId
// team_rbac_matrix: _id is {superAppId[0:8]}:{smId}
// All indexed by _id (default), sufficient for read patterns
```

### 5.2 Backend Pagination Strategy

- Default: `page=1, limit=25`. Maximum: `limit=100`.
- Documents are sorted by `_local.timestamp DESC` by default.
- `total` count uses MongoDB `estimatedDocumentCount()` or `countDocuments()` with indexed filter for speed.
- For very large collections (>500k docs), use **cursor-based** pagination:
  - `cursor` param (last seen `_local.timestamp` + `_id`)
  - MongoDB query: `{ timestamp: { $lt: cursor.timestamp }, _id: { $lt: cursor._id } }`
  - Avoids expensive `skip()` that degrades at high offsets

### 5.3 Caching Strategy

- **SM Definitions** (`onchain_sm_definitions`, `onchain_schema_definitions`): in-memory LRU cache (100 entries, 5-minute TTL) in Wallet Backend. Definitions rarely change; caching eliminates repeated `param_definitions` reads per request.
- **team_rbac_matrix**: per-request context cache (fetched once per request by middleware, reused across RBAC checks for all documents in that request).
- **app_users context**: resolved once per request by `platformContextMiddleware`, attached to `request.platformContext`.
- **Frontend (TanStack Query)**: 5-minute stale time for definitions, 30-second stale time for document lists, 10-second stale time for single documents.

### 5.4 Frontend Virtualization

- **TanStack Virtual** for document lists: only render 20–30 visible rows regardless of total count.
- **React Query infinite scroll**: fetch next page when user scrolls to bottom (cursor-based with `getNextPageParam`).
- **Debounced search**: 300ms debounce on search input before triggering API call.
- **Code splitting**: each major route (Definitions, Workspace, Documents, Settings) loaded lazily via `React.lazy()`.
- **Optimistic updates**: disabled for document transitions (blockchain latency makes this unsafe); enabled for RBAC matrix edits and user preference changes.

### 5.5 Connection Pooling

Fastify backend maintains a single `MongoClient` shared across all engines. `client.db(dbName)` returns a database handle from the same connection pool — no reconnection overhead per request. Pool size: default 10, configurable via `MONGO_POOL_SIZE` env.

---

## 6. Security Considerations

### 6.1 Authentication

- JWT tokens signed with `HS256` (shared secret). Short expiry (1 hour). Refresh tokens are UUID v4, rotated on use, stored hashed (`SHA256(token)`) in `param_auth`.
- Auth middleware validates `SHA256(incomingToken)` against `param_auth.{X-Param-ID}` on every request — compromised tokens are invalidated immediately by deleting the session document.
- OTP codes never stored or returned to client — only used as AES-CTR decryption key for ENN's `encryptedPayload`.

### 6.2 RBAC Propagation

Three-level RBAC is enforced at the **read layer** (Query Engine), not just route guards:
- **L1**: Org Partition DB — partition-based implicit filtering. Querying the correct Org Partition DB ensures only org-visible docs are ever returned.
- **L2**: `team_rbac_matrix` lookup per document — teams with `N/A` at current `{state, subState, microState}` get the document hidden.
- **L3**: `_chain._sys.restrictedTo` per document — individual user restriction.

Route-level guards (workspace admin, org admin) use Fastify's `preHandler` hook to reject before handler execution.

### 6.3 CORS

Wallet Backend:
- Allowed origins: exact match against `ALLOWED_ORIGINS` env (e.g. `https://console.param.network`).
- No wildcard `*` in production.
- Credentials allowed (for cookie-based auth fallback).

### 6.4 API Security

- All endpoints require `Authorization: Bearer` except auth endpoints.
- `X-Param-ID` header is validated against the JWT payload — cannot impersonate another org.
- Dynamic schema filter paths (`filter[*]`) are validated against a schema whitelist; system fields (`_*`) are always blocked.
- No SQL injection risk (MongoDB, parameterized queries via driver).
- No command injection — all DB names are computed from resolver functions with strict character sets (hex + alphanumeric subdomain).

### 6.5 ENN Proxy Security

- `encryptedPayload` from ENN is decrypted server-side only — raw payload never forwarded to browser.
- `param_exchange_enn_key` is a server-side secret (env var), never exposed to frontend.
- Partner registration (`/v4/onboard`) proxied via Wallet Backend to keep exchange ENN key server-side.

---

## 7. ParamGateway Integration Approach

**ParamGateway is called from the Wallet Frontend only.** The Wallet Backend does not call ParamGateway; it reads from MongoDB (written by SyncFactory).

### 7.1 Full Integration — Definitions (onchain SM, schema, offchain SM, schema)

| Operation | Pipeline ID | Flow |
|-----------|-------------|------|
| Deploy onchain SM | `pipe:sys:define-sm-v1` | `POST /api/pipelines/{id}/execute` → poll `GET /api/batches/{batchId}/tasks` until `status: "synced"` |
| Deploy onchain Schema | `pipe:sys:define-schema-v1` | Same |
| Deploy offchain SM | `pipe:sys:define-offchain-sm-v1` | Same |
| Deploy offchain Schema | `pipe:sys:define-offchain-schema-v1` | Same |

**Required headers:** `X-Gateway-Role`, `X-Workspace`, `Content-Type: application/json` (POST)  
**Env var:** `VITE_PARAMGATEWAY_BASE_URL` (e.g. `http://speedtest.param.network:8450`)

**Polling:** 2–3 second interval; timeout ~60s; complete when all tasks have `status: "synced"`.

### 7.2 Stubbed Operations (Frontend)

| Operation | Stub Response | When Called |
|-----------|--------------|-------------|
| Onchain document create | `{ success: true }` | Document Testing → Create button |
| Onchain document transition | `{ success: true }` | Document Testing → Action button |
| Offchain registry/config | `{ success: true }` | Master Data → create/update |

Replace with real integration when ParamGateway APIs are documented.

### 7.3 Frontend Folder Structure

```
packages/wallet-frontend/src/api/paramgateway/
├── client.ts           # Base URL, headers, fetch/axios
├── executePipeline.ts  # POST pipelines/{id}/execute
├── getBatchTasks.ts    # GET batches/{batchId}/tasks
├── definitions/       # Full integration
│   ├── onchainSm.ts
│   ├── onchainSchema.ts
│   ├── offchainSm.ts
│   └── offchainSchema.ts
├── stubs/              # Document create, transition
│   ├── documentCreate.ts
│   └── documentTransition.ts
└── types.ts
```

---

## 8. Five-Engine Architecture Summary

```
Wallet Backend
├── Engine 1: Platform Manager   /api/v1/workspace, /definitions, /superapp, /profile
│   Database writes: param_saas, param_definitions (superapps + rbac only), {subdomain}, {subdomain}_{superAppId[0:8]}
│
├── Engine 2: Query Engine       /api/v1/documents, /offchain
│   Database reads: {subdomain}_{superAppId[0:8]}_{org}_{portal}, param_definitions
│   All responses: three-level RBAC filtered
│
├── Engine 3: Auth Gate          /api/v1/auth
│   Delegates to: ENN (OTP, SSO, partner onboard)
│   Database: param_auth (session storage)
│
├── Engine 4: Realtime Relay     /ws, /sse                    [FUTURE]
│   NATS → WebSocket/SSE → browser (L1 filtered)
│
└── Engine 5: Notification Engine /api/v1/notifications       [FUTURE]
    NATS → email/Slack/WhatsApp/in-app (templates in DB)
```

---

## 9. Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Writer separation | SyncFactory writes SM docs; Wallet Backend reads only | Prevents Wallet Backend from bypassing blockchain guarantees; single writer per collection |
| Dynamic DB resolution | Runtime resolver functions (no hardcoded DB names) | Supports multi-workspace, multi-SuperApp, multi-org at any scale without code changes |
| Install = copy, not reference | RBAC matrix copied from `param_definitions` to SuperApp DB | Enables workspace-level RBAC customization without mutating shared definitions |
| Auth delegation to ENN | Wallet Backend proxies auth; never handles private keys | Separation of concerns; ENN manages blockchain identity |
| ParamGateway integration | Definitions: full (execute + poll); document ops: stubs | Definitions flow through ParamGateway → SyncFactory → MongoDB; document APIs stubbed until provided |
| Org Partition DB per org | Each org's documents in a separate DB | Natural L1 RBAC boundary; MongoDB partitioning avoids cross-org data leakage |
