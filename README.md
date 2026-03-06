# Param Wallet 5.0 Platform

Full-stack wallet application for Param 5.0 blockchain ecosystem. Built as a monorepo with React frontend and Node.js backend.

## Architecture

**Monorepo Structure:**
- `packages/wallet-backend` — Fastify API server with 5-engine architecture
- `packages/wallet-frontend` — React 18 + Vite console application

**Backend Engines:**
1. **Platform Manager** — SuperApp lifecycle, org onboarding, install/uninstall
2. **Query Engine** — Document CRUD with 3-level RBAC filtering
3. **Auth Gate** — JWT authentication, user profile management
4. **Realtime Relay** — NATS-based event subscriptions (scaffold)
5. **Notification Engine** — Email/SMS/push notifications (scaffold)

**Database Topology (MongoDB):**
- `param_definitions` — SuperApp definitions, state machines, team RBAC matrices
- `param_saas` — Workspaces, installed SuperApps
- `param_auth` — User credentials, sessions
- `{subdomain}` — Workspace-specific data
- `{subdomain}_{superAppId[0:8]}` — SuperApp instance data
- `{subdomain}_{superAppId[0:8]}_{org[2:22]}_{portal}` — Org-partitioned documents

**Three-Level RBAC:**
- **L1** — Organization visibility via `_chain.roles` on documents
- **L2** — Team permissions via `team_rbac_matrix` (RW/RO/N/A)
- **L3** — Document-level restrictions via `_chain._sys.restrictedTo`

## Tech Stack

### Backend
- **Runtime:** Node.js 20
- **Framework:** Fastify 4 (http2, compression)
- **Language:** TypeScript 5
- **Database:** MongoDB 6 (native driver)
- **Messaging:** NATS 2
- **Validation:** Zod
- **Auth:** JWT (access + refresh tokens)
- **Logging:** Pino
- **Testing:** Vitest

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite 5
- **Language:** TypeScript 5
- **State Management:** Zustand 4
- **Data Fetching:** TanStack Query v5
- **UI Components:** shadcn/ui (Radix + Tailwind CSS)
- **Tables:** TanStack Table v8 + TanStack Virtual v3
- **Forms:** React Hook Form + Zod
- **Routing:** React Router v6
- **HTTP Client:** Axios

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 6+
- NATS Server 2+
- pnpm 9+

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cd packages/wallet-backend
cp .env.example .env
# Edit .env with your MongoDB, NATS, and JWT secrets

cd ../wallet-frontend
cp .env.example .env
# Edit .env with API base URL
```

### Development

```bash
# Terminal 1: Start MongoDB
mongod --dbpath /path/to/data

# Terminal 2: Start NATS
nats-server

# Terminal 3: Start backend
cd packages/wallet-backend
pnpm dev

# Terminal 4: Start frontend
cd packages/wallet-frontend
pnpm dev
```

Frontend will be available at `http://localhost:5173`
Backend API at `http://localhost:3001`

### Build for Production

```bash
# Build both packages
pnpm -r build

# Start backend in production
cd packages/wallet-backend
pnpm start

# Serve frontend (use nginx/caddy to serve dist/)
cd packages/wallet-frontend
ls dist/
```

## API Reference

### Authentication
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/profile
```

### Platform Manager
```
POST /api/v1/platform/superapp-definitions
GET  /api/v1/platform/superapp-definitions
POST /api/v1/platform/install
POST /api/v1/platform/uninstall
POST /api/v1/platform/onboard-org
POST /api/v1/platform/create-user
GET  /api/v1/platform/users
POST /api/v1/platform/create-plant
GET  /api/v1/platform/plants
POST /api/v1/platform/create-team-rbac-matrix
GET  /api/v1/platform/team-rbac-matrix
PATCH /api/v1/platform/update-rbac-permission
GET  /api/v1/platform/offchain-definitions
GET  /api/v1/platform/offchain-registry/:collectionName
```

### Query Engine
```
GET  /api/v1/query/documents
GET  /api/v1/query/documents/:id
POST /api/v1/query/documents
GET  /api/v1/query/transactions/:id
```

### Headers Required
```
Authorization: Bearer <jwt_token>
X-Param-ID: <caller_param_id>
X-Workspace: <workspace_subdomain>
X-SuperApp-ID: <superapp_id> (optional, context-dependent)
X-Portal: <portal_name> (optional, context-dependent)
```

## Database Collections

### param_definitions
- `superapp_definitions` — SuperApp metadata, roles, teams, sponsor
- `state_machines` — State machine definitions with transitions
- `team_rbac_matrix` — Default RBAC permissions for SuperApps
- `offchain_definitions` — Master data collection schemas
- `offchain_registry_*` — Master data records

### param_saas
- `workspaces` — Workspace (subdomain) metadata
- `installed_superapps` — SuperApp installations per workspace

### param_auth
- `app_users` — User credentials, roles, team assignments
- `refresh_tokens` — Active refresh tokens

### {subdomain}
- `organizations` — Onboarded orgs (sponsor + partners)

### {subdomain}_{superAppId[0:8]}
- `team_rbac_matrix` — Installed RBAC matrix (copied from definitions)

### {subdomain}_{superAppId[0:8]}_{org[2:22]}_{portal}
- `sm_{stateMachineName}` — Document collections (one per state machine)
- `txn_history` — Transaction records (written by SyncFactory)
- `chain_head` — Latest chain state (written by SyncFactory)
- `drafts` — User draft documents

## ParamGateway Integration

**Execute Pipeline:**
```typescript
POST /paramgateway/execute-pipeline
Body: { ops: [...], stateMachine: string }
Response: { batchTaskId: string, success: true }
```

**Poll Batch Task:**
```typescript
GET /paramgateway/batch-status/:batchTaskId
Response: { status: "queued"|"processing"|"synced", txnIds?: [...] }
```

**Current Implementation:**
- Definition ops (create SM, create SuperApp) — Full integration with polling
- Document ops (create/update) — Stub implementation (returns `{ success: true }`)

## Development Notes

### Critical Rules
1. **Writer Separation:** SyncFactory writes `sm_*`, `txn_history`, `chain_head`. Wallet Backend reads only. Wallet Backend writes `drafts` only in org partition DBs.

2. **DB Resolvers:** Always use resolver functions, never hardcode DB names:
   ```typescript
   resolveOrgPartitionDbName(workspace, superAppId, paramId, portal)
   resolveSuperAppDbName(workspace, superAppId)
   resolveWorkspaceDb(workspace)
   resolveDefinitionsDb() // always "param_definitions"
   ```

3. **Vendor Users:** Vendor users have multiple `app_users` documents (one per partnerId). Always filter by `partnerId` when querying vendor users.

4. **RBAC Matrix Keys:** Team permissions use `"Role.Team"` as keys in the `access` object:
   ```typescript
   { state: "Draft", access: { "Admin.Engineering": "RW", "Viewer.Finance": "RO" } }
   ```

5. **L3 Filtering:** `restrictedTo` blocks by team unless specific user is listed. Logic:
   - If user explicitly in restrictedTo → allow
   - If user's team in restrictedTo but user NOT listed → block
   - If user's team NOT in restrictedTo → allow

6. **Plant Codes:** Document plant associations stored in `_chain._sys.plantIDs[orgParamId]` as string arrays.

### Testing

```bash
# Backend tests
cd packages/wallet-backend
pnpm test

# Frontend tests (if added)
cd packages/wallet-frontend
pnpm test
```

## License

Proprietary - Param Network
