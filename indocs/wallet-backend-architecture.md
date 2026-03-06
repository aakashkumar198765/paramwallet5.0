# Wallet Backend 5.0 — Architecture

**Version:** 2.1  
**Date:** 2026-02-27  
**Status:** Authoritative. Supersedes v1 and all previous architecture documents.

This document describes the architecture of Wallet Backend 5.0: its place in the ecosystem, data topology and ownership, five-engine structure, RBAC model, and API surface. Implementation details (file layout, sequence, technology stack) are included to support a clean-slate build.

---

## Table of Contents

1. [Ecosystem Context](#1-ecosystem-context)
2. [Foundational Principles](#2-foundational-principles)
3. [Two-Level RBAC Model](#3-two-level-rbac-model)
4. [SuperApp Lifecycle](#4-superapp-lifecycle)
5. [Complete Database Topology](#5-complete-database-topology)
6. [Definitions DB (`param_definitions`) — Collection Schemas](#6-definitions-db--collection-schemas)
   - 6.1 `superapp_definitions` | 6.2 `onchain_sm_definitions` | 6.3 `onchain_schema_definitions` | 6.4 `team_rbac_matrix` | 6.5 `offchain_sm_definitions` | 6.6 `offchain_schema_definitions`
7. [Domain DB (`param_saas`) — Collection Schemas](#7-domain-db--collection-schemas)
8. [Workspace DB (`{subdomain}`) — Collection Schemas](#8-workspace-db--collection-schemas)
9. [SuperApp DB (`{subdomain}_{superappId}`) — Collection Schemas](#9-superapp-db--collection-schemas)
10. [Org Partition DB — Collection Schemas](#10-org-partition-db--collection-schemas)
11. [User Access Lookup — Design Rationale](#11-user-access-lookup--design-rationale)
12. [Auth DB](#12-auth-db)
13. [Notification Storage Model](#13-notification-storage-model)
14. [Five-Engine Architecture](#14-five-engine-architecture)
15. [Engine 1: Platform Manager — Full API Spec](#15-engine-1-platform-manager--full-api-spec)
16. [Engine 2: Query Engine — Full API Spec](#16-engine-2-query-engine--full-api-spec)
17. [Engine 3: Auth Gate — Full API Spec](#17-engine-3-auth-gate--full-api-spec)
18. [Engine 4: Realtime Relay — Full Spec](#18-engine-4-realtime-relay--full-spec) *(Future)*
19. [Engine 5: Notification Engine — Full Spec](#19-engine-5-notification-engine--full-spec) *(Future)*
20. [Middleware Chain & Request Context](#20-middleware-chain--request-context)
21. [Database Resolver Logic](#21-database-resolver-logic)
22. [RBAC Enforcement at Runtime](#22-rbac-enforcement-at-runtime)
23. [Project File Structure](#23-project-file-structure)
24. [Technology Stack & Dependencies](#24-technology-stack--dependencies)
25. [Implementation Sequence](#25-implementation-sequence)
26. [Key Implementation Rules](#26-key-implementation-rules)

---

## 1. Ecosystem Context

### 1.1 Where Wallet Backend Sits

```
┌─────────────────────────────────────────────────────────────────────┐
│                          APP LAYER                                   │
│  React Frontend  │  FloForward Apps  │  ParamAI Chat  │  Domain Apps │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP/WS
┌────────────────────────────▼────────────────────────────────────────┐
│                         DATA LAYER                                   │
│                                                                      │
│  ┌──────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ ParamGateway │  │   WALLET BACKEND ◄── │  │  ENN (Auth only) │  │
│  │ (Data IN)    │  │   (Platform + READ)  │  │  (OTP/SSO/Keys)  │  │
│  └──────┬───────┘  └───────────┬──────────┘  └──────────────────┘  │
└─────────┼─────────────────────┼──────────────────────────────────────┘
          │ NATS                │ MongoDB reads/writes
┌─────────▼─────────────────────▼──────────────────────────────────────┐
│                          KERNEL LAYER                                  │
│  NATS JetStream │ paramledger │ gPRM │ SyncFactory │ IPFS             │
└────────────────────────────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────────────────┐
│  STORAGE: MongoDB (Partitioned) │ RocksDB (Ledger) │ IPFS (Documents)  │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 What Wallet Backend Is

- The **platform operations server** for every workspace: manages workspace creation, SuperApp install/config, org/user/team assignment, RBAC
- The **read layer** for all business data: serves SM documents, transaction history, available actions, offchain registry/config data — all filtered by three-level RBAC
- The **notification dispatcher**: listens to NATS events from SyncFactory, routes to email/Slack/WhatsApp/in-app *(Future — not in current scope)*
- The **realtime relay**: forwards NATS events to connected browser WebSocket/SSE clients *(Future — not in current scope)*
- A **thin proxy to ENN** for authentication flows only

### 1.3 What Wallet Backend Is NOT

- It does **NOT write** business documents (no writes to `sm_*`, `txn_history`, `chain_head`, `offchain_*`)
- It does **NOT submit** transactions to the blockchain (that's ParamGateway → gPRM)
- It does **NOT sync** on-chain SM definitions or schema definitions (SyncFactory writes these when triggered by ParamGateway pipelines executed from the frontend)
- It **DOES write** `superapp_definitions` and `team_rbac_matrix` to `param_definitions` (SuperApp blueprints and RBAC configuration are platform responsibilities)
- It does **NOT run** consensus, encryption, or IPFS storage (Kernel layer)
- It does **NOT own** authentication credentials or key management (ENN)

---

## 2. Foundational Principles

### P1: Strict Writer Separation

| Data Category | Database | Who Writes | Who Reads |
|---|---|---|---|
| Blockchain ledger (`txn_*`) | Kernel internal | SyncFactory | Nobody (kernel internal) |
| SM documents (`sm_*`, `chain_head`, `txn_history`) | Org Partition DB (`{subdomain}_{superappId[0:8]}_{org[2:22]}_{portal}`) | SyncFactory | Wallet Backend (Query Engine) |
| OffChain data (`offchain_registry_*`, `offchain_config_*`) | SuperApp DB (`{subdomain}_{superappId[0:8]}`) | SyncFactory / ParamGateway | Wallet Backend (Query Engine) |
| On-chain SM + Schema definitions (`onchain_sm_definitions`, `onchain_schema_definitions`) | `param_definitions` | **SyncFactory** (triggered by ParamGateway pipelines from frontend) | Wallet Backend |
| OffChain definitions (`offchain_sm_definitions`, `offchain_schema_definitions`) | `param_definitions` | **SyncFactory** (triggered by ParamGateway pipelines from frontend) | Wallet Backend |
| SuperApp blueprints + RBAC (`superapp_definitions`, `team_rbac_matrix`) | `param_definitions` | **Wallet Backend** (Platform Manager) | Wallet Backend |
| Workspace config (`plants`, `installed_superapps`, `email_config`) | `{subdomain}` (Workspace DB) | Wallet Backend (Platform Manager) | Wallet Backend |
| Domain registry (`subdomains`, `subdomain_users`) | `param_saas` | Wallet Backend (Platform Manager) | Wallet Backend |
| SuperApp platform state (`organizations`, `app_users`, `team_rbac_matrix`) | SuperApp DB (`{subdomain}_{superappId[0:8]}`) | Wallet Backend (Platform Manager) | Wallet Backend |
| Auth sessions | `param_auth` | Wallet Backend (Auth Gate) | Wallet Backend (Auth Gate) |
| Notifications (workspace-level) | `{subdomain}` | Wallet Backend (Notification Engine) | Wallet Backend |
| Notifications (superapp-level) | `{subdomain}_{superappId[0:8]}` | Wallet Backend (Notification Engine) | Wallet Backend |

### P2: `param_definitions` is the Definition Authority

`param_definitions` is the single database for all structural definitions. It has **two writers** with distinct responsibilities:

**SyncFactory** writes (triggered by ParamGateway pipelines executed from the frontend — these are blockchain-derived, synced from on-chain events):
- `onchain_sm_definitions` — State machine states, substates, microstates with L1 owner/visibility rules
- `onchain_schema_definitions` — Field schemas for SM states
- `offchain_sm_definitions` — OffChain SM definitions (collection type, schema, which SuperApps they serve)
- `offchain_schema_definitions` — Field schemas for offchain registry/config collections

**Wallet Backend (Platform Manager)** writes (these are platform configuration, not blockchain artifacts):
- `superapp_definitions` — SuperApp blueprint: roles, teams, linked SMs. Wallet Backend creates this when a SuperApp is registered on the platform (not blockchain-derived — it describes the platform configuration of who participates and with which teams).
- `team_rbac_matrix` — Team permission grid per SM per SuperApp (who can read/write/transition each state)

> **Why this split?** SyncFactory syncs what is structurally defined on-chain (the SM topology, schemas). Wallet Backend defines the platform access layer (which roles/teams participate in each SuperApp, and who can do what with each state). Both are canonical definitions — neither is workspace-specific.

Wallet Backend also reads from here at query time (SM definitions for action computation, schema definitions for field projection) and on install (to copy RBAC matrix into SuperApp DB).

### P3: Install = Copy, Not Reference

When a workspace installs a SuperApp, Platform Manager makes an explicit copy from `param_definitions` into the **SuperApp DB** for that installation. Specifically, it copies:

1. **Role-to-org bindings** from `param_definitions.superapp_definitions` → `sapp.organizations`. On install, exactly one document is created — the sponsor role bound to the installing org's paramId. Partner roles get **no placeholder documents**; each partner org onboarded in Phase 3 adds its own document. A single partner role can accumulate multiple documents (e.g., two freight forwarders both bound to the FF role).
2. **Full team RBAC matrix** for every linked SM from `param_definitions.team_rbac_matrix` → `sapp.team_rbac_matrix`

It does **NOT** copy SM definitions, schema definitions, offchain SM/schema definitions, or business documents — those are always read directly from `param_definitions` at query time.

**What is the SuperApp DB?** The SuperApp DB (`{subdomain}_{superappId[0:8]}`) is a per-installed-superapp database scoped to a workspace. It holds platform state shared across all participating orgs: which orgs play which roles (`organizations`), the RBAC matrix (`team_rbac_matrix`), user assignments (`app_users`), offchain reference data (`offchain_registry_*`, `offchain_config_*`), and superapp-scoped notifications. There is **one SuperApp DB per installed SuperApp per workspace** — all participating orgs share the same SuperApp DB. Org-specific business documents live in separate Org Partition DBs.

**What is the Org Partition DB?** The Org Partition DB (`{subdomain}_{superappId[0:8]}_{org[2:22]}_{portal}`) is where SyncFactory writes business documents for each participating org. Each org gets its own partition — Bosch (Consignee) and K+N (FF) write to separate databases, partitioned by org. Wallet Backend writes only `drafts` to the Org Partition DB.

The copy enables workspace-level customization (e.g., adjusting team permissions) without mutating shared definitions in `param_definitions`.

### P4: All Data Enters via ParamGateway

Business documents, state machine transitions, bulk imports — all enter via ParamGateway → NATS → kernel. The frontend never submits directly to gPRM. Wallet Backend never submits transactions.

> **ParamGateway is called from the Wallet Frontend only.** The Wallet Backend does not call ParamGateway. Definitions (onchain SM, schema, offchain SM, schema) are written to `param_definitions` by SyncFactory after the frontend executes ParamGateway pipelines (`POST /api/pipelines/{pipelineId}/execute`) and polls task status until synced. Document create/transition are currently stubbed (return `{ success: true }`); real APIs to be wired when provided.

---

## 3. Two-Level RBAC Model

### 3.1 Level 1: Blockchain RBAC (Org-level)

The blockchain sees organisations only. A **Role = Organisation**. Every SM state has:
- `owner`: which org roles can create/modify this state
- `visibility`: which org roles can see this state

This is enforced at the kernel level (gPRM, SyncFactory). Wallet Backend enforces it at read time by checking `_chain.roles` against the user's org paramId.

```
SM State "BookingRequest":
  owner:      ["Consignee"]           → only Bosch (Consignee) can modify
  visibility: ["Consignee", "FF"]     → Bosch and K+N can see
```

### 3.2 Level 2: Platform RBAC (Team-level)

Within each org role, a **Role.Team** provides fine-grained access. Teams are defined per SuperApp. Each team gets per-state read/write/no-access permissions stored in `team_rbac_matrix` **in the SuperApp DB** (`{subdomain}_{superappId[0:8]}`) — one shared copy for all orgs.

```
team_rbac_matrix permissions for "BookingRequest":
  Consignee.Admin:    RW   → full access
  Consignee.OSD4:     RW   → can edit
  Consignee.Planners: RO   → read-only
  Consignee.Viewer:   RO   → read-only
  FF.FF:              RO   → can see but not edit
  CHA.CHA:            N/A  → hidden (even if org has visibility)
```

**State vs SubState vs MicroState in RBAC:**

Documents are created and exist at the **state** level only — each document in `sm_{state}_{smId}` represents a state. SubStates and MicroStates are **transition phases within that state document** — they are status fields (`_local.subState`, `_local.microState`) tracked on the document, not separate documents.

Therefore, subState and microState rows **only affect write access**. Read access (document visibility) is always determined at the state level — if a team can see the state, they can see the document regardless of what subState or microState it is currently in.

Permission semantics by level:

**State level** (mandatory — always present):
- `RW` — team can read the document and write/transition this state
- `RO` — team can read the document but cannot write
- `N/A` — document is completely hidden from the team; subState/microState entries for this team are irrelevant

**SubState level** (present whenever the SM defines substates — required in the matrix if substates exist):
- Read: always inherited from the state-level permission — no change
- `RW` — team can trigger this subState transition
- `RO` — team cannot trigger this subState transition
- `N/A` — team cannot trigger it and the UI hides this sub-phase detail from them (document itself remains visible per state-level access)

**MicroState level** (present whenever the SM defines microstates within a subState — required in the matrix if microstates exist):
- Read: always inherited from the state-level permission — no change
- `RW` / `RO` / `N/A` carry the same write semantics as subState

The `team_rbac_matrix` records one permission entry per `{state, subState, microState}` combination. Every level that exists in the SM definition must have a corresponding row in the matrix — there is no implicit fallback. Write access is resolved at the most specific level present (microState > subState > state):
```
{state: "Contract", subState: null,      microState: null}   ← state-level entry     (always required)
{state: "Contract", subState: "Booking", microState: null}   ← subState-level entry  (required if subState exists)
```

### 3.3 Runtime Access Check (L1 → L2 → L3)

For every document served, Query Engine performs three sequential checks. Failing any check blocks access.

**L1 check (Org Visibility):** Is the user's `paramId` in `_chain.roles` values? L1 is implicitly guaranteed by the database partition — SyncFactory only writes to org-specific Org Partition DBs for orgs with visibility. So `findOne` in the caller's Org Partition DB is itself an L1 gate.

**L2 check (Team Permission):** Look up `app_users` → get `role` and `plantTeams`. For the document's current `{state, subState, microState}`, look up `team_rbac_matrix.permissions` for each of the caller's teams at the relevant plant. Take the most permissive access across all teams (`RW` > `RO` > `N/A`). If final result is `N/A` → hide document. If `RO` → read-only. If `RW` → editable.

**L3 check (Document-level Restriction):** Check `_chain._sys.restrictedTo[]` on the document itself.
- `restrictedTo` is an array of `{ userId, role, team }` entries set by the document creator to restrict visibility to specific individuals.
- **If `restrictedTo` is empty**: skip L3 entirely — L1 + L2 are sufficient.
- **If `restrictedTo` is non-empty**: check whether the caller's `{ userId, role, team }` combination appears in the list.
  - **Caller IS in the list**: access granted — proceed to return document with L2-derived access level.
  - **Caller's team has entries in the list BUT caller is NOT listed**: caller is blocked — this document is hidden from them despite L1+L2 passing.
  - **Caller's team has NO entries in the list** (a different team/role is restricted): skip L3 for this caller — fall through to L1+L2 result.

```
_sys.restrictedTo = [
  { "userId": "0x878042B8...", "role": "Consignee", "team": "OSD4" },
  { "userId": "0xA1B2C3D4...", "role": "Consignee", "team": "OSD4" }
]
// → Only these two OSD4 users see the doc; all other OSD4 users are blocked.
// → Admin, Planners, FF.FF users are not in restrictedTo for their team, so L3 skips for them → L1+L2 applies normally.
```

### 3.4 Action Computation (L1 + L2 + L3)

For `GET /documents/:docId/actions`:
1. Get current `stateTo` from `chain_head` → parse `currentState`, `currentSubState`, `currentMicroState`
2. Read SM definition from `param_definitions.onchain_sm_definitions`
3. Collect all possible transitions from the SM definition across all three levels:
   - `states[currentState].nextState` — primary state transition → goes into `availableActions`
   - `states[currentState].alternateNext[]` — alternate state transitions → goes into `alternateNextActions`
   - `states[currentState].subStates[currentSubState].nextState` — subState transition (if subState is active) → goes into `availableActions`
   - `states[currentState].subStates[currentSubState].microStates[currentMicroState].nextState` — microState transition (if microState is active) → goes into `availableActions`
   - `states[currentState].linkedSMs[]` — linked SM documents that can be created from this state → goes into `linkedSmActions`
4. For each candidate transition: **L1 check** — does the caller's org role appear in `owner[]` at the target level (state / subState / microState)?
5. For each L1-passing transition: **L2 check** — does the caller's team have `RW` at the target level in `sapp.team_rbac_matrix`? (lookup key: `{state, subState, microState}` matching the target)
6. **L3 check** — is the document restricted via `_sys.restrictedTo`? If caller is blocked at L3 → return all arrays empty.
7. For each passing transition, resolve the full landing position by looking up the SM definition:
   - **State transition** (`nextState`, `alternateNext[]`): `targetState` is known → find its `start: true` subState → find that subState's `start: true` microState. Set `targetSubState` and `targetMicroState` accordingly (null if none exist).
   - **SubState transition**: `targetState` = `currentState`, `targetSubState` is known → find its `start: true` microState. Set `targetMicroState` accordingly (null if none exist).
   - **MicroState transition**: all three target values are explicit — no lookup needed.
   - **LinkedSM**: `targetState` = linked SM's `startAt` state → find its `start: true` subState → find that subState's `start: true` microState. Set `targetSubState` and `targetMicroState` accordingly (null if none exist).
8. Return the three grouped arrays — `availableActions`, `alternateNextActions`, `linkedSmActions` — each action carrying the resolved full `{targetState, targetSubState, targetMicroState}` landing position.

---

## 4. SuperApp Lifecycle

### Phase 1: DEFINE

Two systems write to `param_definitions` during the definition phase:

**SyncFactory** (blockchain-derived, via `define` mnemonic):
- `onchain_sm_definitions` — SM states, substates, microstates with L1 owner/visibility rules
- `onchain_schema_definitions` — field schemas per SM state
- `offchain_sm_definitions` — OffChain SM definitions for registry/config data
- `offchain_schema_definitions` — field schemas for offchain registry/config collections

**Wallet Backend — Platform Manager** (platform configuration layer):
- `superapp_definitions` — SuperApp blueprint: which roles participate, which teams each role has, which SMs are linked. Created via `POST /definitions/superapps`.
- `team_rbac_matrix` — per-SM permission grid for the SuperApp: one document per SM, with one permissions entry per `{state, subState, microState}` combination. Created via `POST /definitions/team-rbac-matrix`. This is a required step before a SuperApp can be installed.

> **DEFINE happens once per SuperApp, globally.** Once defined in `param_definitions`, any workspace can install and customize the SuperApp. All workspaces share the same source definitions but each gets their own copy of `team_rbac_matrix` in the SuperApp DB (customizable post-install).

### Phase 2: INSTALL (Workspace Admin → Platform Manager)

`POST /api/v1/superapp/install`

**Body:** `{ superAppId, orgName? }` — `orgName` is optional; sets the sponsor org name in step 4 (falls back to caller's name from `subdomain_users`).

Platform Manager:
1. Reads `param_definitions.superapp_definitions` by superAppId
2. Reads `param_definitions.team_rbac_matrix` for all linked SMs
3. Writes `ws.installed_superapps` — workspace-level installation record
4. Writes `sapp.organizations` — sponsor role only (one document, bound to the installing admin's org with `status: "active"`, `org.name` from `orgName` body field or caller name fallback). Partner roles get no placeholder documents — they are created in Phase 3 as orgs are onboarded. Multiple orgs can be onboarded for the same partner role.
5. Writes `sapp.team_rbac_matrix` — full permission matrix copied from `param_definitions.team_rbac_matrix` for each linked SM (one doc per SM). Uses same collection name as the source for clarity.

> **Why `organizations`?** This collection answers: "which actual organization plays which role in this SuperApp?" It's the L1 binding registry — mapping abstract role names (Consignee, FF, CHA) to real org paramIds. It is NOT about teams (teams come from `team_rbac_matrix`) and NOT about users (that's `app_users`).

### Phase 3: CONFIGURE (Ongoing lifecycle)

All writes to the SuperApp DB (`{subdomain}_{superappId[0:8]}`) by Platform Manager:
- **Onboard partner organization** → `sapp.organizations` — insert a new document with `role` from `superapp_definitions.roles[].name`, bound to the partner's `paramId` and `orgName`. Multiple partner organizations can be onboarded for the same role.
- **Add users** → `sapp.app_users` — insert a user document with `role` (from `superapp_definitions.roles[].name`) and `paramId` (the organization they belong to), plus `plantTeams[]` for per-plant team assignments. A user can be in multiple teams at each plant, and different teams at different plants within the same role (see schema in Section 9.2).
- **Customize team RBAC** → `sapp.team_rbac_matrix` — workspace admin can override permission entries per SM post-install.

---

## 5. Complete Database Topology

This section defines all databases used by Wallet Backend and their writers. Six databases with strict ownership boundaries:

| Database | Name Pattern | Scope | Writer(s) | Purpose |
|---|---|---|---|---|
| Definitions | `param_definitions` | Global singleton (per exchange deployment) | SyncFactory (onchain SM/schema/offchain defs) + Wallet Backend (superapp_definitions, team_rbac_matrix) | SuperApp blueprints, on-chain SM/schema definitions, offchain definitions, team RBAC matrix |
| Domain | `param_saas` | Global singleton | Platform Manager | Workspace registry (`subdomains`), global user index (`subdomain_users`) |
| Auth | `param_auth` | Global singleton | Wallet Backend (Auth Gate) | All session documents in a single `sessions` collection |
| Workspace | `{subdomain}` | Per workspace | Platform Manager + Notification Engine | Installed superapps list, plants, workspace config, workspace-level notifications |
| SuperApp | `{subdomain}_{superappId[0:8]}` | Per installed superapp per workspace | Platform Manager + SyncFactory (offchain) + Notification Engine | Org bindings, RBAC matrix, user assignments, offchain data, superapp-level notifications |
| Org Partition | `{subdomain}_{superappId[0:8]}_{org[2:22]}_{portal}` | Per participating org per superapp | SyncFactory (SM docs) + Platform Manager (drafts only) | Business documents: SM states, transaction history, chain head, drafts |


### 5.1 DB Naming Details

**Definitions DB:**
```
param_definitions    (single canonical name per exchange deployment)
```
All SuperApp definitions, on-chain SM/schema definitions, offchain definitions, and RBAC matrices live here.

**Workspace DB:**
```
bosch-exim
bosch-procurement
```
Named directly after the subdomain — no prefix. This is the workspace's own config and org directory.

**SuperApp DB:**
```
Format: {subdomain}_{superappId[0:8]}
Example: bosch-exim_86bbaa78
         bosch-exim_5a3c9d12

Breaking it down:
  subdomain       = "bosch-exim"
  superappId[0:8] = first 8 hex chars of the superAppId (e.g. "86bbaa78" from "86bbaa780565662b3154")
```

> One SuperApp DB per installed SuperApp per workspace. All participating orgs share the same SuperApp DB — platform state (org bindings, RBAC, users) is stored here once. Enables platform middleware to look up user context with a single `{userId, superappId}` query without needing to resolve the org partition first.

**Org Partition DB:**
```
Format: {subdomain}_{superappId[0:8]}_{org[2:22]}_{portal}
Example: bosch-exim_86bbaa78_6193b497f8e2a1d340b2_Consignee
         bosch-exim_86bbaa78_40af9b6a3f8b1c2d7e4f_FF

Breaking it down:
  subdomain       = "bosch-exim"
  superappId[0:8] = "86bbaa78" (same prefix as SuperApp DB — prefix-based lookup of all partitions)
  org[2:22]       = strip "0x", take first 20 hex chars of paramId
  portal          = "Consignee" | "FF" | "CHA" (the role this partition belongs to)

Total length example: "bosch-exim_86bbaa78_6193b497f8e2a1d340b2_Consignee" = 50 chars
                       well within MongoDB's 64-byte DB name limit
```

> Each participating org gets its own Org Partition DB. Bosch (Consignee) and K+N (FF) have **separate databases** for the same SuperApp. SyncFactory writes business documents to all org partitions with L1 visibility. Wallet Backend writes only `drafts`.

**Auth DB:**
```
param_auth    (global singleton, written and read by Wallet Backend — Auth Gate)
```

---

## 6. Definitions DB — Collection Schemas

Database: `param_definitions` (global singleton). Holds all structural definitions: SuperApp blueprints, on-chain and off-chain SM/schema definitions, and the canonical team RBAC matrix. Writers: SyncFactory (onchain/offchain defs) and Wallet Backend (superapp_definitions, team_rbac_matrix). See Section 2 (P2) and Section 5 table.

**Collections summary:**

| Collection | Writer | Purpose |
|---|---|---|
| `superapp_definitions` | **Wallet Backend** | SuperApp blueprint (roles, teams, linked SMs) |
| `onchain_sm_definitions` | SyncFactory | SM states/substates/microstates + L1 rules (blockchain-derived) |
| `onchain_schema_definitions` | SyncFactory | Field schemas for SM states (blockchain-derived) |
| `offchain_sm_definitions` | SyncFactory | OffChain data collection definitions (blockchain-derived) |
| `offchain_schema_definitions` | SyncFactory | Field schemas for offchain collections (blockchain-derived) |
| `team_rbac_matrix` | Wallet Backend | Team permission grid per SM per SuperApp |

### 6.1 `superapp_definitions`

```javascript
{
  "_id": "86bbaa780565662b3154",           // unique ID generated by Wallet Backend on creation
  "name": "Bosch EXIM",
  "desc": "Export & Import Shipment Automation",
  "version": "1.0.0",

  // L2 RBAC structure: roles with teams.
  // The sponsor role is identified by the top-level "sponsor" key — NOT by a per-role flag.
  "roles": [
    {
      "name": "Consignee",
      "desc": "Import buyer",
      "teams": [
        { "name": "Admin",    "desc": "Full administrative access" },
        { "name": "OSD4",     "desc": "Overseas Dispatch 4" },
        { "name": "Planners", "desc": "Shipment planners" },
        { "name": "C/TXR",   "desc": "C/TXR team" },
        { "name": "Viewer",   "desc": "Read-only access" },
        { "name": "OSP",      "desc": "OSP team" },
        { "name": "OSD3",     "desc": "Overseas Dispatch 3" },
        { "name": "Technical","desc": "Technical team" }
      ]
    },
    {
      "name": "FF",
      "desc": "Freight Forwarder",
      "teams": [{ "name": "FF", "desc": "Freight Forwarder operations" }]
    },
    {
      "name": "CHA",
      "desc": "Customs House Agent",
      "teams": [{ "name": "CHA", "desc": "Customs operations" }]
    }
  ],

  // SMs this SuperApp orchestrates — format: "{smType}:{_id}" where smType is from onchain_sm_definitions.smType and _id is onchain_sm_definitions._id
  // e.g. "@sm/Commerce:public:0xe1ec34e6..." = smType "@sm/Commerce" + _id "public:0xe1ec34e6..."
  "linkedSMs": [
    "@sm/Commerce:public:0xe1ec34e6...",
    "@sm/Commerce:public:0x94a7d022...",
    "@sm/Catalogue:public:0x52a6ae9e..."
  ],

  "sponsor": "Consignee",
  "isActive": 1,
  "createdBy": "29333848e47d...",
  "createdAt": 1712059564379,
  "modifiedAt": 1764854269151
}
```

### 6.2 `onchain_sm_definitions`

Synced from blockchain via SyncFactory `define` mnemonic. L1 RBAC source of truth.

```javascript
{
  "_id": "public:0xe1ec34e6...",           // smId — the blockchain hash
  "name": "Shipment Booking",
  "displayName": "Shipment Booking",
  "smType": "@sm/Commerce",               // @sm/Commerce | @sm/Catalogue | @sm/Partner | @sm/Custom
  "desc": "FF Inbound SM for Bosch SaaS EXIM",

  // All roles that participate in this SM (L1 org roles)
  "roles": ["Consignee", "FF", "CHA"],

  // Phase mapping for UI grouping
  "phaseMapping": {
    "Initiation": [],
    "Agreement": ["Contract"],
    "Execution": [],
    "Settlement": [],
    "Completion": []
  },

  "startAt": "Contract",

  // Three-level state hierarchy
  "states": {
    "Contract": {
      "desc": "Inbound Shipment Contract",
      "phase": "Agreement",
      "schema": "public:0x07724ce1...",          // → onchain_schema_definitions._id
      "end": true,
      "owner": ["FF", "Consignee"],        // L1: which orgs can write
      "visibility": ["Consignee", "FF"],   // L1: which orgs can see
      "props": {
        "diff": false,    // true = this state participates in quantity-balance diff (see GET /documents/:docId/diff)
        "edit": true,
        "flip": false
      },
      "nextState": null,                   // null if end:true
      "alternateNext": [],
      "linkedSMs": [],

      "subStates": {
        "Booking": {
          "start": true,
          "owner": ["FF", "Consignee"],
          "nextState": "Cancelled",
          "microStates": {}
        },
        "Cancelled": {
          "end": true,
          "owner": ["FF", "Consignee"],
          "nextState": null,
          "microStates": {}
        }
      }
    }
  },

  // Exchange that hosts this SM
  "ExchangeParamID": [{ "paramID": "0x5e282dE1..." }],
  "orgParamID": "0x8DeE40B6..."            // defining org
}
```

### 6.3 `onchain_schema_definitions`

**Written by SyncFactory** via `define` mnemonic. Fields are grouped under `properties` as a keyed object map. Three group types exist: `"contact"` (party groups — must include `C_InternalID`), `"object"` (domain data groups), and `"array"` (repeating row groups — fields live in `items.properties`). Every leaf field has exactly one of `order: N` (shown in UI, sequential from 1 within its group) or `hidden: true` (stored but never rendered).

```javascript
{
  "_id": "public:0x07724ce1...",        // blockchain hash — synced by SyncFactory
  "displayName": "Inbound Shipment",    // human-readable UI label
  "desc": "Field schema for Inbound Shipment",
  "version": "1.0",

  "properties": {

    // ── contact group (party) ─────────────────────────────────────────────
    "Seller": {
      "type": "contact",               // party group — C_InternalID is mandatory
      "desc": "Seller / Freight Forwarder party details",
      "properties": {
        "C_InternalID":   { "type": "string", "required": true,  "hidden": true },  // vendor ID — always present
        "C_Organization": { "type": "string", "required": false, "order": 1 },
        "C_TaxID":        { "type": "string", "required": false, "hidden": true },
        "C_Email":        { "type": "string", "required": false, "hidden": true }
      }
    },

    "Buyer": {
      "type": "contact",
      "desc": "Buyer / Consignee party details",
      "properties": {
        "C_InternalID":   { "type": "string", "required": true,  "hidden": true },  // vendor ID — always present
        "C_Organization": { "type": "string", "required": false, "order": 1 },
        "C_PlantID":      { "type": "string", "required": false, "hidden": true }
      }
    },

    // ── object group (domain data) ────────────────────────────────────────
    "DocDetails": {
      "type": "object",
      "desc": "Document header and reference details",
      "properties": {
        "D_OrderNumber": { "type": "string", "required": true,  "title": "Order Number", "order": 1 },
        "D_Date":        { "type": "date",   "required": false, "title": "Order Date",   "order": 2 },
        "D_Type":        { "type": "string", "required": false, "title": "Type",
                           "enum": ["Import", "Export"],                                 "order": 3 }
      }
    },

    // ── array group (repeating rows) — fields live in items.properties ────
    "OrderedItems": {
      "type": "array",
      "title": "Ordered Items",
      "desc": "List of ordered line items",
      "order": 5,                        // group-level position in the schema
      "items": {
        "type": "object",
        "properties": {
          "I_SKU":         { "type": "string", "required": true,  "order": 1 },
          "I_Description": { "type": "string", "required": false, "order": 2 },
          "I_Quantity":    { "type": "number", "required": true,  "order": 3 },
          "I_HSNCode":     { "type": "string", "required": false, "hidden": true }
        }
      }
    }
  }
}
```

> **Visibility contract**: every leaf field carries exactly one of `order: N` (shown in UI, starting from 1 within its group) or `hidden: true` (stored but never rendered). Absence of both is invalid. This replaces the old `index` threshold where values <100 meant hidden and ≥100 meant shown.

### 6.4 `team_rbac_matrix`

One document per SM per SuperApp. **Written by Wallet Backend (Platform Manager)** via `POST /definitions/team-rbac-matrix`. This is the canonical RBAC definition — it gets copied into the **SuperApp DB** on install (same collection name `team_rbac_matrix`). SyncFactory does NOT write this collection.

**Permission semantics:**
- At **state** level (`subState: null, microState: null`): governs whether a team can read (`RO`) or read+write (`RW`) documents in that state. `N/A` = documents in this state are hidden from the team entirely.
- At **subState** level (`subState: "Booking", microState: null`): **read access inherits from the state level** — a team that can read the state can read any subState of that document. **Write access at subState is independent**: `RW` = team can initiate/trigger this subState transition; `RO` = team sees the document is in this subState but cannot trigger it; `N/A` = team cannot trigger this subState and the UI hides this sub-phase detail. If the SM defines substates, rows for every subState must be present in the matrix.
- At **microState** level: same inheritance rule — read follows state-level access; write (`RW`/`RO`/`N/A`) is independently configurable per microState. If the SM defines microstates, rows for every microState must be present in the matrix.

> **Rule**: subState and microState rows only affect WRITE access. Read access (document visibility) is always determined at the state level. Every level that exists in the SM definition must have a corresponding row in the matrix — there is no implicit fallback.

```javascript
{
  "_id": "86bbaa78:public:0xe1ec34e6",             // format: "{superAppId[0:8]}:{smId}" — first 8 chars of superAppId + smId from onchain_sm_definitions._id
  "superAppId": "86bbaa780565662b3154",
  "smId": "public:0xe1ec34e6...",
  "smName": "Shipment Booking",

  // One entry per {state, subState, microState} combination
  // key = "Role.Team", value = "RW" | "RO" | "N/A"
  "permissions": [
    {
      // State-level: who can see/write documents in "Contract" state
      "state": "Contract",
      "subState": null,
      "microState": null,
      "access": {
        "Consignee.Admin":    "RW",   // can read + write documents in Contract state
        "Consignee.OSD4":     "RW",
        "Consignee.Planners": "RO",   // read-only — can see but not write
        "Consignee.Viewer":   "RO",
        "FF.FF":              "RW",
        "CHA.CHA":            "N/A"   // Contract state documents hidden from CHA
      }
    },
    {
      // SubState-level: who can trigger the "Booking" sub-phase transition
      "state": "Contract",
      "subState": "Booking",
      "microState": null,
      "access": {
        "Consignee.Admin":    "RW",   // can initiate Booking transition
        "Consignee.OSD4":     "RW",
        "Consignee.Planners": "N/A",  // Planners cannot trigger Booking transition; sub-phase hidden in UI (document still visible via state-level RO)
        "Consignee.Viewer":   "RO",   // can see Booking sub-phase detail but cannot trigger it
        "FF.FF":              "RW",
        "CHA.CHA":            "N/A"
      }
    },
    {
      // SubState-level: who can trigger "Cancelled" transition
      "state": "Contract",
      "subState": "Cancelled",
      "microState": null,
      "access": {
        "Consignee.Admin":    "RW",
        "Consignee.OSD4":     "RO",   // can see Cancelled sub-phase but cannot trigger it
        "Consignee.Planners": "RO",   // can see Cancelled sub-phase but cannot trigger it
        "Consignee.Viewer":   "RO",   // can see Cancelled sub-phase but cannot trigger it
        "FF.FF":              "RW",
        "CHA.CHA":            "N/A"
      }
    }
  ],

  "createdAt": 1712059564379,
  "version": "1.0.0"
}
```

### 6.5 `offchain_sm_definitions`

**Written by SyncFactory** via `define` mnemonic. Defines the workspace's offchain reference data collections as a single OffChain SM — an SM-like structure where each **state** represents one collection (either a `registry` of many keyed records or a versioned `config` single-document).

When SyncFactory or ParamGateway creates/updates offchain data, it writes to `offchain_registry_{collectionName}` or `offchain_config_{collectionName}` in the **SuperApp DB** (`{subdomain}_{superappId[0:8]}`). Offchain data is shared across all orgs — it does not live in the Org Partition DB.

**Two shapes per state:**
- `"shape": "registry"` → stored as `offchain_registry_{collectionName}` — keyed lookup, many rows, one document per record. Requires `keyField`.
- `"shape": "config"` → stored as `offchain_config_{collectionName}` — versioned single-document config. Supports `"versioned": true`.

Visibility controls replication to partners: `"all_partners"` = replicate to all org partitions; `"internal_only"` = owner org only.

```javascript
{
  "_id": "public:0x4f9a2c81...",                  // blockchain hash — same format as onchain_sm_definitions._id, synced by SyncFactory via define mnemonic
  "name": "Bosch EXIM OffChain SM",
  "desc": "OffChain reference data for Bosch EXIM workspace",

  // Each key is a logical collection — equivalent to a "state" in this SM
  "states": {

    // ─── Shape A: Config — versioned single-document ───
    "Divisions": {
      "desc": "Organizational divisions and units",
      "shape": "config",
      "schema": "public:0x33c932...",              // → offchain_schema_definitions._id
      "visibility": "all_partners",                // replicate to all org partitions
      "versioned": true,
      "collection": "offchain_config_Divisions"    // collection name in SuperApp DB
    },
    "PlantTimings": {
      "desc": "Plant operating hours and schedules",
      "shape": "config",
      "schema": "public:0x81a5e0...",
      "visibility": "internal_only",
      "versioned": true,
      "collection": "offchain_config_PlantTimings"
    },

    // ─── Shape B: Registry — keyed rows, many records ───
    "PriceList": {
      "desc": "Product pricing information",
      "shape": "registry",
      "schema": "public:0xf02dbb...",
      "visibility": "internal_only",
      "versioned": false,
      "keyField": "sku",                           // primary key for this registry — used by GET /offchain/registry/:name/:keyValue
      "collection": "offchain_registry_PriceList"
    },
    "HSNMappings": {
      "desc": "HSN code to tax rate mappings",
      "shape": "registry",
      "schema": "public:0x766576...",
      "visibility": "all_partners",
      "versioned": false,
      "keyField": "hsnCode",
      "collection": "offchain_registry_HSNMappings"
    }
  },

  "ExchangeParamID": [{ "paramID": "0x5e282dE1..." }],
  "orgParamID": "0x8DeE40B6...",
  "version": "1.0.0",
  "createdAt": 1712059564379
}
```

### 6.6 `offchain_schema_definitions`

**Written by SyncFactory** via `define` mnemonic. Field schemas for offchain registry and config collections. Structurally **identical** to `onchain_schema_definitions` — same `_id` format (`public:0x<hash>`), same `displayName` / `desc` / `version` / `properties` shape, same `order`/`hidden` contract on every leaf field. Referenced by `offchain_sm_definitions.states[name].schema`. Key differences from onchain:

- Typically has a **single group** (the logical namespace for that registry/config collection)
- All group types are `"object"` — no party contacts in offchain master data
- Field names are plain semantic names with no prefix (the group already provides the namespace context)

```javascript
// Registry schema — EntityDivisionPlantMaster
{
  "_id": "public:0xf02dbb30...",          // blockchain hash — synced by SyncFactory
  "displayName": "Entity-Division-Plant Master",
  "desc": "Off-chain registry schema for Entity-Division-Plant Master",
  "version": "1.0",

  "properties": {
    "EntDivPlant": {                       // single group = logical namespace
      "type": "object",
      "desc": "Entity division plant details",
      "properties": {
        "Entity":    { "type": "string",  "required": true,  "title": "Entity",        "order": 1 },
        "Division":  { "type": "string",  "required": true,  "title": "Division/GB",   "order": 2 },
        "Plant":     { "type": "string",  "required": true,  "title": "Plant",         "order": 3 },
        "Consignee": { "type": "string",  "required": true,  "title": "Consignee Name","order": 4 }
      }
    }
  }
}

// Config schema — DemurrageMaster
{
  "_id": "public:0xaeac81ee...",
  "displayName": "Demurrage Master",
  "desc": "Off-chain config schema for Demurrage Master",
  "version": "1.0",

  "properties": {
    "Demurrage": {
      "type": "object",
      "desc": "Demurrage rate configuration",
      "properties": {
        "FreeDaysSea": { "type": "number", "required": true, "title": "Free Days (Sea)", "order": 1 },
        "FreeDaysAir": { "type": "number", "required": true, "title": "Free Days (Air)", "order": 2 },
        "RatePerDay":  { "type": "number", "required": true, "title": "Rate Per Day",    "order": 3 },
        "Currency":    { "type": "string", "required": true, "title": "Currency",        "order": 4 }
      }
    }
  }
}
```

> **How offchain definitions connect to offchain data in SuperApp DB:**
> 1. `param_definitions.offchain_sm_definitions` defines the collection name and schema
> 2. SyncFactory/ParamGateway creates records in `offchain_registry_{collectionName}` or `offchain_config_{collectionName}` in the **SuperApp DB** (`{subdomain}_{superappId[0:8]}`)
> 3. Query Engine reads the data from the SuperApp DB, validates/presents fields using the schema from `param_definitions.offchain_schema_definitions`
> 4. The `linkedSuperApps[]` field tells Query Engine which offchain collections are relevant for a given SuperApp context

---

## 7. Domain DB — Collection Schemas

Database: `param_saas` (global singleton). Writer: Platform Manager. Used for workspace registry and global user index.

Two collections: `subdomains` and `subdomain_users`.

### 7.1 `subdomains`

One document per workspace (subdomain).

```javascript
{
  "_id": "bosch-exim",
  "subdomain": "bosch-exim",
  "workspaceName": "Bosch Export-Import Platform",
  "ownerParamId": "0x6193b497...",         // owner org paramId
  "ownerOrgName": "Bosch Chassis Systems India",
  "status": "active",                      // "active" | "suspended" | "pending"
  "createdAt": 1740484800000,
  "updatedAt": 1740484800000
}
```

### 7.2 `subdomain_users`

Global user index. Records which subdomains each user has access to. Platform Manager updates this whenever a user is added to a SuperApp (`app_users` insert).

```javascript
{
  "_id": "user:0x878042B8...",
  "email": "scm@bosch.com",
  "name": "SCM Team Lead",
  "userId": "0x878042B8...",             // SHA256(email) — stable across workspaces
  "paramId": "0x6193b497...",         // org this user belongs to (all users in same org share this)
  "subdomains": ["bosch-exim", "bosch-procurement"],    // all subdomains this user has access to
  "createdAt": 1740484800000,
  "updatedAt": 1740484800000
}
```

---

## 8. Workspace DB — Collection Schemas

Database: `{subdomain}` (e.g. `bosch-exim`). Named directly after the subdomain; no prefix. Writers: Platform Manager, Notification Engine.

Scope: Workspace-scoped infrastructure needed before any SuperApp context is established — installed SuperApps list, plants, tax/holiday masters, email config, workspace-level notification collections.

### 8.1 `installed_superapps`

Workspace needs to know which SuperApps are available **before** any org or user context is established — so any user entering the workspace can discover available SuperApps. This is why it lives in the Workspace DB rather than the SuperApp DB.

```javascript
{
  // _id = superAppId from superapp_definitions — no new ID generated
  "_id": "86bbaa780565662b3154",

  // ── copied from param_definitions.superapp_definitions on install ──
  "name": "Bosch EXIM",
  "desc": "Export & Import Shipment Automation",
  "version": "1.0.0",
  "roles": [
    {
      "name": "Consignee",
      "desc": "Import buyer",
      "teams": [
        { "name": "Admin",    "desc": "Full administrative access" },
        { "name": "OSD4",     "desc": "Overseas Dispatch 4" }
        // ... full teams list copied as-is
      ]
    },
    { "name": "FF",  "desc": "Freight Forwarder", "teams": [{ "name": "FF", "desc": "Freight Forwarder operations" }] },
    { "name": "CHA", "desc": "Customs House Agent", "teams": [{ "name": "CHA", "desc": "Customs operations" }] }
  ],
  "linkedSMs": [
    "@sm/Commerce:public:0xe1ec34e6...",
    "@sm/Commerce:public:0x94a7d022...",
    "@sm/Catalogue:public:0x52a6ae9e..."
  ],
  "sponsor": "Consignee",
  "paramId": "0xDF01114A...",              // deployer's org (the installing workspace's org paramId)

  // ── installation metadata ──
  "status": "active",                      // "active" | "suspended" | "archived"
  "installedAt": 1740484800000,
  "installedBy": "0x878042B8..."           // userId of the workspace admin who installed
}
```

### 8.2 `plants`

Each plant is tagged with `paramId` so plants are org-owned, not shared. Sponsor plants are written directly by Wallet Backend. Partner plants are written by Wallet Backend when the Partner SM substate reaches `Active`.

```javascript
{
  "_id": "plant:1810",
  "code": "1810",
  "name": "Bosch Chennai Plant",
  "paramId": "0x6193b497...",
  "location": {
    "city": "Chennai",
    "state": "Tamil Nadu",
    "country": "IN"
  },
  "isActive": true,
  "createdAt": 1740484800000
}
```

### 8.3 `tax_master`

```javascript
{
  "_id": "tax:GSTIN:AABCK1234R",
  "type": "GSTIN",
  "value": "29AABCK1234R1Z5",
  "paramId": "0x6193b497...",
  "plantCode": "1810",
  "isActive": true
}
```

### 8.4 `holiday_calendars`

```javascript
{
  "_id": "holiday:2026:IN:MH",
  "year": 2026,
  "country": "IN",
  "state": "MH",
  "holidays": [
    { "date": "2026-01-26", "name": "Republic Day" },
    { "date": "2026-08-15", "name": "Independence Day" }
  ]
}
```

### 8.5 `email_config`

SMTP config is workspace infrastructure shared by all SuperApps. Lives here once, not duplicated per SuperApp.

```javascript
{
  "_id": "emailconfig:main",
  "senderName": "Bosch Platform Notifications",
  "senderEmail": "no-reply@bosch-exim.param.com",
  "replyTo": "support@bosch.com",
  "smtp": {
    "host": "smtp.sendgrid.net",
    "port": 587,
    "user": "apikey",
    "passRef": "vault:smtp/bosch-exim"
  }
}
```

### 8.6 Notification Collections (workspace-level)

For workspace-level events (user invited, SuperApp installed, org registered). Shown on the workspace screen, not inside any SuperApp. SuperApp-level equivalents live in the SuperApp DB (Section 9.5).

- `notification_templates` — templates for workspace-level events
- `notification_preferences` — per-user channel prefs for workspace-level notifications
- `notification_logs` — delivery audit trail for workspace-level notification events
- `notification_inbox` — in-app inbox for workspace-level notifications

---

## 9. SuperApp DB — Collection Schemas

Database: `{subdomain}_{superappId[0:8]}` (e.g. `bosch-exim_86bbaa78`). One SuperApp DB per installed SuperApp per workspace. Writers: Platform Manager (`organizations`, `app_users`, `team_rbac_matrix`), SyncFactory/ParamGateway (offchain data), Notification Engine (superapp-level notifications).

All participating orgs share the same SuperApp DB. Platform state (organizations, app_users, team_rbac_matrix) is stored here once; a single `{userId, superappId}` lookup in `app_users` resolves role, team, and plant. Offchain registry/config collections also live here and are shared across orgs.

### 9.1 `organizations`

One document per org-role-vendor binding per SuperApp. Answers: **which actual organizations play which roles?** Maps abstract role names (Consignee, FF, CHA) to real org paramIds.

- **Sponsor org**: one record per role (enforced). Created automatically on `installSuperApp`.
- **Partner/vendor orgs**: multiple records allowed for the same role and even the same org (`paramId`). Each record is differentiated by `org.partnerId` (the sponsor-assigned vendor ID, `Contact.C_InternalID`). One org entity can be onboarded multiple times under different vendor IDs — each represents a distinct vendor relationship with its own plant assignments.

**No unbound placeholder documents**: If a role has not yet been filled by any org, there are simply no documents for that role. There is no `org: null` placeholder pattern.

**Conflict rules:**
- Sponsor: conflict = same `role` + same `org.paramId` (one sponsor record per role).
- Partner/vendor: conflict = same `role` + same `org.partnerId` (same vendorId cannot be registered twice for the same role, but different vendorIds for the same org are allowed).

**`org` object** — all org-level info lives here. `paramId` and `name` are required; all others optional.

```javascript
// Sponsor org (bound automatically on installSuperApp)
{
  "_id": "org:{superAppId}:{role}:{paramId[2:22]}",
  // e.g. "org:superapp:bosch-exim-import:Consignee:6193b497f8e2a1d340b2"
  "superAppId": "superapp:bosch-exim-import",
  "role": "Consignee",
  "isSponsorOrg": true,
  "org": {
    "paramId":   "0x6193b497...",           // required — blockchain address
    "name":      "Bosch Chassis Systems India", // required — display name
    "taxId":     "29AABCB1234F1Z5",         // optional
    "legalName": "Bosch Chassis Systems India Pvt Ltd", // optional — registered name
    "telephone": "+91-80-12345678",          // optional
    "address": {                             // optional
      "street":     "Plot 12, Industrial Area",
      "city":       "Bengaluru",
      "state":      "Karnataka",
      "postalCode": "560058",
      "country":    "India"
    }
  },
  "orgAdmin": null,                          // null for sponsor org
  "status": "active",                        // "active" | "suspended"
  "onboardedAt": 1740484800000,
  "updatedAt": 1740484800000
}

// Partner/vendor org — org.partnerId is the differentiator; same org can appear multiple times
{
  "_id": "org:{superAppId}:{role}:{paramId[2:22]}:{vendorId}",
  // e.g. "org:superapp:bosch-exim-import:FF:40af9b6a3f8b1c2d7e4f:LSP001"
  "superAppId": "superapp:bosch-exim-import",
  "role": "FF",
  "isSponsorOrg": false,
  "org": {
    "paramId":   "0x40Af9B6a...",           // required
    "name":      "Kuehne+Nagel",            // required
    "partnerId": "LSP001",                  // required for vendor orgs — sponsor-assigned vendor/LSP ID
    "taxId":     "27AABCK5310P1ZR",         // optional
    "legalName": "Kuehne + Nagel India Pvt Ltd", // optional
    "telephone": "+91-22-67891234",          // optional
    "address": {                             // optional
      "street":     "Tower 2, BKC",
      "city":       "Mumbai",
      "state":      "Maharashtra",
      "postalCode": "400051",
      "country":    "India"
    }
  },
  "orgAdmin": "admin@kn.com",
  "status": "active",
  "onboardedAt": 1740484800000,
  "updatedAt": 1740484800000
}

// Same org, different vendorId — separate record, distinct vendor relationship
{
  "_id": "org:superapp:bosch-exim-import:FF:40af9b6a3f8b1c2d7e4f:LSP002",
  "superAppId": "superapp:bosch-exim-import",
  "role": "FF",
  "isSponsorOrg": false,
  "org": {
    "paramId":   "0x40Af9B6a...",           // same paramId as LSP001 record
    "name":      "Kuehne+Nagel",
    "partnerId": "LSP002"                   // different vendor ID → different record
  },
  "orgAdmin": "admin@kn.com",
  "status": "active",
  "onboardedAt": 1740484900000,
  "updatedAt": 1740484900000
}
```

### 9.2 `app_users`

**One document per user per vendor context within a SuperApp.**

- **Sponsor org users**: one document per user per SuperApp. `_id = "user:{superAppId}:{userId}"`.
- **Vendor org users**: one document per user per (SuperApp, partnerId). `_id = "user:{superAppId}:{userId}:{partnerId}"`. If the same org is onboarded as LSP001 and LSP002, the org admin has **two separate `app_users` documents** — each with its own scoped `plantTeams`. This keeps plant assignments cleanly separated by vendor relationship.

**Plant-Team Matrix design**: A user can belong to multiple teams at each plant. A user can also appear in multiple vendor contexts in the same SuperApp (one `app_users` doc per vendor context). `plantTeams` within each doc is scoped entirely to that vendor relationship's plants.

At query time, the RBAC engine fetches **all** `app_users` documents for `{ userId, superAppId }`, then finds the one whose `plantTeams` overlaps with the document's plant. This means a vendor org admin with multiple `partnerId` contexts automatically gets the right plant/team scope for each document they access.

```javascript
// Sponsor org user (Bosch employee — Consignee role, different teams at different plants)
{
  "_id": "user:{superAppId}:{userId}",
  // e.g. "user:superapp:bosch-exim-import:a1b2c3d4..."
  "superAppId": "superapp:bosch-exim-import",
  "userId": "a1b2c3d4...",              // SHA256(email) — stable across workspaces
  "email": "scm@bosch.com",
  "orgParamId": "0x6193b497...",        // org this user belongs to
  "role": "Consignee",
  // no partnerId — sponsor users are not scoped to a vendor relationship

  "plantTeams": [
    { "plant": "1810", "teams": ["OSD4", "Planners"] },
    { "plant": "1820", "teams": ["Planners"] },
    { "plant": "1830", "teams": ["Viewer"] }
  ],

  "isOrgAdmin": false,
  "status": "active",                   // "active" | "suspended" | "pending"
  "addedAt": 1740484800000,
  "addedBy": "0x6193b497...",
  "updatedAt": 1740484800000
}

// Vendor org admin — K+N onboarded as LSP001 (handles INNSA1 and JNPT ports)
{
  "_id": "user:{superAppId}:{userId}:{partnerId}",
  // e.g. "user:superapp:bosch-exim-import:b3c4d5e6...:LSP001"
  "superAppId": "superapp:bosch-exim-import",
  "userId": "b3c4d5e6...",              // SHA256(admin@kn.com)
  "email": "admin@kn.com",
  "orgParamId": "0x40Af9B6a...",
  "role": "FF",
  "partnerId": "LSP001",               // scoped to this vendor relationship

  // plantTeams scoped to LSP001 — only the ports this vendor context covers
  "plantTeams": [
    { "plant": "INNSA1", "teams": ["FF"] },
    { "plant": "JNPT",   "teams": ["FF"] }
  ],

  "isOrgAdmin": true,
  "status": "active",
  "addedAt": 1740484800000,
  "addedBy": "system",
  "updatedAt": 1740484800000
}

// Same user (same email), same org — but different vendor context (LSP002 handles different ports)
{
  "_id": "user:superapp:bosch-exim-import:b3c4d5e6...:LSP002",
  "superAppId": "superapp:bosch-exim-import",
  "userId": "b3c4d5e6...",             // same userId — same person
  "email": "admin@kn.com",
  "orgParamId": "0x40Af9B6a...",       // same org
  "role": "FF",
  "partnerId": "LSP002",               // different vendor context → separate document

  // plantTeams scoped to LSP002 — completely separate port set
  "plantTeams": [
    { "plant": "BOMBAY", "teams": ["FF"] },
    { "plant": "COCHIN", "teams": ["FF"] }
  ],

  "isOrgAdmin": true,
  "status": "active",
  "addedAt": 1740484900000,
  "addedBy": "system",
  "updatedAt": 1740484900000
}
```

**Runtime plant-team resolution (updated for multi-vendor):**
```typescript
// When evaluating L2 for a document:
// 1. Fetch ALL app_users docs for this user+superApp
const allUserContexts = await appUsersCollection.find({ userId, superAppId }).toArray();

// 2. Get the doc's plants for the caller's org
const docPlants = doc._chain._sys.plantIDs?.[callerOrgParamId] ?? [];

// 3. Find the vendor context whose plantTeams overlaps with the doc's plants
//    (for sponsor users there is only one context; for vendor users, pick the matching one)
const matchingContext = allUserContexts.find(ctx =>
  ctx.plantTeams.some(pt => docPlants.includes(pt.plant))
);
if (!matchingContext) return null; // user has no access for this document's plant

// 4. Resolve teams from the matching context
const plantTeamEntry = matchingContext.plantTeams.find(pt => docPlants.includes(pt.plant));
const teams = plantTeamEntry?.teams ?? [];

// 5. Look up team_rbac_matrix → most permissive access across all teams (RW > RO > N/A)
```

### 9.3 `team_rbac_matrix`

Exact copy of `param_definitions.team_rbac_matrix` on install — including `_id`. Schema, document structure, and IDs are identical — see **Section 6.4** for the full schema. All orgs in this SuperApp share the same copy. Workspace admin can override permission entries post-install via the Team RBAC API.

### 9.4 `offchain_registry_{Name}` and `offchain_config_{Name}`

Offchain reference data shared across all orgs in this SuperApp. Written by SyncFactory/ParamGateway. Read by Query Engine. No org partition needed — single write serves all orgs.

- `offchain_registry_{Name}` — keyed lookup tables (port master, container master, division master, etc.)
- `offchain_config_{Name}` — versioned single-record configs (demurrage master, IEC/AD code master, etc.)

Collection names are derived from `param_definitions.offchain_sm_definitions.states[stateName].collection`. See Section 6.5 for the offchain SM definition structure.

```
offchain_registry_EntityDivisionPlantMaster
offchain_registry_ContainerMaster
offchain_registry_PortMaster
offchain_registry_FfChaMapping
offchain_config_IecAndAdCodeMaster
offchain_config_DemurrageMaster
```

### 9.5 Notification Collections (superapp-level)

SuperApp-level events (state transition, new document, user added, partner org onboarded). Shown only when the user is inside this SuperApp.

- `notification_templates` — templates for superapp-level events
- `notification_preferences` — per-user channel prefs scoped to this SuperApp
- `notification_logs` — delivery audit trail for superapp-level events
- `notification_inbox` — in-app inbox for superapp-level notifications

### 9.6 `notification_templates` (example schema)

```javascript
{
  "_id": "template:superapp:bosch-exim-import:state_transition",
  "superAppId": "superapp:bosch-exim-import",
  "eventType": "state_transition",
  "channels": {
    "email": {
      "subject": "{{smName}} — {{state}} updated",
      "body": "<p>Document {{docId}} transitioned to {{state}}.{{subState}}</p>"
    },
    "inApp": {
      "title": "{{smName}} Updated",
      "body": "{{state}} changed by {{actorName}}"
    },
    "slack": {
      "text": "{{smName}}: {{state}} → {{nextState}} by {{actorName}}"
    }
  }
}
```

---

## 10. Org Partition DB — Collection Schemas

Database: `{subdomain}_{superappId[0:8]}_{org[2:22]}_{portal}`. One per participating org per SuperApp. Examples: `bosch-exim_86bbaa78_6193b497f8e2a1d340b2_Consignee` (Bosch), `bosch-exim_86bbaa78_40af9b6a3f8b1c2d7e4f_FF` (K+N).

Writers: SyncFactory (SM documents, txn_history, chain_head); Wallet Backend (drafts only). Platform state (RBAC, users, org bindings) lives in the SuperApp DB; the Org Partition DB holds only org-scoped business data and drafts.

### 10.1 `drafts`

Pre-submission drafts are per-user per-org. Bosch's drafts must not be visible to K+N — hence they live in the Org Partition DB, not the shared SuperApp DB.

```javascript
{
  "_id": "draft:0x878042B8:1740484800000",
  "superAppId": "superapp:bosch-exim-import",
  "smId": "public:0xe1ec34e6...",
  "state": "Contract",
  "subState": "Booking",
  "userId": "0x878042B8...",
  "data": { /* business payload matching schema */ },
  "createdAt": 1740484800000,
  "updatedAt": 1740484800000,
  "expiresAt": 1740571200000
}
```

### 10.2 `sm_{state}_{smId[0:6]}`

(SyncFactory writes; Wallet Backend reads only.)

Collection name derived from the SM's primary state and first 6 chars of smId hash.
Example: `sm_Contract_e1ec34`, `sm_Customs_def567`

```javascript
{
  "_id": "0xf97a54af...",                // docId (blockchain generated)

  // Business payload — domain-specific fields matching schema
  "DocDetails": {
    "D_OrderNumber": "Exim050220265296",
    "D_Date": "2026-02-05",
    "D_Type": "Import"
  },
  "Buyer": {
    "C_Organization": "BOSCH CHASSIS SYSTEMS INDIA PVT LTD",
    "C_PlantID": "1810",
    "C_Email": "scm@bosch.com"
  },
  "Seller": {
    "C_Organization": "Kuehne+Nagel",
    "C_Email": "ops@kn.com"
  },

  // Org-level visibility snapshot (for UI participant display and partnerId filtering).
  // C_InternalID is populated by SyncFactory for vendor/partner roles — it is the sponsor-assigned
  // vendor ID (Contact.C_InternalID from the Partner SM) and is used by the Query Engine to apply
  // partnerId-scoped document filtering when a vendor user passes partner_id in the request.
  "_participants": {
    "Consignee": {
      "C_Organization": "BOSCH CHASSIS SYSTEMS INDIA PVT LTD",
      "C_Email": "scm@bosch.com"
      // no C_InternalID for sponsor role
    },
    "FF": {
      "C_Organization": "Kuehne+Nagel",
      "C_Email": "ops@kn.com",
      "C_InternalID": "LSP001"   // vendor's internal ID — set by SyncFactory from Partner SM Contact.C_InternalID
    }
  },

  // Author-controlled fields — HASHED as part of docEntropy
  "_chain": {
    "smId": "public:0xe1ec34e6...",
    "stateTo": "Contract:Booking",         // State:SubState~MicroState format
    "roles": {
      "Consignee": "0x6193b497...",        // org paramId for each role
      "FF": "0x40Af9B6a...",
      "CHA": "0x56C865EB..."
    },
    "refs": {
      "stateTo": null,                     // linked SM state reference (if applicable)
      "smId": null,
      "docIds": []
    },
    "docOwner": "0x878042B8...",           // userId (SHA256 of email) of the user who created this doc
    "_sys": {
      "restrictedTo": [],                  // user-level restrictions (optional)
      "plantIDs": {
        "0x6193b497...": ["1810"]          // org → plant restrictions
      }
    }
  },

  // SyncFactory-enriched fields — NOT hashed (added post-block-confirmation)
  "_local": {
    "txnId": "private:0x21d468ef...",
    "rootTxn": "private:0x2b64ede3...",   // first txn in the chain
    "prevTxn": "private:0xccf60ba9...",   // previous txn
    "sequence": 15,                        // how many transitions so far
    "blockNumber": 3749452,
    "blockHash": "0x9a74ad73...",
    "timestamp": 1770447080,
    "mnemonic": "transition",             // "create" | "transition"
    "phase": "Agreement",                 // resolved from SM definition
    "state": "Contract",                  // current top-level state
    "subState": "Booking",               // current substate (null if at state level)
    "microState": null,                  // current microstate (null if none)
    "workspace": "bosch-exim",
    "superAppId": "superapp:bosch-exim-import",
    "portal": "Consignee"
  }
}
```

### 10.3 `txn_history`

```javascript
{
  "_id": "private:0x21d468ef...",          // txnId
  "docId": "0xf97a54af...",
  "smId": "public:0xe1ec34e6...",
  "rootTxn": "private:0x2b64ede3...",
  "prevTxn": "private:0xccf60ba9...",
  "sequence": 15,
  "stateTo": "Contract:Booking",
  "changeType": "state_transition",        // "state_transition" | "update_in_state"
  "blockNumber": 3749452,
  "blockHash": "0x9a74ad73...",
  "timestamp": 1770447080,
  "actor": "0x878042B8...",                // userId (SHA256 of email)
  "mnemonic": "transition",
  "docEntropy": "e0bf169f..."             // hash of (payload + _chain)
}

// Indexes:
// { docId: 1, sequence: 1 }   → chain traversal
// { rootTxn: 1 }               → find full chain
// { smId: 1, stateTo: 1 }     → state-level queries
// { timestamp: -1 }            → recent activity
```

### 10.4 `chain_head`

Latest state pointer per document (maintained atomically by SyncFactory):

```javascript
{
  "_id": "0xf97a54af...",                  // docId
  "smId": "public:0xe1ec34e6...",
  "latestTxn": "private:0x21d468ef...",
  "latestTxnHash": "0x...",
  "sequence": 15,
  "stateTo": "Contract:Booking",
  "rootTxn": "private:0x2b64ede3...",
  "timestamp": 1770447080
}
```


---

## 11. User Access Lookup — Design Rationale

User access queries are served by existing collections without a separate `user_management` database:

1. **"Which workspaces does this user have access to?"** → `param_saas.subdomain_users[userId].subdomains[]`. Platform Manager adds the workspace to this array whenever a user is added to any SuperApp in that workspace.

2. **"What is the user's role/team within a SuperApp?"** → `sapp.app_users` queried by `{ userId }` in the SuperApp DB. The client sends `X-SuperApp-ID` and `X-Workspace` headers, so the SuperApp DB is directly resolved from request context — no global scan needed.

3. **"Session-time platform context (middleware)"** → `platformContextMiddleware` reads `sapp.app_users` once per request for the resolved SuperApp DB. This single lookup provides role, plantTeams, and orgAdmin status for the entire request lifecycle.

This design works because the client always tells the server which SuperApp context it is operating in. The server never needs to discover context from scratch.

**Cross-workspace dashboard:** Query `param_saas.subdomain_users[userId].subdomains[]`, then for each workspace list `ws.installed_superapps`. This is a bounded, predictable traversal.

For the `param_saas.subdomain_users` collection schema, see **Section 7.2**.

---

## 12. Auth DB

Database name: `param_auth` (global singleton, written and read by **Wallet Backend / Auth Gate**).

One collection per org-level identifier: `{paramId}` (e.g., `0x6193b497...`). `paramId` is the canonical org identifier used everywhere in the platform.

```javascript
{
  "_id": "session:tokenHash",          // SHA256(token) with "session:" prefix
  "userId": "0x878042B8...",           // SHA256(email) — stable across workspaces
  "email": "user@example.com",         // raw email for display and lookup
  "paramId": "0x6193b497...",          // org-level Param ID (0x... Ethereum address, partition key for this collection)
  "pennId": "EHPI1668",                // EHPI-style identifier associated with this org/user
  "token": "encrypted.jwt.token",      // access token returned to the client
  "refreshToken": "refresh-token-uuid",
  "issuedAt": 1740484800000,
  "expiresAt": 1740571200000,
  "deviceInfo": { "ua": "...", "ip": "..." },
  "createdAt": 1740484800000,
  "lastActiveAt": 1740484800000
}
```

Wallet Backend writes a session document here on successful OTP / SSO verification, and reads from the appropriate `{paramId}` collection during auth middleware and refresh/logout flows to validate incoming requests.

---

## 13. Notification Storage Model

Notifications are co-located with the data they relate to rather than in a separate database. This keeps all data for a given scope in one place.

**Routing by event scope:**
- **Workspace-level events** (user invited, SuperApp installed, org registered) → read templates and prefs from `{subdomain}`, write logs and inbox to `{subdomain}`
- **SuperApp-level events** (state transition, new document, user added, partner onboarded) → read templates and prefs from `{subdomain}_{superappId[0:8]}`, write logs and inbox to `{subdomain}_{superappId[0:8]}`
- **SMTP config** → always from `{subdomain}.email_config`, regardless of event scope — one config shared by all SuperApps in the workspace

The four notification collections (`notification_templates`, `notification_preferences`, `notification_logs`, `notification_inbox`) exist at both levels. See Section 8.6 (workspace-level) and Section 9.5 (superapp-level) for schemas.

---

## 14. Five-Engine Architecture

Wallet Backend is split into five engines (Fastify plugins), each mounted at a distinct prefix. Shared infrastructure: MongoDB pool, DB resolver, NATS client, auth middleware, request-context middleware, RBAC middleware.

> **Implementation scope:** Engines 1–3 (Platform Manager, Query Engine, Auth Gate) are in the **current scope**. **Engine 4 (Realtime Relay)** and **Engine 5 (Notification Engine)** are **future implementations** — specified here for architectural completeness but not part of the initial build.

```
Wallet Backend
├── Engine 1: Platform Manager   → workspace, superapp, RBAC, users, organizations, plants
├── Engine 2: Query Engine       → documents, actions, chain, offchain (READ ONLY)
├── Engine 3: Auth Gate          → thin ENN proxy for OTP, SSO, session
├── Engine 4: Realtime Relay     → NATS → WebSocket/SSE to browser          [FUTURE]
└── Engine 5: Notification Eng   → NATS → email/Slack/WhatsApp/in-app       [FUTURE]
```

Shared infrastructure: MongoDB connection pool (`db/mongo.ts`), DB resolver (`db/resolver.ts`), NATS JetStream client (`nats/client.ts`), auth middleware (`request.authContext`), request-context middleware (`request.requestContext`), RBAC middleware (role-based guards).

---

## 15. Engine 1: Platform Manager — Full API Spec

Base path: `/api/v1`. All requests require `Authorization: Bearer <token>`, `X-Param-ID`, `X-Workspace` headers unless noted otherwise. **Exception:** `GET /profile` can be called without `X-Workspace` and `X-SuperApp-ID` (e.g. post-login); when absent, only user profile is returned.

**Standard error response** (all engines):
```json
{ "error": "<human-readable message>", "code": "<optional-error-code>" }
```
| HTTP | When |
|------|------|
| 400 | Bad request — invalid body, missing required param, schema validation failure |
| 401 | Unauthorized — missing/invalid token, session expired |
| 403 | Forbidden — valid token but RBAC blocks access |
| 404 | Not found — resource (doc, org, user, etc.) does not exist |
| 409 | Conflict — duplicate key, org already onboarded, etc. |
| 502 | Bad gateway — ENN or external service unavailable |

---

### 15.1 Workspace APIs

**Database:** `param_saas.subdomains`, `param_saas.subdomain_users`, `{subdomain}`

```
POST   /workspace/create
```
**Body:** `{ subdomain, workspaceName, ownerOrgName? }`
**Guard:** Authenticated. No RBAC (bootstrap — caller becomes first workspace admin).
**Action:** Creates `param_saas.subdomains` entry, initializes `{subdomain}` Workspace DB.
**Response:**
```json
{ "subdomain": "bosch-exim", "workspaceName": "Bosch EXIM", "createdAt": 1740484800000 }
```

---

```
GET    /workspace/list
```
**Guard:** Authenticated.
**Reads:** `param_saas.subdomain_users[caller.userId].subdomains` → resolve from `param_saas.subdomains`.
**Response:**
```json
[{ "subdomain": "bosch-exim", "workspaceName": "Bosch EXIM" }]
```

---

```
GET    /workspace
```
**Guard:** Authenticated.
**Reads:** `param_saas.subdomains` where `subdomain = X-Workspace`.
**Response:** Full `param_saas.subdomains` document for the current workspace.
```json
{ "subdomain": "bosch-exim", "workspaceName": "Bosch EXIM", "createdAt": 1740484800000 }
```

---

```
PUT    /workspace
```
**Body:** `{ workspaceName }`
**Guard:** Workspace admin.
**Action:** Updates `workspaceName` in `param_saas.subdomains`.
**Response:** Updated subdomains document. Same shape as GET /workspace: `{ subdomain, workspaceName, createdAt }`.

---

```
GET    /workspace/plants
```
**Guard:** Authenticated.
**Reads:** `{subdomain}.plants`
**Response:**
```json
[{ "code": "1810", "name": "Nasik Plant", "paramId": "0x...", "location": "Nasik, MH", "isActive": true }]
```

---

```
POST   /workspace/plants
```
**Body:** `{ code, name, paramId, location }`
**Guard:** Workspace admin.
**Action:** Inserts into `{subdomain}.plants`.
**Response:** Created plant document. Shape: `{ code, name, paramId, location, isActive: true }` — same as GET /workspace/plants items.

---

```
PUT    /workspace/plants/:plantCode
```
**Body:** `{ name?, location? }`
**Guard:** Workspace admin.
**Action:** Updates matching plant in `{subdomain}.plants`.
**Response:** Updated plant document. Same shape as GET /workspace/plants items.

---

```
DELETE /workspace/plants/:plantCode
```
**Guard:** Workspace admin.
**Action:** Sets `isActive: false` in `{subdomain}.plants`.
**Response:** `{ "code": "1810", "isActive": false }`

---

### 15.2 Profile APIs

**Databases:** `param_saas.subdomain_users`, `{subdomain}_{superAppId[0:8]}.organizations` (when org context present)

```
GET    /profile
```
**Headers:** `X-Workspace` and `X-SuperApp-ID` are **optional**. When both present, response includes org profile.
**Query params:** `partnerId` (optional) — for partner orgs with multiple vendor IDs; when provided with org context, returns single org doc.
**Guard:** Authenticated.
**Reads:** `param_saas.subdomain_users` (always); `sapp.organizations` (when `X-Workspace` + `X-SuperApp-ID` in request).
**Action:** Always fetches user profile. When `X-Workspace` and `X-SuperApp-ID` are present, also fetches caller's org(s) from `sapp.organizations` by `org.paramId`. If `partnerId` provided, returns single org; otherwise returns all matching org docs for that paramId.
**Response:**
```json
{
  "user": {
    "userId": "<sha256(email)>",
    "email": "scm@bosch.com",
    "name": "SCM Team Lead",
    "subdomains": ["bosch-exim", "bosch-logistics"]
  },
  "org": null
}
```
When org context present: `org` is a single document (sponsor or partner with one vendor, or partner with `partnerId`), or an array (partner with multiple vendor IDs, no `partnerId`). When no org context: `org` is `null`.

---

```
GET    /user/profile
```
**Guard:** Authenticated.
**Reads:** `param_saas.subdomain_users` where `userId = SHA256(caller.email)`.
**Response:** User profile only. Same shape as `profile.user` above:
```json
{ "userId": "<sha256(email)>", "email": "scm@bosch.com", "name": "SCM Team Lead", "subdomains": ["bosch-exim"] }
```

---

```
PUT    /user/profile
```
**Body:** `{ name }`
**Guard:** Authenticated (own profile only).
**Action:** Updates `name` in `param_saas.subdomain_users`.
**Response:** Updated subdomain_users document. Shape: `{ _id, email, userId, name, subdomains[], ... }` (Section 7.2).

---

### 15.3 Definitions APIs

**Database:** `param_definitions`

Wallet Backend reads all definition collections. It writes only `superapp_definitions` and `team_rbac_matrix`. SyncFactory writes all onchain/offchain SM and schema definitions.

**Read endpoints — all return raw documents from `param_definitions`. Response shape matches collection schema in Section 6.**

| Endpoint | Response |
|----------|----------|
| `GET /definitions/superapps` | `[{ ...superapp_definitions }]` — array. Schema: Section 6.1 |
| `GET /definitions/superapps/:superAppId` | `{ _id, name, desc, version, sponsor, roles[], linkedSMs[], ... }` — single doc. 404 if not found |
| `GET /definitions/sm` | `[{ ...onchain_sm_definitions }]` — array. Schema: Section 6.2 |
| `GET /definitions/sm/:smId` | `{ _id, defId, smType, displayName, desc, phaseMapping, roles, startAt, states, ... }` — single doc. 404 if not found |
| `GET /definitions/schemas` | `[{ ...onchain_schema_definitions }]` — array. Schema: Section 6.3 |
| `GET /definitions/schemas/:schemaId` | `{ _id, defId, displayName, desc, version, properties, ... }` — single doc. 404 if not found |
| `GET /definitions/offchain-sm` | `[{ ...offchain_sm_definitions }]` — array. Schema: Section 6.5 |
| `GET /definitions/offchain-sm/:offchainSmId` | `{ _id, name, desc, states, ... }` — single doc. 404 if not found |
| `GET /definitions/offchain-schemas/:schemaId` | `{ _id, displayName, desc, version, properties, ... }` — single doc. 404 if not found |
| `GET /definitions/team-rbac-matrix/:superAppId` | `[{ _id, superAppId, smId, smName, permissions[], ... }]` — array. Schema: Section 6.4 |
| `GET /definitions/team-rbac-matrix/:superAppId/:smId` | `{ _id, superAppId, smId, smName, permissions[], ... }` — single doc. 404 if not found |

---

```
POST   /definitions/superapps
```
**Body:**
```json
{
  "name": "Bosch EXIM Import",
  "desc": "End-to-end import workflow",
  "version": "1.0.0",
  "sponsor": "Consignee",
  "roles": [
    {
      "name": "Consignee",
      "teams": ["Admin", "OSD4", "Planners", "Viewer"]
    },
    {
      "name": "FF",
      "teams": ["FF"]
    },
    {
      "name": "CHA",
      "teams": ["CHA"]
    }
  ],
  "linkedSMs": ["@sm/ShipmentBooking:public:0xe1ec34e6...", "@sm/Catalogue:public:0x52a6ae9e..."]
}
```
**Guard:** Exchange-level admin.
**Action:** Backend generates `superAppId` (20-char hex hash), creates document in `param_definitions.superapp_definitions`.
**Response:** Created superapp_definitions document. Shape: Section 6.1 — includes `_id` (generated superAppId), `name`, `desc`, `version`, `sponsor`, `roles[]`, `linkedSMs[]`.

---

```
PUT    /definitions/superapps/:superAppId
```
**Body:** `{ name?, desc?, version?, sponsor?, roles[]?, linkedSMs[]? }` — partial or full update. Fields not sent are left unchanged.
**Guard:** Exchange-level admin.
**Action:** Updates `param_definitions.superapp_definitions` for this `superAppId`. Does not affect installed SuperApp DB copies.

**Response:** Updated superapp_definitions document. Same shape as Section 6.1. 404 if superAppId not found.

---

```
POST   /definitions/team-rbac-matrix
```
**Body:**
```json
{
  "superAppId": "86bbaa780565662b3154",
  "smId": "public:0xe1ec34e6...",
  "permissions": [
    {
      "state": "Contract",
      "subState": null,
      "microState": null,
      "access": {
        "Consignee.Admin": "RW",
        "Consignee.OSD4":  "RW",
        "Consignee.Planners": "RO",
        "Consignee.Viewer": "RO",
        "FF.FF":           "RW",
        "CHA.CHA":         "N/A"
      }
    }
  ]
}
```
**Guard:** Exchange-level admin.
**Action:** Creates `param_definitions.team_rbac_matrix` for this `superAppId + smId`. `_id = {superAppId[0:8]}:{smId}`. Workspace installs copy from this canonical record.
**Response:** Created team_rbac_matrix document. Shape: Section 6.4 — `{ _id, superAppId, smId, smName, permissions[], createdAt, version }`.

---

```
PUT    /definitions/team-rbac-matrix/:superAppId/:smId
```
**Body:** `{ permissions[] }` — full replacement of the permissions array.
**Guard:** Exchange-level admin.
**Action:** Replaces `permissions` in `param_definitions.team_rbac_matrix`. Does not cascade to installed SuperApp DB copies.
**Response:** Updated team_rbac_matrix document. Same shape as Section 6.4.

---

### 15.4 SuperApp APIs

**Databases:** `{subdomain}.installed_superapps`, `{subdomain}_{superAppId[0:8]}.*`, `param_saas.subdomain_users`

```
POST   /superapp/install
```
**Body:** `{ superAppId, orgName? }`
- `superAppId` — required; must exist in `param_definitions.superapp_definitions`
- `orgName` — optional; name for the sponsor org record created in step 4. Falls back to caller's `name` from `subdomain_users` if not provided.

**Guard:** Workspace admin.
**Action:**
1. Read `param_definitions.superapp_definitions` by `superAppId` — get all fields (name, roles, linkedSMs, sponsor, etc.)
2. Read `param_definitions.team_rbac_matrix` for all `linkedSMs`
3. Write `{subdomain}.installed_superapps` — full copy of superapp_definitions + install metadata (`paramId` = caller's org, `installedAt`, `status: "active"`)
4. Write `sapp.organizations` for the sponsor role only — `portal` derived from `superapp_definitions.sponsor`; binds caller's `paramId` with `status: "active"`; uses `orgName` (or fallback) as `org.name`
5. Write `sapp.team_rbac_matrix` for each SM — full copy from `param_definitions.team_rbac_matrix`
6. Append workspace to `param_saas.subdomain_users[caller.userId].subdomains` if not already present

**Response:** Created installed_superapps document. Shape: `{ _id, name, desc, version, sponsor, roles, linkedSMs, paramId, status: "active", installedAt, ... }` — full copy of superapp_definitions plus install metadata.

---

```
GET    /superapp
```
**Guard:** Authenticated.
**Reads:** `{subdomain}.installed_superapps`
**Response:**
```json
[
  {
    "_id": "86bbaa780565662b3154",
    "name": "Bosch EXIM Import",
    "version": "1.0.0",
    "sponsor": "Consignee",
    "status": "active",
    "installedAt": 1740484800000
  }
]
```

---

```
GET    /superapp/:superAppId
```
**Guard:** Authenticated.
**Reads:** `{subdomain}.installed_superapps`, `sapp.organizations`
**Response:** Full installed_superapps document + `orgs` — all onboarded org documents grouped by role.
```json
{
  "_id": "86bbaa780565662b3154",
  "name": "Bosch EXIM Import",
  "version": "1.0.0",
  "sponsor": "Consignee",
  "roles": [...],
  "linkedSMs": [...],
  "paramId": "0xDF01114A...",
  "status": "active",
  "installedAt": 1740484800000,
  "orgs": {
    "Consignee": [{ "_id": "...", "orgName": "Bosch India", "paramId": "0x6193b497...", "isSponsorOrg": true, "status": "active" }],
    "FF":        [{ "_id": "...", "orgName": "Kuehne+Nagel", "paramId": "0x40Af9B6a...", "isSponsorOrg": false, "status": "active" }]
  }
}
```

---

```
PUT    /superapp/:superAppId/status
```
**Body:** `{ status: "suspended" | "active" }`
**Guard:** Workspace admin.
**Action:** Updates `status` in `{subdomain}.installed_superapps`.
**Response:** `{ "_id": "86bbaa780565662b3154", "status": "suspended" }`

---

### 15.5 Org APIs

**Database:** `{subdomain}_{superAppId[0:8]}.organizations`

```
GET    /superapp/:superAppId/org/profile
```
**Query params:** `partnerId` (optional) — for partner orgs with multiple vendor IDs; when provided, returns the single org document for that vendor.
**Guard:** Authenticated; caller's org must be a member of this SuperApp (`sapp.organizations`).
**Reads:** `sapp.organizations` where `org.paramId` = caller's paramId (from session/JWT).
**Action:** Resolves caller's `paramId` from auth context. Queries `{ "org.paramId": paramId }`. If `partnerId` provided, adds `{ "org.partnerId": partnerId }` and returns single doc (404 if not found). If `partnerId` not provided, returns all matching org docs.
**Response:** Single org doc or array of org docs. Shape matches `sapp.organizations` (Section 9.2).
- Sponsor: single doc `{ _id, role, orgName, paramId, isSponsorOrg, status, ... }`
- Partner (1 vendor): single doc
- Partner (2+ vendors), no `partnerId`: array of org docs
- Partner (2+ vendors), `partnerId` provided: single doc. 404 if not found.

---

```
GET    /superapp/:superAppId/orgs
```
**Guard:** Authenticated.
**Response:** All documents from `sapp.organizations`.
```json
[
  { "_id": "86bbaa78:Consignee:6193b497f8e2a1d340b2", "role": "Consignee", "orgName": "Bosch India", "paramId": "0x6193b497...", "isSponsorOrg": true, "status": "active", "onboardedAt": 1740484800000 }
]
```

---

```
GET    /superapp/:superAppId/orgs/:role
```
**Guard:** Authenticated.
**Reads:** `sapp.organizations` where `role = :role`.
**Response:** Array of organizations documents for the given role (multiple orgs can share a role).
```json
[
  { "_id": "86bbaa78:FF:40af9b6a:LSP001", "role": "FF", "orgName": "Kuehne+Nagel", "paramId": "0x40Af9B6a...", "org": { "partnerId": "LSP001", ... }, "isSponsorOrg": false, "status": "active" }
]
```

---

```
POST   /superapp/:superAppId/partners/onboard
```
**Body:**
```json
{
  "role": "FF",
  "org": {
    "paramId":   "0x40Af9B6a...",
    "name":      "Kuehne+Nagel",
    "partnerId": "LSP001",
    "taxId":     "27AABCK5310P1ZR",
    "legalName": "Kuehne + Nagel India Pvt Ltd",
    "telephone": "+91-22-67891234",
    "address": { "street": "...", "city": "Mumbai", "state": "Maharashtra", "postalCode": "400051", "country": "India" }
  },
  "orgAdmin": "admin@kn.com",
  "plants": [
    { "code": "INNSA1", "name": "Nhava Sheva Port", "location": "Mumbai" }
  ]
}
```
**Guard:** Workspace admin.
**Action:**
1. **Conflict check:** query `sapp.organizations` for `{ role, "org.partnerId": body.org.partnerId }`. If exists → 409. Same org with a **different** `org.partnerId` is allowed — each is a distinct vendor record.
2. Insert into `sapp.organizations` — `_id = org:{superAppId}:{role}:{paramId[2:22]}:{partnerId}`, `isSponsorOrg: false`, `org` from body, `status: "active"`.
3. Upsert each plant in `{subdomain}.plants`. Plant already existing is not an error (idempotent).
4. Upsert subdomain_users record in `param_saas.subdomain_users`.
5. Upsert org admin user in `sapp.app_users` — `isOrgAdmin: true`, `plantTeams` from body `plants`.

**Response:** Created organizations document. Shape matches `sapp.organizations` (Section 9.2): `{ _id, role, org, orgAdmin, isSponsorOrg, status, onboardedAt, ... }`.
**Error 409:** When same `role` + `org.partnerId` already exists.
> **Note:** `POST /partners/onboard` is an admin override / bootstrap tool. In production, partner onboarding flows automatically from the Partner SM via NATS (see Section 15.5.1).

---

```
PUT    /superapp/:superAppId/orgs/:role/:paramId/status
```
**Body:** `{ status: "suspended" | "active" }`
**Guard:** Workspace admin.
**Action:** Updates `status` of the specific org document identified by `role + paramId`.
**Response:** `{ "role": "FF", "paramId": "0x40Af9B6a...", "status": "suspended" }`

---

### 15.5.1 Partner SM Lifecycle — Full Specification

Partner onboarding is **not primarily driven by the REST API above**. The REST API is an admin override / bootstrap fallback. The main path is through the `@sm/Partner` state machine, driven by NATS events from SyncFactory.

#### Base Template Design

`partner_sm.json` and `partner_schema.json` are the **canonical base** from which all SuperApps derive their Partner SM. The core structure — SM lifecycle, `Contact` group, `BankDetails` group, `Invitee` group — is **fixed and constant** across all SuperApps. Only SuperApp-specific parts are customised:

| Part | Fixed / Variable |
|---|---|
| SM structure — single `Partner` state, `Active`/`Inactive` substates | **Fixed** — lifecycle same for all |
| `Contact` group fields | **Fixed** — standard sponsor contact fields |
| `BankDetails` group fields | **Fixed** — standard payment fields |
| `Invitee` core fields (`C_Email`, `C_InternalID`, `C_Organization`, `C_Plants`, etc.) | **Fixed** — standard invitee fields |
| `Contact.C_Category` enum | **Variable** — sponsor role name in that SuperApp |
| `Invitee.C_Category` enum | **Variable** — partner role names in that SuperApp |
| SM `roles[]` | **Variable** — all roles in that SuperApp |
| Field `desc` / display labels | **Variable** — adapted to business domain |
| Additional schema groups | **Additive** — new business groups alongside core three |

`Contact`, `BankDetails`, `Invitee` must never be restructured or removed. Business-specific fields go in new groups added on top.

---

#### State Machine

```
smType:   @sm/Partner
smId:     public:0xa459fb407e760333115c26e41feee658b071deed58fa39bbe4b2671080615f32
schema:   public:0xb2eaef570a8901430f2432f4fb995df843cb0aba72a23e3d654227ee8b715059
startAt:  Partner
roles:    [Consignee, FF, CHA, Consignor]
phase:    Agreement
```

```
STATE: Partner
│  owner:      [Consignee, FF, CHA, Consignor]
│  visibility: [Consignee, FF, CHA, Consignor]
│
├── SUBSTATE: Active    start:true   owner: [Consignee, FF, CHA, Consignor]
│                       nextState → Inactive
└── SUBSTATE: Inactive  end:true     owner: [Consignee]
```

Single state = single collection `sm_Partner_xxx` for the full lifecycle. Only Consignee can move a partner to `Inactive`.

---

#### Schema Groups

**Three groups — Contact (sponsor), BankDetails (sponsor), Invitee (partner):**

`Contact` — filled by sponsor:

| Field | Req | Visible | Description |
|---|---|---|---|
| `C_Country` | ✓ | order 1 | Country |
| `C_Category` | ✓ | order 2 | Sponsor role — enum `["Consignee"]` (variable per SuperApp) |
| `C_TaxID` | | order 3 | GSTIN |
| `C_Organization` | ✓ | order 4 | Vendor name |
| `C_InternalID` | ✓ | order 5 | LSP ID |
| `C_LegalName` | ✓ | order 6 | Contact name |
| `C_Email` | ✓ | order 7 | Email |
| `C_Telephone` | | order 8 | Telephone |
| `C_PlantID` | ✓ | order 9 | Sponsor's plant this partner is assigned to |
| `C_PlantName` | | order 10 | Sponsor plant name |
| `C_PlantLocation` | | order 11 | Sponsor plant location |
| `C_StreetAddress` | ✓ | order 12 | Street address |
| `C_AddressLocality` | | order 13 | Address locality |
| `C_City` | | order 14 | City |
| `C_Description` | | order 15 | Description |
| `C_Department` | | order 16 | Department |
| `C_Region` | | order 17 | State |
| `C_PostalCode` | | order 18 | Postal code |
| `C_Identifier` | ✓ | hidden | Vendor org's Ethereum address (paramId) |
| `C_PenID` | ✓ | hidden | NFT ID (pennId) |
| `C_Type` | | hidden | Type |

`BankDetails` — filled by sponsor:

| Field | Req | Visible | Description |
|---|---|---|---|
| `C_BankName` | | order 1 | Bank name |
| `C_BankAccount` | | order 2 | Account number |
| `C_IfscCode` | | order 3 | IFSC code |
| `C_Branch` | | order 4 | Branch |
| `C_BankAddress` | | order 5 | Branch address |

`Invitee` — filled by partner:

| Field | Req | Visible | Description |
|---|---|---|---|
| `C_Category` | ✓ | order 1 | Partner role — enum `["FF","CHA","Consignor"]` (variable per SuperApp) |
| `C_Email` | ✓ | order 2 | Org admin email — bootstraps `app_users` + `subdomain_users` |
| `C_InternalID` | | order 3 | Vendor ID |
| `C_TaxID` | | order 4 | Tax ID |
| `C_Organization` | | order 5 | Organization name |
| `C_StreetAddress` | | order 6 | Street address |
| `C_Plants` | | **array** | Plants / ports served — see below |
| `C_Identifier` | | hidden | Invitee ParamID |
| `C_PenID` | | hidden | NFT ID |
| `C_Department` / `C_PostalCode` / `C_Region` / `C_Type` / `C_Country` / `C_Telephone` / `C_Description` / `C_AddressLocality` / `C_City` / `C_LegalName` | | hidden | Supporting fields |

`Invitee.C_Plants` array items:

| Field | Req | Description |
|---|---|---|
| `C_PlantID` | ✓ | Plant / port code (e.g. `1810`, `INNSA1`) |
| `C_PlantName` | ✓ | Plant / port name |
| `C_PlantLocation` | | Plant location |

> `C_Plants` is an array — a partner (e.g. a Freight Forwarder) serves multiple ports simultaneously. Each entry produces one `plants` record in the Workspace DB.

---

#### Field → Collection Mapping

```
Partner SM doc field                  → Platform collection.field
─────────────────────────────────────────────────────────────────────
Contact.C_Identifier                  → organizations.org.paramId
Contact.C_Organization                → organizations.org.name
Contact.C_InternalID                  → organizations.org.partnerId   (vendor/LSP ID)
Contact.C_TaxID                       → organizations.org.taxId        (optional)
Contact.C_LegalName                   → organizations.org.legalName    (optional)
Contact.C_Telephone                   → organizations.org.telephone    (optional)
Contact.C_StreetAddress               → organizations.org.address.street (optional)
Contact.C_City                        → organizations.org.address.city  (optional)
Contact.C_Region                      → organizations.org.address.state (optional)
Contact.C_PostalCode                  → organizations.org.address.postalCode (optional)
Contact.C_Country                     → organizations.org.address.country   (optional)
Invitee.C_Category                    → organizations.role             (FF / CHA / Consignor)
Invitee.C_Email                       → organizations.orgAdmin
                                      → app_users.email
                                      → subdomain_users.email
Invitee.C_Plants[n].C_PlantID         → plants.code
Invitee.C_Plants[n].C_PlantName       → plants.name
Invitee.C_Plants[n].C_PlantLocation   → plants.location.city
Contact.C_Identifier                  → plants.orgParamId
Invitee.C_Plants[n].C_PlantID         → app_users.plantTeams[n].plant
Invitee.C_Category                    → app_users.plantTeams[n].teams[0]
```

---

#### Complete Partner Onboarding Sequence

Partner onboarding is a **3-phase process**:

**Phase 1 — Registration (Auth Gate)**

```
Partner email submitted via sponsor's invitation form
→ ENN POST /v4/onboard (direct or via Wallet Backend POST /auth/domain/register)
   Headers: param_exchange_enn_key, app-key, subdomain_name
   Query params: email, subdomain
→ ENN creates blockchain identity → returns { paramId, pennId }
→ paramId stored in Contact.C_Identifier (hidden field)
→ pennId  stored in Contact.C_PenID      (hidden field)
```
See Section 17.0 (ENN `/v4/onboard`) and Section 17.4 for full spec.

**Phase 2 — SM Document (ParamGateway)**

```
Partner fills Invitee details (C_Category, C_Email, C_InternalID, C_Plants[], etc.)
→ Frontend → ParamGateway → writes Partner SM doc to:
     {workspace}_{superAppId[0:8]}_{sponsorOrg[2:22]}_{portal}
     collection: sm_Partner_{smId[0:6]}
→ doc created at stateTo: "Partner:Active"
[Partner org has NO SuperApp access yet]
```

**Phase 3 — Platform Onboard (NATS — main path)**

```
SyncFactory publishes NATS event on doc creation:
   subject: param.syncfactory.{workspace}.{superAppId}.create
   payload: { mnemonic: "create", smType: "@sm/Partner", stateTo: "Partner:Active",
              smId, docId, workspace, superAppId }

→ NATS subscriber → smType "@sm/Partner" → PartnerLifecycleHandler
→ reads doc from:  {workspace}_{superAppId[0:8]}_{sponsorOrg[2:22]}_{portal}
                   collection: sm_Partner_{smId[0:6]}
→ writes organizations, plants, subdomain_users, app_users
→ partner org admin now has SuperApp access

REST override (admin/replay): POST /superapp/:superAppId/partners/onboard
```

#### `Partner:Active` — DB Writes (create + re-activation)

**Conflict rules before writing:**
- Non-sponsor: conflict = same `role` + same `org.partnerId` already exists → 409. Different `org.partnerId` for the same org → allowed (distinct vendor record).
- Sponsor: conflict = same `role` + same `org.paramId` → 409.

```
1. {subdomain}_{superAppId[0:8]}.organizations
   upsert {
     _id:          "org:{superAppId}:{role}:{paramId[2:22]}:{vendorId}",
                   // vendorId = Contact.C_InternalID (LSP/vendor code)
     role:         Invitee.C_Category,
     isSponsorOrg: false,
     org: {
       paramId:   Contact.C_Identifier,    // required
       name:      Contact.C_Organization,  // required
       partnerId: Contact.C_InternalID,    // required for vendor orgs
       taxId:     Contact.C_TaxID,         // optional
       legalName: Contact.C_LegalName,     // optional
       telephone: Contact.C_Telephone,     // optional
       address: {
         street:     Contact.C_StreetAddress,
         city:       Contact.C_City,
         state:      Contact.C_Region,
         postalCode: Contact.C_PostalCode,
         country:    Contact.C_Country
       }
     },
     orgAdmin:    Invitee.C_Email,
     status:      "active",
     onboardedAt: now, updatedAt: now
   }

2. {subdomain}.plants  — for each entry in Invitee.C_Plants[]:
   upsert by _id — idempotent; plant already existing is not an error.
   { _id: "plant:{C_PlantID}", code: C_PlantID, name: C_PlantName,
     location: { city: C_PlantLocation }, orgParamId: Contact.C_Identifier, isActive: true }

3. param_saas.subdomain_users
   upsert { _id: "user:{SHA256(Invitee.C_Email)}", email, userId: SHA256(email),
            orgParamId: Contact.C_Identifier, workspaces: addToSet(workspace) }

4. {subdomain}_{superAppId[0:8]}.app_users
   upsert {
     _id:        "user:{superAppId}:{SHA256(email)}:{vendorId}",
                 // vendorId = Contact.C_InternalID — scopes this record to one vendor relationship
                 // same user can have multiple app_users docs, one per partnerId context
     userId:     SHA256(Invitee.C_Email),
     email:      Invitee.C_Email,
     orgParamId: Contact.C_Identifier,
     role:       Invitee.C_Category,
     partnerId:  Contact.C_InternalID,   // matches the organizations.org.partnerId for this record
     plantTeams: Invitee.C_Plants[].map(p => ({
                   plant: p.C_PlantID,
                   teams: [Invitee.C_Category]   // default team = role name; expandable later
                 })),
     isOrgAdmin: true,
     status:     "active",
     addedBy:    "system"
   }
```

#### `Partner:Inactive` — DB Writes

```
1. organizations → updateOne(
     { "org.paramId":   Contact.C_Identifier,
       role:             Invitee.C_Category,
       "org.partnerId":  Contact.C_InternalID },    // target exact vendor record
     { $set: { status: "suspended", updatedAt: now } })
2. app_users     → updateMany(
                     { orgParamId: Contact.C_Identifier, partnerId: Contact.C_InternalID },
                     { $set: { status: "suspended" } }
                   )
                   // targets only the app_users docs for this specific vendor context
3. plants          — unchanged (permanent; re-activation restores access)
4. subdomain_users — unchanged
```

#### Sponsor vs Vendor User Model

| Aspect | Sponsor org | Vendor/Partner org |
|---|---|---|
| Org record created | Auto on `installSuperApp` | Via Partner SM → NATS → `Partner:Active` |
| Records per role | One (enforced) | Multiple — one per `org.partnerId` |
| Conflict key | `org.paramId + role` | `org.partnerId + role` |
| `org.partnerId` | Not present | `Contact.C_InternalID` (LSP/vendor code) |
| Org admin | Workspace admin | Auto-created (`isOrgAdmin: true`) via onboard; one `app_users` doc per vendor context |
| `app_users` docs per user | One per SuperApp | One per (SuperApp, partnerId) |
| `app_users._id` | `"user:{sappId}:{userId}"` | `"user:{sappId}:{userId}:{partnerId}"` |
| `plantTeams` scope | All org plants | Scoped to that partnerId's plants only |
| User management | Workspace admin | Vendor org admin (via org admin UI, future) |
| Suspend/resume | Manual | Via `Partner:Inactive` / `Partner:Active` SM transitions |

**Multiple vendor IDs, same org:** A partner org (same paramId / email domain) can be onboarded multiple times with different `org.partnerId` values. Each gets its own `organizations` record AND its own `app_users` document(s) with a separate, scoped `plantTeams`.

#### Connection to Profile

Partner org admin's `subdomain_users` and `app_users` are **created automatically** by the NATS handler on `Partner:Active` — no manual user addition needed. On login: `GET /profile` (or `GET /user/profile`) returns workspaces from `subdomain_users`; platform middleware resolves `role`, `plantTeams`, `isOrgAdmin` from `app_users`. If `app_users.status = "suspended"` → 403 on all platform routes.

---

### 15.6 User APIs

**Database:** `{subdomain}_{superAppId[0:8]}.app_users`, `param_saas.subdomain_users`

```
GET    /superapp/:superAppId/roles/:role/users
```
**Guard:** Workspace admin or orgAdmin for this role.
**Reads:** `sapp.app_users` filtered by `{ superAppId, role }`.
**Response:**
```json
[
  {
    "userId": "<sha256(email)>",
    "email": "scm@bosch.com",
    "name": "SCM Team Lead",
    "role": "Consignee",
    "paramId": "0x6193b497...",
    "plantTeams": [
      { "plant": "1810", "teams": ["OSD4", "Planners"] }
    ],
    "isOrgAdmin": false,
    "status": "active"
  }
]
```

---

```
POST   /superapp/:superAppId/roles/:role/users
```
**Body:**
```json
{
  "users": [
    {
      "email": "scm@bosch.com",
      "name": "SCM Team Lead",
      "plantTeams": [
        { "plant": "1810", "teams": ["OSD4", "Planners"] },
        { "plant": "1820", "teams": ["Planners"] }
      ],
      "isOrgAdmin": false
    }
  ]
}
```
**Guard:** Workspace admin or orgAdmin for this role.
**Validation:** Each `plant` must exist in `{subdomain}.plants`. Each team must exist in `sapp.team_rbac_matrix` for this role.
**Action:** Backend computes `userId = SHA256(email)` for each user, inserts into `sapp.app_users`. Appends workspace to `param_saas.subdomain_users[userId].subdomains` if not already present.
**Response:** Array of created app_users documents. Each item shape: `{ userId, email, name, role, paramId, plantTeams[], isOrgAdmin, status }` (Section 9.4).

---

```
GET    /superapp/:superAppId/users/:userId
```
**Guard:** Workspace admin, orgAdmin for this role, or caller's own userId.
**Reads:** `sapp.app_users` where `userId = :userId` (and `superAppId` from context).
**Response:** Single app_users document. Shape: Section 9.4 — `{ userId, email, name, role, paramId, plantTeams[], isOrgAdmin, status, ... }`. 404 if not found.

---

```
PUT    /superapp/:superAppId/users/:userId
```
**Body:** `{ plantTeams?, status?, isOrgAdmin? }`
**Guard:** Workspace admin or orgAdmin for this role.
**Action:** Updates matching fields in `sapp.app_users`.
**Response:** Updated app_users document. Same shape as GET /users/:userId. 404 if not found.

---

```
DELETE /superapp/:superAppId/users/:userId
```
**Guard:** Workspace admin or orgAdmin for this role.
**Action:** Sets `status: "suspended"` in `sapp.app_users`.
**Response:** `{ "userId": "<sha256(email)>", "status": "suspended" }`

---

### 15.7 Team RBAC APIs

**Database:** `{subdomain}_{superAppId[0:8]}.team_rbac_matrix`

```
GET    /superapp/:superAppId/team-rbac-matrix
```
**Guard:** Authenticated.
**Reads:** `sapp.team_rbac_matrix` for this SuperApp.
**Response:** Array of team_rbac_matrix documents (one per linked SM). Shape: Section 6.4 — `[{ _id, superAppId, smId, smName, permissions[], ... }]`.

---

```
GET    /superapp/:superAppId/team-rbac-matrix/:smId
```
**Guard:** Authenticated.
**Reads:** `sapp.team_rbac_matrix` where `smId = :smId`.
**Response:** Single team_rbac_matrix document. 404 if not found.

---

```
PUT    /superapp/:superAppId/team-rbac-matrix/:smId
```
**Body:** `{ permissions[] }` — full replacement.
**Guard:** Workspace admin.
**Action:** Replaces `permissions` array in `sapp.team_rbac_matrix` for this SM, sets `customizedAt = now()`. Teams referenced in permission keys must match teams defined in `param_definitions.superapp_definitions.roles[].teams` — permission levels can be adjusted but team names cannot be added or removed.
**Response:** Updated team_rbac_matrix document. Same shape as Section 6.4. 404 if SM not found.

---

### 15.8 Manifest API

```
POST   /superapp/:superAppId/manifest
```
**Body:**
```json
{
  "roles": [
    {
      "role": "FF",
      "paramId": "0x40Af9B6a...",
      "orgName": "Kuehne+Nagel",
      "orgAdmin": "admin@kn.com",
      "users": [
        {
          "email": "ops@kn.com",
          "name": "Operations Lead",
          "plantTeams": [{ "plant": "1810", "teams": ["FF"] }],
          "isOrgAdmin": false
        }
      ]
    }
  ]
}
```
**Guard:** Workspace admin.
**Action:** Atomic batch — for each role entry: onboard org (Section 15.5) then assign users (Section 15.6). Rolls back entirely on any failure.
**Response:** `{ "onboarded": [{ "role": "FF", "paramId": "0x40Af9B6a...", "orgName": "Kuehne+Nagel" }], "users": [{ "email": "ops@kn.com", "userId": "<sha256>" }] }`

---

## 16. Engine 2: Query Engine — Full API Spec

Base path: `/api/v1`. All endpoints are **read-only**. Every response is RBAC-filtered — L1 (org partition), L2 (team permission), L3 (document-level restriction). See Section 22 for enforcement details.

---

### 16.1 Document APIs

```
GET    /documents
```
**Required headers:** `X-Workspace`, `X-SuperApp-ID`, `X-Portal` (role name, e.g. `Consignee`). These replace the `superAppId`, `workspace`, and `portal` context for all Query Engine endpoints — not query params.

**Query params:**

_System filters (always available):_
- `smId` (optional — filter to a specific SM collection; **required** when using `filter[*]` params)
- `state` (optional)
- `subState` (optional)
- `phase` (optional — `Initiation|Agreement|Execution|Settlement|Completion`)
- `from` / `to` (optional — `_local.timestamp` range, epoch ms)
- `plant` (optional — filter by plant in `_chain._sys.plantIDs`)
- `partner_id` (optional — vendor-only; filter documents by vendor's internal ID in `_participants.{callerRole}.C_InternalID`; ignored for sponsor users)
- `search` (optional — text search across schema fields)
- `page`, `limit` (optional — pagination, default `page=1, limit=25`)
- `include_actions` (optional — `true` to append available actions per document)
- `include_diff` (optional — `true` to compute diff per document: reduces `OrderedItems` to remaining quantities per SKU and appends the `diff` block)

_Dynamic schema field filters (see Section 16.1.1):_
- `filter[{fieldPath}]` — exact match on a schema field (e.g., `filter[DocDetails.D_Type]=Import`)
- `filter[{fieldPath}][gte]` / `filter[{fieldPath}][lte]` — range filter (e.g., `filter[DocDetails.D_Date][gte]=2026-01-01`)
- `filter[{fieldPath}][contains]` — case-insensitive substring match (e.g., `filter[Buyer.C_Organization][contains]=Bosch`)
- `filter[{fieldPath}][in]` — comma-separated membership test (e.g., `filter[DocDetails.D_Type][in]=Import,Export`)

**Logic:**
1. Resolve Org Partition DB: `{subdomain}_{superAppId[0:8]}_{org[2:22]}_{portal}`
2. Discover SM collections by scanning `sm_*` collections in the org partition DB dynamically (not from `installed_superapps.linkedSMs`)
3. L1 filter: `_chain.roles[caller.role] == caller.paramId`
4. Plant filter: resolve caller's plants across all vendor contexts from `sapp.app_users` (see Section 22.0); keep docs where `_chain._sys.plantIDs[caller.orgParamId]` intersects caller's plants
5. **Partner ID filter** _(vendor only, when `partner_id` is passed)_: add `{ "_participants.{callerRole}.C_InternalID": partner_id }` to the query. Sponsor users skip this filter entirely — see Section 22.6.
6. L2 filter: per doc, resolve the matching `app_users` context via `resolveAppUserContext` (using `partner_id` as hint when provided); look up `sapp.team_rbac_matrix`; exclude if `N/A`
7. L3 filter: if `_chain._sys.restrictedTo` non-empty, verify caller is listed; exclude if blocked
8. Apply system query filters (state, subState, phase, timestamp range, search)
9. **Apply dynamic schema field filters** (see Section 16.1.1) — when `smId` is provided and any `filter[*]` params are present: load schema, validate field paths against whitelist, build and apply MongoDB filter
10. If `include_actions=true`, compute actions per doc (same logic as `GET /documents/:docId/actions`)
11. If `include_diff=true`, compute diff per doc (same algorithm as `GET /documents/:docId/diff`)

**Response:**
```json
{
  "total": 142,
  "page": 1,
  "limit": 25,
  "documents": [
    {
      "_id": "0xf97a54af...",
      "smId": "public:0xe1ec34e6...",
      "smName": "Shipment Booking",
      "DocDetails": {
        "D_OrderNumber": "Exim050220265296",
        "D_Date": "2026-02-05",
        "D_Type": "Import"
      },
      "Buyer": { "C_Organization": "BOSCH CHASSIS SYSTEMS INDIA PVT LTD" },
      "Seller": { "C_Organization": "Kuehne+Nagel" },
      "OrderedItems": [
        { "I_SKU": "SKU-001", "I_Description": "Brake Caliper", "I_Quantity": 120 }
      ],
      "_participants": {
        "Consignee": { "C_Organization": "BOSCH CHASSIS SYSTEMS INDIA PVT LTD" },
        "FF": { "C_Organization": "Kuehne+Nagel", "C_InternalID": "LSP001" }
      },
      "_local": {
        "txnId": "private:0x21d468ef...",
        "sequence": 15,
        "timestamp": 1770447080,
        "phase": "Agreement",
        "state": "Contract",
        "subState": "Booking",
        "microState": null,
        "mnemonic": "transition"
      },
      "access": "RW",
      "actions": { },      // present only if include_actions=true; same shape as GET /documents/:docId/actions
      "diff": { }          // present only if include_diff=true; OrderedItems quantities are also reduced to remaining per SKU; diff block same shape as GET /documents/:docId/diff
    }
  ]
}
```

---

### 16.1.1 Dynamic Schema Filters

The system-level filters (`state`, `subState`, `phase`, etc.) are hardcoded. All other field-level filters are **dynamic** — derived at request time from the SM schema stored in `param_definitions.onchain_schema_definitions`. This allows callers to filter on any schema-defined field without backend code changes.

**Requirements:**
- `smId` **must** be provided alongside any `filter[*]` params. If `smId` is absent and `filter[*]` params are present, respond `400` with `"smId required for schema filters"`.
- Dynamic filters are applied **in addition to** all system-level filters (steps 1–8 above).
- System fields (any path starting with `_`) are **always blocked**, even if they somehow appear in the schema.

---

**Filter Syntax**

Passed as standard query string parameters using bracket notation:

```
# Exact match
GET /documents?superAppId=...&smId=...&filter[DocDetails.D_Type]=Import

# Range
GET /documents?...&filter[DocDetails.D_Date][gte]=2026-01-01&filter[DocDetails.D_Date][lte]=2026-03-31

# Substring (case-insensitive)
GET /documents?...&filter[Buyer.C_Organization][contains]=Bosch

# Membership (comma-separated)
GET /documents?...&filter[DocDetails.D_Type][in]=Import,Export
```

The `{fieldPath}` is dot-notation: `{topLevelGroup}.{fieldKey}` (e.g., `DocDetails.D_Type`). Nesting beyond two levels is also valid for deeper objects (e.g., `OrderedItems.I_SKU` for array element fields).

Supported operators:

| Operator | Query key | MongoDB translation |
|---|---|---|
| Exact match | `filter[path]` | `{ "path": value }` |
| Greater-than-or-equal | `filter[path][gte]` | `{ "path": { $gte: value } }` |
| Less-than-or-equal | `filter[path][lte]` | `{ "path": { $lte: value } }` |
| Range (both gte+lte) | Both above | `{ "path": { $gte: v1, $lte: v2 } }` |
| Substring match | `filter[path][contains]` | `{ "path": { $regex: value, $options: "i" } }` |
| Set membership | `filter[path][in]` | `{ "path": { $in: value.split(",") } }` |

---

**Schema Loading and Field Whitelist**

1. Look up `param_definitions.onchain_schema_definitions` where `_id = schemaIdForState`.
   - The schema ID for a given state is found in `param_definitions.onchain_sm_definitions[smId].states[requestedState].schema` (or the first/default state if no `state` filter provided).
   - If the schema cannot be loaded, return `400` with `"Cannot load schema for smId; filter[*] not available"`.

2. Walk the schema `properties` tree to build the **field whitelist** — a flat set of valid dot-notation paths:

```typescript
function buildFieldWhitelist(schema: SchemaDefinition): Set<string> {
  const whitelist = new Set<string>();

  for (const [groupKey, groupDef] of Object.entries(schema.properties)) {
    if (groupDef.type === 'object' || groupDef.type === 'contact') {
      for (const fieldKey of Object.keys(groupDef.properties ?? {})) {
        whitelist.add(`${groupKey}.${fieldKey}`);
      }
    } else if (groupDef.type === 'array' && groupDef.items?.properties) {
      for (const fieldKey of Object.keys(groupDef.items.properties)) {
        whitelist.add(`${groupKey}.${fieldKey}`);
      }
    } else {
      // Top-level scalar
      whitelist.add(groupKey);
    }
  }

  return whitelist;
}
```

3. **Validate** each requested filter path:
   - If the path starts with `_` → reject: `400 { "error": "Filter on system fields is not allowed", "field": path }`.
   - If the path is not in the whitelist → reject: `400 { "error": "Unknown schema field", "field": path }`.

---

**Type-Aware Value Coercion**

Look up the field's `type` in the schema to coerce the string query-param value before building the MongoDB predicate:

| Schema `type` | Coercion |
|---|---|
| `"number"` | `parseFloat(value)` — error if NaN |
| `"boolean"` | `value === "true"` |
| `"string"` | No coercion — use as-is |
| `"array"` | Applied per element when using `$in` |
| `"object"` / `"contact"` | Treated as `"string"` for leaf field |

Date strings (`D_Date`, etc.) have `type: "string"` in schema — lexicographic comparison works for ISO-format dates; no special coercion needed.

---

**MongoDB Filter Construction**

```typescript
function buildSchemaFilter(
  filterParams: Record<string, unknown>,  // parsed bracket notation from query string
  whitelist: Set<string>,
  schemaProperties: SchemaProperties,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  for (const [path, operators] of Object.entries(filterParams)) {
    // Block system fields
    if (path.startsWith('_')) {
      throw new RequestError(400, `Filter on system fields is not allowed: ${path}`);
    }
    // Whitelist check
    if (!whitelist.has(path)) {
      throw new RequestError(400, `Unknown schema field: ${path}`);
    }

    const fieldType = resolveFieldType(schemaProperties, path); // e.g. "string" | "number"

    if (typeof operators === 'string') {
      // Exact match: filter[path]=value
      filter[path] = coerce(operators, fieldType);
    } else if (typeof operators === 'object' && operators !== null) {
      const pred: Record<string, unknown> = {};
      const ops = operators as Record<string, string>;
      if (ops.gte !== undefined) pred['$gte'] = coerce(ops.gte, fieldType);
      if (ops.lte !== undefined) pred['$lte'] = coerce(ops.lte, fieldType);
      if (ops.contains !== undefined) pred['$regex'] = ops.contains, pred['$options'] = 'i';
      if (ops.in !== undefined) pred['$in'] = ops.in.split(',').map(v => coerce(v.trim(), fieldType));
      filter[path] = pred;
    }
  }

  return filter;
}
```

The resulting `filter` object is merged into the MongoDB query alongside the system-level filter predicates.

---

**Error Responses**

| Condition | HTTP | Body |
|---|---|---|
| `filter[*]` present but `smId` absent | 400 | `{ "error": "smId required for schema filters" }` |
| Schema not found for `smId` | 400 | `{ "error": "Cannot load schema for smId" }` |
| Filter path starts with `_` | 400 | `{ "error": "Filter on system fields is not allowed", "field": "..." }` |
| Filter path not in schema | 400 | `{ "error": "Unknown schema field", "field": "..." }` |
| Value cannot be coerced to field's type | 400 | `{ "error": "Invalid filter value for field", "field": "...", "expected": "number" }` |

---

**Array Field Filtering**

When the target field lives inside an array property (e.g., `OrderedItems.I_SKU`), MongoDB's implicit array semantics mean the predicate matches any element in the array — no `$elemMatch` needed for single-field equality. For multi-field constraints on the **same array element**, the caller should use separate `filter[*]` params and the backend will wrap them in `$elemMatch` automatically when both fields share the same array group:

```javascript
// filter[OrderedItems.I_SKU]=SKU-001&filter[OrderedItems.I_Quantity][gte]=50
// → { "OrderedItems": { $elemMatch: { "I_SKU": "SKU-001", "I_Quantity": { $gte: 50 } } } }
```

If only one field from an array group is filtered, emit the direct dot-notation predicate (`"OrderedItems.I_SKU": "SKU-001"`).

---

```
GET    /documents/:docId
```
**Guard:** Authenticated. L1 + L2 + L3 enforced.
**Reads:** `chain_head` → SM collection.
**Response:** Full document as stored in MongoDB, with `smName` (annotated from `param_definitions`) and `access` (computed from L2) appended.
```json
{
  "_id": "0xf97a54af...",
  "DocDetails": {
    "D_OrderNumber": "Exim050220265296",
    "D_Date": "2026-02-05",
    "D_Type": "Import"
  },
  "Buyer": {
    "C_InternalID": "V-10023",
    "C_Organization": "BOSCH CHASSIS SYSTEMS INDIA PVT LTD",
    "C_PlantID": "1810"
  },
  "Seller": {
    "C_InternalID": "V-00441",
    "C_Organization": "Kuehne+Nagel",
    "C_Email": "ops@kn.com"
  },
  "OrderedItems": [
    { "I_SKU": "SKU-001", "I_Description": "Brake Caliper", "I_Quantity": 120, "I_HSNCode": "87083000" }
  ],
  "_participants": {
    "Consignee": { "C_Organization": "BOSCH CHASSIS SYSTEMS INDIA PVT LTD", "C_Email": "scm@bosch.com" },
    "FF":        { "C_Organization": "Kuehne+Nagel", "C_Email": "ops@kn.com", "C_InternalID": "LSP001" }
  },
  "_chain": {
    "smId": "public:0xe1ec34e6...",
    "stateTo": "Contract:Booking",
    "roles": { "Consignee": "0x6193b497...", "FF": "0x40Af9B6a...", "CHA": "0x56C865EB..." },
    "docOwner": "0x878042B8...",
    "_sys": { "restrictedTo": [], "plantIDs": { "0x6193b497...": ["1810"] } }
  },
  "_local": {
    "txnId": "private:0x21d468ef...",
    "sequence": 15,
    "timestamp": 1770447080,
    "phase": "Agreement",
    "state": "Contract",
    "subState": "Booking",
    "microState": null,
    "mnemonic": "transition"
  },
  "smName": "Shipment Booking",
  "access": "RW"
}
```

---

```
GET    /documents/:docId/chain
```
**Guard:** Authenticated. L1 enforced.
**Reads:** `txn_history` where `docId = :docId`, ordered by `sequence asc`.
**Response:**
```json
[
  {
    "txnId": "private:0x21d468ef...",
    "sequence": 15,
    "stateTo": "Contract:Booking",
    "changeType": "state_transition",
    "timestamp": 1770447080,
    "actor": "<sha256(email)>",
    "mnemonic": "transition"
  }
]
```

---

```
GET    /documents/:docId/diff
```
**Guard:** Authenticated. L1 + L2 enforced.

**What "diff" means here:** Diff is NOT a version comparison. It is a **quantity balance check** — how much of the parent document's ordered quantity has already been consumed by child documents (per SKU), and how much remains. The response returns the document with `OrderedItems` quantities **already reduced to remaining values per SKU**, so the UI can directly use it to pre-fill the next child document form without any further calculation.

**Child document relationship:** When a child document (next-state document) is created from a parent, SyncFactory appends the child's `docId` to the parent's `_chain.refs.docIds`. This is the authoritative link from parent to all its children.

**Diff algorithm (per-SKU):**
```
parentDoc    = fetch current doc via chain_head → SM collection
childDocIds  = parentDoc._chain.refs.docIds       // all child documents

if parentDoc has OrderedItems:
  // Initialize remaining quantity map keyed by I_SKU
  remaining = { item.I_SKU: item.I_Quantity for item in parentDoc.OrderedItems }

  for each childDocId:
    childDoc = fetch via chain_head → SM collection
    if childDoc has OrderedItems:
      for each item in childDoc.OrderedItems:
        if item.I_SKU exists in remaining:
          remaining[item.I_SKU] -= item.I_Quantity   // subtract per-SKU consumed

  // Build reduced OrderedItems (remaining quantities per SKU, all other fields unchanged)
  reducedOrderedItems = parentDoc.OrderedItems.map(item => ({
    ...item,
    I_Quantity: remaining[item.I_SKU]
  }))

  parentQty    = sum(parentDoc.OrderedItems[*].I_Quantity)
  consumedQty  = parentQty - sum(remaining[*])
  remainingQty = sum(remaining[*])
  canCreateChild = remainingQty > 0

else:
  // No OrderedItems — quantity tracking not applicable
  // Allow child creation only ONCE (first child only)
  reducedOrderedItems = null   // no OrderedItems to reduce
  canCreateChild = childDocIds.length == 0
  parentQty = consumedQty = remainingQty = null
```

**Reads:** Parent document via `chain_head`, all child documents via `_chain.refs.docIds` → each child's `chain_head` → child SM collection.

**Response:** Full parent document with:
- `OrderedItems` replaced by **reduced quantities** (remaining per SKU) — ready to use as child doc pre-fill
- `diff` block appended with per-SKU breakdown and overall totals

```json
{
  "_id": "0xf97a54af...",
  "DocDetails": { "D_OrderNumber": "Exim050220265296", "D_Date": "2026-02-05" },
  "OrderedItems": [
    { "I_SKU": "SKU-001", "I_Description": "Brake Caliper", "I_Quantity": 200 },
    { "I_SKU": "SKU-002", "I_Description": "Brake Pad",     "I_Quantity": 200 }
  ],
  "_chain": { ... },
  "_local": { ... },
  "access": "RW",
  "diff": {
    "hasOrderedItems": true,
    "parentQty": 700,
    "consumedQty": 300,
    "remainingQty": 400,
    "canCreateChild": true,
    "items": [
      { "I_SKU": "SKU-001", "parentQty": 500, "consumedQty": 300, "remainingQty": 200 },
      { "I_SKU": "SKU-002", "parentQty": 200, "consumedQty": 0,   "remainingQty": 200 }
    ],
    "children": [
      { "docId": "0xabc123...", "stateTo": "Shipment:Loading", "consumedQty": 300 }
    ]
  }
}
```

> `OrderedItems.I_Quantity` in the response = remaining quantity for that SKU (parent minus all children). `diff.items` shows the full per-SKU breakdown for reference. `diff.parentQty / consumedQty / remainingQty` are totals across all SKUs.

When parent has no `OrderedItems`:
```json
{
  "OrderedItems": [],
  "diff": {
    "hasOrderedItems": false,
    "parentQty": null,
    "consumedQty": null,
    "remainingQty": null,
    "canCreateChild": false,
    "items": [],
    "children": [
      { "docId": "0xabc123...", "stateTo": "Shipment:Loading", "consumedQty": null }
    ]
  }
}
```

---

```
GET    /documents/:docId/actions
```
**Guard:** Authenticated. L1 + L2 + L3 enforced.

**Logic:**
1. L3 check: if `_chain._sys.restrictedTo` blocks caller → return `{ blocked: true, currentState, currentSubState, currentMicroState, availableActions: [], alternateNextActions: [], linkedSmActions: [] }`
2. Get `chain_head.stateTo` → parse `currentState`, `currentSubState`, `currentMicroState`
3. Read SM definition from `param_definitions.onchain_sm_definitions`
4. Collect all candidate transitions:
   - `states[currentState].nextState` → `availableActions`
   - `states[currentState].alternateNext[]` → `alternateNextActions`
   - `states[currentState].subStates[currentSubState].nextState` (if subState active) → `availableActions`
   - `states[currentState].subStates[currentSubState].microStates[currentMicroState].nextState` (if microState active) → `availableActions`
   - `states[currentState].linkedSMs[]` → `linkedSmActions`
5. L1 check per candidate: caller's role must appear in `owner[]` at target level
6. L2 check per candidate: caller's team must have `RW` in `sapp.team_rbac_matrix` at `{targetState, targetSubState, targetMicroState}`
7. Resolve landing position for each passing transition:
   - **State/alternateNext transition**: resolve target state's `start: true` subState → its `start: true` microState
   - **SubState transition**: `targetState = currentState`; resolve target subState's `start: true` microState
   - **MicroState transition**: all three targets explicit, no lookup needed
   - **LinkedSM**: resolve linked SM's `startAt` state → its `start: true` subState → its `start: true` microState
8. **Diff check** for actions that create child documents (`state_transition`, `alternateNext`, `linkedSmActions` — NOT `substate_transition` or `microstate_transition` which operate within the same document):
   - Run the diff algorithm (same as `GET /documents/:docId/diff`) on the current document
   - If `canCreateChild = false` → mark those actions with `canCreate: false` and include `diffReason`
   - `substate_transition` and `microstate_transition` are never affected by diff (they don't create child documents)

**Response:**
```json
{
  "currentState": "Contract",
  "currentSubState": "Booking",
  "currentMicroState": "AwaitingApproval",
  "availableActions": [
    {
      "type": "state_transition",
      "label": "Complete Contract",
      "targetState": "Shipment",
      "targetSubState": "Loading",
      "targetMicroState": "Pending",
      "smId": "public:0xe1ec34e6...",
      "canCreate": true,
      "remainingQty": 400
    },
    {
      "type": "substate_transition",
      "label": "Cancel Booking",
      "targetState": "Contract",
      "targetSubState": "Cancelled",
      "targetMicroState": null,
      "smId": "public:0xe1ec34e6..."
    },
    {
      "type": "microstate_transition",
      "label": "Approve",
      "targetState": "Contract",
      "targetSubState": "Booking",
      "targetMicroState": "Approved",
      "smId": "public:0xe1ec34e6..."
    }
  ],
  "alternateNextActions": [
    {
      "type": "state_transition",
      "label": "Move to Customs",
      "targetState": "Customs",
      "targetSubState": "Review",
      "targetMicroState": null,
      "smId": "public:0xe1ec34e6...",
      "canCreate": false,
      "diffReason": "quantity_exhausted"
    }
  ],
  "linkedSmActions": [
    {
      "type": "create_linked_doc",
      "label": "Create Invoice",
      "smId": "public:0x94a7d022...",
      "smName": "Sales Invoice",
      "targetState": "Invoice",
      "targetSubState": "Draft",
      "targetMicroState": null,
      "canCreate": false,
      "diffReason": "child_exists"
    }
  ]
}
```

> `diffReason` values: `"quantity_exhausted"` (OrderedItems present, remaining = 0), `"child_exists"` (no OrderedItems, one child already created). `canCreate` and `remainingQty` are only present on actions that create child documents. `substate_transition` and `microstate_transition` never carry these fields.

---

### 16.2 SM & Schema Definition APIs

```
GET    /definitions/sm/:smId/states
```
**Guard:** Authenticated.
**Reads:** `param_definitions.onchain_sm_definitions`
**Response:** State hierarchy — states with their subStates and microStates in navigable format.
```json
{
  "smId": "public:0xe1ec34e6...",
  "states": [
    {
      "name": "Contract",
      "phase": "Agreement",
      "subStates": [
        { "name": "Booking", "start": true, "microStates": [{ "name": "AwaitingApproval", "start": true }, { "name": "Approved" }] },
        { "name": "Cancelled" }
      ]
    }
  ]
}
```


---

### 16.3 OffChain Data APIs

**Database:** `{subdomain}_{superAppId[0:8]}` (SuperApp DB — shared across all orgs)

**Access model:** Offchain data is shared reference/master data — the same records are visible to all orgs participating in the SuperApp. There is no L1/L2/L3 per-org filtering. The only access check is SuperApp membership: caller's `paramId` must exist in `sapp.organizations` for this SuperApp. If not a member → 403.

---

```
GET    /offchain/registry/:collectionName
```
**Guard:** Caller's org must be a member of this SuperApp (`sapp.organizations`).
**Query params:** Any field key-value for filtering (e.g. `?portCode=INNSA`), `page`, `limit`.
**Reads:** `offchain_registry_{collectionName}` in SuperApp DB.
**Response:**
```json
{ "total": 42, "page": 1, "limit": 25, "records": [{ "_id": "...", "portCode": "INNSA", "portName": "Nhava Sheva", ... }] }
```
`records` items match the schema from `param_definitions.offchain_schema_definitions` for this collection. 403 if not a SuperApp member.

---

```
GET    /offchain/registry/:collectionName/:keyValue
```
**Guard:** SuperApp membership.
**Reads:** Single record from `offchain_registry_{collectionName}` where key field = `:keyValue`. Key field identified from `offchain_sm_definitions.states[collectionName].keyField`.
**Response:** Single document. Shape matches offchain_schema_definitions for this collection. 404 if key not found. 403 if not a SuperApp member.

---

```
GET    /offchain/config/:collectionName
```
**Guard:** SuperApp membership.
**Reads:** `offchain_config_{collectionName}` in SuperApp DB (single versioned document).
**Response:** Single document. Shape matches offchain_schema_definitions for this config. 404 if collection empty. 403 if not a SuperApp member.

---

```
GET    /offchain/definitions
```
**Guard:** SuperApp membership.
**Reads:** `param_definitions.offchain_sm_definitions` filtered by `linkedSuperApps` containing `superAppId`.
**Response:** Array of offchain_sm_definitions documents. Shape: Section 6.5 — `[{ _id, name, desc, states, ... }]`.

---

```
GET    /offchain/definitions/:offchainSmId
```
**Guard:** SuperApp membership.
**Reads:** `param_definitions.offchain_sm_definitions` + associated `offchain_schema_definitions` docs.
**Response:**
```json
{
  "sm": { "_id": "public:0x4f9a2c81...", "name": "Bosch EXIM OffChain SM", "states": { ... } },
  "schemas": [{ "_id": "public:0xf02dbb30...", "displayName": "Entity-Division-Plant Master", "properties": { ... } }]
}
```
`sm` = offchain_sm_definitions doc. `schemas` = array of offchain_schema_definitions for each state's schema. 404 if offchainSmId not found.

---


---

## 17. Engine 3: Auth Gate — Full API Spec

Base path: `/api/v1/auth`. **Auth endpoints do not require `X-Param-ID` or `X-Workspace` headers** — they are pre-authentication. Session storage and payload decryption owned by Wallet Backend (`param_auth`).

---

### 17.0 ENN Integration Reference

All authentication is delegated to **ENN (External Node Network / Web3Auth)**. Wallet Backend calls ENN via HTTP POST. Every ENN endpoint uses a common response envelope:

```json
{
  "res": "success" | "error",
  "status": true | false,
  "message": "...",
  "data": { }
}
```

> **Important:** ENN returns HTTP 500 for business-logic failures (e.g. invalid OTP). Wallet Backend does NOT throw on non-2xx — it always checks the `status` field of the JSON body. Only network errors (no connectivity, DNS failure) throw.

**ENN base URL:** `https://keystore.paramwallet.com:8006` (or `config.ennBaseUrl`)

**Authentication — two patterns:**

1. **Standard ENN endpoints** (OTP, SSO, register_exchange) — Wallet Backend calls ENN with:
```
POST {ENN_BASE_URL}{path}
Content-Type: application/json
app-key: {config.appKey}
```

2. **Onboard endpoint** (`/v4/onboard`) — used **only for partner registration** when a sponsor adds a partner (not for first-time signup). Requires exchange-level credentials:
```
POST {ENN_BASE_URL}/v4/onboard
param_exchange_enn_key: {exchangeEnnKey}   // exchange-specific key
app-key: {config.appKey}
subdomain_name: {subdomain}
```
Query params: `email`, `subdomain`. Can be called directly by the frontend or proxied via Wallet Backend.

---

**ENN endpoint: `POST /v2/send_otp`**

Wallet Backend sends:
```json
{ "email": "user@example.com" }
```
ENN response on success:
```json
{ "res": "success", "status": true, "message": "OTP sent Successfully." }
```
ENN response on failure (HTTP 500):
```json
{ "res": "error", "status": false, "message": "User not found" }
```

---

**ENN endpoint: `POST /v2/verify_otp`**

Wallet Backend sends:
```json
{ "email": "user@example.com", "otp": "123456" }
```
ENN response on success:
```json
{
  "res": "success",
  "status": true,
  "message": "OTP Verified Successfully.",
  "data": {
    "isTermsAndConditionVerified": true,
    "encryptedPayload": "<aes-ctr-encrypted-string>"
  }
}
```
ENN response on failure (HTTP 500):
```json
{ "res": "error", "status": false, "message": "Invalid otp" }
```

**Decryption of `encryptedPayload`**

Implemented as `decryptEnnPayload(encryptedPayload, otp)` in `src/engines/auth/enn-client.ts`. Called from `otp.handler.ts` step 3.

ENN encrypts the identity payload on their side using **CryptoJS** with a string passphrase derived from the OTP. CryptoJS internally uses OpenSSL's `EVP_BytesToKey` for key derivation and exports ciphertext in OpenSSL "Salted__" binary format. The wallet backend must reproduce the exact same key derivation to decrypt.

**Full algorithm — 6 steps:**

**Step 1 — Passphrase derivation:**
```
passphrase = UTF-8 bytes of SHA256(otp).hexDigest()
```
The OTP (e.g. `qwertyui`) is hashed with SHA-256, producing a 64-character hex string (e.g. `ab3f...`). The **UTF-8 encoding of that hex string** is the passphrase passed into EVP_BytesToKey. This is how CryptoJS handles a plain string key — it does not use the SHA-256 bytes as the AES key directly.

```ts
const passphrase = Buffer.from(createHash('sha256').update(otp).digest('hex'), 'utf8');
```

**Step 2 — Parse the OpenSSL "Salted__" ciphertext format:**
The base64-decoded ciphertext is in CryptoJS's default OpenSSL export format:
```
[ "Salted__" — 8 bytes ASCII ][ random salt — 8 bytes ][ AES ciphertext ]
```
```ts
const raw  = Buffer.from(encryptedPayload, 'base64');
// raw[0..7]  = "Salted__" magic header — validates format
// raw[8..15] = random salt chosen by ENN at encryption time
// raw[16..]  = actual AES-256-CTR ciphertext
const salt = raw.slice(8, 16);
const ct   = raw.slice(16);
```
If the magic header is absent, throw — the payload is not in expected format.

**Step 3 — Key + IV derivation via OpenSSL EVP_BytesToKey:**
CryptoJS uses OpenSSL's `EVP_BytesToKey(MD5, 1 iteration)` to derive the AES key and IV from the passphrase + salt. Node.js `crypto` does not expose this natively — it must be implemented manually:
```ts
function evpKdf(passphrase: Buffer, salt: Buffer): { key: Buffer; iv: Buffer } {
  let derived = Buffer.alloc(0);
  let prev    = Buffer.alloc(0);
  while (derived.length < 48) {         // need 32 bytes (key) + 16 bytes (iv)
    prev    = MD5(concat(prev, passphrase, salt));   // MD5, single iteration
    derived = concat(derived, prev);
  }
  return { key: derived.slice(0, 32), iv: derived.slice(32, 48) };
}
```
Output: 32-byte AES-256 key + 16-byte IV, both unique per ciphertext (because salt is random per encryption).

**Step 4 — AES-256-CTR decrypt:**
```ts
const decipher    = createDecipheriv('aes-256-ctr', key, iv);
let decryptedBuf  = Buffer.concat([decipher.update(ct), decipher.final()]);
```

**Step 5 — Manual PKCS7 padding removal:**
CryptoJS applies PKCS7 padding even in CTR (stream cipher) mode — this is technically incorrect for a stream cipher but is CryptoJS default behaviour. Node.js `aes-256-ctr` does **not** auto-strip padding (unlike CBC mode), so it must be stripped manually:
```ts
const padByte = decryptedBuf[decryptedBuf.length - 1];
if (padByte >= 1 && padByte <= 16) {
  const tail = decryptedBuf.slice(-padByte);
  if (tail.every(b => b === padByte)) {
    decryptedBuf = decryptedBuf.slice(0, -padByte);
  }
}
```
Skipping this step causes `JSON.parse` to throw on trailing padding bytes (e.g. `\x0e\x0e...\x0e`).

**Step 6 — Parse + remap field names:**
```ts
const parsed = JSON.parse(decryptedBuf.toString('utf8'));
return {
  ...parsed,
  paramId: parsed.ethID   ?? parsed.paramId,   // ethID  → paramId  (0x address)
  pennId:  parsed.paramID ?? parsed.pennId,    // paramID → pennId  (EHPI code)
};
```

The decrypted JSON from ENN contains:
```json
{
  "ethID":     "0x6193b497...",
  "paramID":   "EHPI1668",
  "publicKey": "<hex-encoded-public-key>"
}
```

> **ENN naming note:** ENN's `ethID` is the user's Ethereum wallet address → platform calls it `paramId`. ENN's `paramID` is the EHPI (Param Hyperplane Identity) code → platform calls it `pennId`. These names are swapped intentionally to match platform conventions.

**Failure handling:** If `encryptedPayload` is absent or decryption throws (wrong OTP, malformed ciphertext, JSON parse failure), the error is logged as a warning and `decryptedEnn` is set to `null`. The login still succeeds — `paramId` falls back to `ennResult.ethID` from the unencrypted response fields. The `enn` block is simply omitted from the response.

---

**ENN endpoint: `POST /v2/verify_sso`**

Wallet Backend sends:
```json
{
  "provider":   "google",
  "idToken":    "<authorization-code-from-client>",
  "verifierId": "<resolved-from-config-verifierMap>"
}
```
Note: the client sends `code` (OAuth authorization code); Wallet Backend passes it as `idToken` to ENN.

ENN response on success:
```json
{
  "res": "success",
  "status": true,
  "data": {
    "email":     "user@example.com",
    "publicKey": "<public-key>",
    "paramId":   "0x6193b497..."
  }
}
```
ENN response on failure:
```json
{ "res": "error", "status": false, "message": "Invalid SSO token" }
```
For SSO, identity is returned directly by ENN — no `encryptedPayload`, no decryption. `paramId` comes directly from `ennResult.paramId`, falling back to the user's stored `paramId` in `param_saas.subdomain_users` if ENN doesn't return one.

---

**ENN endpoint: `POST /v2/register_exchange`**

Used by `POST /auth/addapp`. Wallet Backend sends:
```json
{ "appId": "...", "publicKey": "...", "keystoreData": { } }
```
ENN response on success:
```json
{ "res": "success", "status": true, "data": { "exchangeId": "..." } }
```

---

**ENN endpoint: `POST /v4/onboard`**

Used **only for partner registration** (Phase 1). Creates a new blockchain identity for a partner's email when the sponsor adds them — the partner is not signing up themselves, so ENN does not run the OTP flow for them.

> **Important:** First-time signup (workspace admin, any new user) does **not** require this API. ENN registers new users implicitly during `send_otp` + `verify_otp`. Call `/v4/onboard` **only when a partner is added** by a sponsor — the sponsor's invite form triggers this to pre-register the partner's email domain and obtain `paramId`/`pennId` before the Partner SM document is filled.

**Request:**
```
POST {ENN_BASE_URL}/v4/onboard
param_exchange_enn_key: {exchangeEnnKey}
app-key: {config.appKey}
subdomain_name: {subdomain}
```
Query params (GET-style, e.g. `?email=...&subdomain=...`):
- `email` — user email to onboard
- `subdomain` — workspace subdomain (must match `subdomain_name` header)

**Example curl:**
```bash
curl -X POST "https://keystore.paramwallet.com:8006/v4/onboard" \
  -H "param_exchange_enn_key: {exchangeEnnKey}" \
  -H "app-key: {appKey}" \
  -H "subdomain_name: urban-indigo" \
  -G \
  --data-urlencode "email=admin@test1001.com" \
  --data-urlencode "subdomain=urban-indigo"
```

ENN response on success:
```json
{
  "res": "success",
  "status": true,
  "data": {
    "newOrg": false,
    "newUser": false,
    "ethId": "0xB4fb072f084c17B6E03e54FA2F3629a448ad5e74",
    "paramId": "NKEF8574",
    "metaInfo": {}
  }
}
```
- `ethId` — org-level Ethereum address (0x...) → platform stores as `paramId` / `Contact.C_Identifier`
- `paramId` — EHPI-style identifier (e.g. NKEF8574) → platform stores as `pennId` / `Contact.C_PenID`
- `newOrg` — whether a new org was created
- `newUser` — whether a new user was created
- `metaInfo` — optional metadata object

ENN response on failure:
```json
{ "res": "error", "status": false, "message": "..." }
```

> **Use case:** Partner onboarding Phase 1 only. Sponsor invites partner → call `/v4/onboard` to register the partner's email domain → `ethId` and `paramId` returned are stored in Partner SM `Contact.C_Identifier` and `Contact.C_PenID`. Do **not** use for first-time user signup — ENN handles that during OTP flow.

---

### 17.1 OTP Flow

> **First-time signup:** ENN implicitly registers new users during the OTP flow. No separate `/v4/onboard` or register API call is needed. When a user requests OTP and then verifies it, ENN creates the blockchain identity (paramId, pennId) if one does not exist. The `/v4/onboard` endpoint is **only** for partner registration — when a sponsor adds a partner who is not going through the OTP flow themselves.

```
POST   /auth/otp/request
```
**Body:** `{ email, deviceId? }`
**Action:** Calls ENN `/v2/send_otp`. No local state created. ENN handles new-user registration internally when OTP is sent.
**Response:** `{ "status": "sent", "message": "OTP sent to email" }`
**Error:** 502 if ENN returns `status: false` or is unreachable.

---

```
POST   /auth/otp/verify
```
**Body:** `{ email, otp, deviceId? }`
**Action:**
1. Call ENN `/v2/verify_otp` with `{ email, otp }`. ENN creates blockchain identity for first-time users during this step — no separate register call needed.
2. If `ennResult.status = false` → 401
3. Call `decryptEnnPayload(ennResult.encryptedPayload, otp)` (`enn-client.ts`) → AES-256-CTR with EVP_BytesToKey(SHA256(otp) hex string, Salted__ salt) → extract `ethID` → `paramId`, `paramID` → `pennId`, `publicKey` (see §17.0 Decryption of encryptedPayload for full algorithm)
4. Look up user in `param_saas.subdomain_users` by `email`. Resolve `paramId` in this order: (a) `user.paramId` if user exists, (b) `ethID` from decrypted payload, (c) `ennResult.paramId` (legacy fallback). If none available → 502 "Session creation failed"
5. `userId = SHA256(email.toLowerCase())`
6. Generate JWT token: `{ userId, email, paramId, exp }` + UUID refresh token
7. Store session in `param_auth.sessions`: `_id = "session:" + SHA256(token)`, full session fields
8. Return response (raw `encryptedPayload` never returned to client)

**Response:**
```json
{
  "token": "<jwt>",
  "refreshToken": "<uuid>",
  "expiresAt": 1740571200000,
  "isTermsAndConditionVerified": true,
  "user": {
    "userId": "<sha256(email.toLowerCase())>",
    "email": "user@example.com"
  },
  "enn": {
    "paramId": "<ethID from decrypted payload — 0x address>",
    "pennId":  "<paramID from decrypted payload — EHPI code>",
    "publicKey": "<publicKey from decrypted payload>"
  }
}
```
`enn` is present only when `encryptedPayload` was successfully decrypted; otherwise it is omitted.

---

### 17.2 SSO Flow

```
POST   /auth/sso/:provider
```
**Body:** `{ code, deviceId? }` — `:provider` from URL path (e.g. `google`, `microsoft`)
**Action:**
1. Resolve `verifierId` from `config.verifierMap[provider]`
2. Call ENN `/v2/verify_sso` with `{ provider, idToken: code, verifierId }`
3. If `ennResult.status = false` → 401
4. Get `email` from ENN response — 401 if empty
5. `paramId` = `ennResult.paramId` || fallback to `param_saas.subdomain_users[email].paramId`
6. `userId = SHA256(email.toLowerCase())`
7. Generate JWT + refresh token, store session in `param_auth.sessions`

**Response:** (different from OTP — no `enn` wrapper, no `isTermsAndConditionVerified` as ENN does not return these for SSO)
```json
{
  "token": "<jwt>",
  "refreshToken": "<uuid>",
  "expiresAt": 1740571200000,
  "user": {
    "userId": "<sha256(email.toLowerCase())>",
    "email": "user@example.com",
    "paramId": "0x6193b497..."
  }
}
```

---

### 17.3 Session Management

```
POST   /auth/refresh
```
**Headers:** `X-Param-ID: {paramId}` (required)
**Body:** `{ "refreshToken": "<uuid>" }`
**Action:** Find session by `refreshToken` in `param_auth.sessions`. If expired → delete + 401. Otherwise: generate new token pair, insert new session document (new `_id = "session:" + SHA256(newToken)`), delete old session document. No ENN call.
**Response:**
```json
{
  "token": "<new-jwt>",
  "refreshToken": "<new-uuid>",
  "expiresAt": 1740657600000,
  "user": {
    "userId": "<sha256(email)>",
    "email": "user@example.com",
    "paramId": "0x6193b497..."
  }
}
```

---

```
POST   /auth/logout
```
**Headers:** `Authorization: Bearer <token>`, `X-Param-ID: {paramId}`
**Action:** Deletes session where `_id = "session:" + SHA256(token)` from `param_auth.sessions`. Always returns success even if session was already missing or expired.
**Response:** `{ "status": "logged_out" }`

---

```
POST   /auth/addapp
```
**Headers:** `Authorization: Bearer <token>`, `X-Param-ID: {paramId}`
**Body:** `{ appId, publicKey, keystoreData? }`
**Guard:** Valid active session (validates Bearer token against `param_auth.sessions`).
**Action:** Validates session, then calls ENN `/v2/register_exchange` to register the app exchange for gPRM + SyncFactory keystores.
**Response:** `{ "status": "registered", "exchangeId": "..." }`

---

### 17.4 Partner Registration

> This endpoint is **only** for the Partner onboarding Phase 1 flow (see Section 15.5.1). When a sponsor adds a partner, the partner's email must be pre-registered in ENN to obtain `paramId`/`pennId` — the partner is not signing up via OTP at that moment. First-time users (including workspace admin) do **not** need this; ENN registers them during the OTP flow.

**Option A — Direct ENN call:**

Frontend calls ENN `/v4/onboard` directly when sponsor submits partner invite. See ENN endpoint `POST /v4/onboard` in Section 17.0. Headers: `param_exchange_enn_key`, `app-key`, `subdomain_name`. Query params: `email`, `subdomain`.

**Option B — Wallet Backend proxy:**

```
POST   /auth/domain/register
```
**Body:** `{ email, subdomain }`
**Headers:** `param_exchange_enn_key`, `app-key` (or derived from workspace/exchange context)
**Action:**
1. Call ENN `POST /v4/onboard` with `param_exchange_enn_key`, `app-key`, `subdomain_name`, and query params `email`, `subdomain`
2. ENN creates blockchain identity → returns `data.ethId` (0x address) + `data.paramId` (EHPI code)
3. Return `{ paramId, pennId }` to frontend (platform maps `ethId` → `paramId`, ENN `paramId` → `pennId`) — stored in Partner SM `Contact.C_Identifier` + `Contact.C_PenID` hidden fields

**Response from Wallet Backend (when proxying):**
```json
{ "paramId": "0x40Af9B6a...", "pennId": "NKEF8574" }
```

**Error:** 502 if ENN unavailable. 409 if email already registered for this subdomain.

---

## 18. Engine 4: Realtime Relay — Full Spec

> **Future implementation.** This engine is specified for architectural completeness but is **not part of the current build**. Implement when realtime event streaming to the browser is required.

Forwards NATS events from SyncFactory to connected browser clients (WebSocket or SSE). L1 org filtering applied before forwarding.

---

### 18.1 WebSocket Endpoint

```
WS     /ws
```
**Request:** WebSocket upgrade. **Auth:** `Authorization: Bearer <token>` header or `?token=<access-token>` query param (WebSocket doesn't support custom headers in some clients). `X-Workspace` required for event filtering.
**Action:** Validates session from `param_auth`, registers connection in hub keyed by `userId`.
**On auth failure:** Connection rejected or closed with code 4401. No event payload sent.
**On success:** Client receives event stream (see Section 18.3 for payload shape).

---

### 18.2 NATS Subscription

```
param.syncfactory.{workspace}.{smId}.*   → business document events
param.syncfactory.{workspace}.platform.* → platform events
```

---

### 18.3 Event Forwarding

On NATS event received:
1. Parse event: `{ docId, smId, stateTo, workspace, portal, roles }`
2. Find connected clients for this workspace
3. L1 filter: keep only clients whose `paramId` appears in `event.roles` values
4. Push to matching clients

**Event payload pushed to client:**
```json
{
  "type": "doc_update",
  "docId": "0xf97a54af...",
  "smId": "public:0xe1ec34e6...",
  "stateTo": "Contract:Booking",
  "timestamp": 1770447080,
  "actor": "<sha256(email)>"
}
```

---

### 18.4 SSE Fallback

```
GET    /sse
```
**Request:** GET with `Authorization: Bearer <token>` or `?token=` query param. `X-Workspace` required.
**Auth:** Validates session from `param_auth`.
**On auth failure:** 401 with `{ "error": "Unauthorized" }`.
**On success:** `Content-Type: text/event-stream`; same event payloads as WebSocket (Section 18.3).

---

### 18.5 Connection Management

- Hub: `Map<userId, Set<WebSocket>>`
- Max 5 concurrent connections per user — drops oldest on overflow
- Heartbeat ping every 30s; remove on disconnect

---

## 19. Engine 5: Notification Engine — Full Spec

> **Future implementation.** This engine is specified for architectural completeness but is **not part of the current build**. Implement when notification dispatch (email/Slack/WhatsApp/in-app) is required.

Consumes NATS events, resolves templates and recipients, dispatches via email/Slack/WhatsApp/in-app. Notification collections are scoped by workspace or SuperApp — see Section 13 for routing rules.

---

### 19.1 NATS Trigger

```
param.syncfactory.{workspace}.*.transition   → state transitions
param.syncfactory.{workspace}.*.create       → new documents
param.wallet.{workspace}.platform.*          → platform events (user added, org onboarded)
```

---

### 19.2 Intent Processor

1. Determine `superAppId` and event scope (workspace-level or superapp-level)
2. Read `notification_templates` from appropriate DB (workspace or superapp)
3. Resolve recipients: query `sapp.app_users` filtered by roles from event + L2 visibility
4. For each recipient: read `notification_preferences` for channel opt-in/out
5. Dispatch per enabled channel
6. Write result to `notification_logs` in appropriate DB
7. Write to `notification_inbox` in appropriate DB (in-app channel)
8. SMTP config always from `{subdomain}.email_config` regardless of scope

---

### 19.3 Channel Dispatchers

- **Email:** SMTP via nodemailer — config from `{subdomain}.email_config`
- **Slack:** POST to Slack Incoming Webhook URL (configured per org)
- **WhatsApp:** WhatsApp Business API (Twilio/Meta)
- **In-App:** Write to `notification_inbox`, push via NATS `param.wallet.{ws}.inbox.{userId}` → Realtime Relay

---

### 19.4 Notification REST APIs

```
GET    /notifications/inbox
```
**Guard:** Authenticated.
**Query:** `superAppId?`, `isRead?`, `page?`, `limit?`
**Reads:** If `superAppId` → `{subdomain}_{superAppId[0:8]}.notification_inbox`. Otherwise → `{subdomain}.notification_inbox`. Filtered to caller's `userId`.
**Response:**
```json
{
  "total": 12,
  "page": 1,
  "limit": 25,
  "items": [{ "_id": "...", "title": "...", "body": "...", "isRead": false, "createdAt": 1770447080 }]
}
```

---

```
PUT    /notifications/inbox/:id/read
```
**Guard:** Authenticated (own inbox only).
**Action:** Sets `isRead: true` for this inbox item.
**Response:** `{ "_id": "...", "isRead": true }`

---

```
PUT    /notifications/inbox/read-all
```
**Guard:** Authenticated.
**Query:** `superAppId?` (scopes to superapp inbox or workspace inbox).
**Action:** Sets `isRead: true` for all unread items belonging to caller's `userId`.
**Response:** `{ "updated": 7 }`

---

```
GET    /notifications/preferences/:superAppId
```
**Guard:** Authenticated.
**Reads:** `{subdomain}_{superAppId[0:8]}.notification_preferences` for caller's `userId`.
**Response:**
```json
{
  "userId": "<sha256(email)>",
  "superAppId": "86bbaa780565662b3154",
  "channels": { "email": true, "slack": false, "whatsapp": true, "inApp": true }
}
```

---

```
PUT    /notifications/preferences/:superAppId
```
**Guard:** Authenticated (own preferences only).
**Body:** `{ channels: { email?, slack?, whatsapp?, inApp? } }`
**Action:** Upserts `notification_preferences` for caller's `userId` in `{subdomain}_{superAppId[0:8]}`.
**Response:** Updated preferences document. Same shape as GET /notifications/preferences/:superAppId.

---

```
GET    /notifications/logs
```
**Guard:** Workspace admin.
**Query:** `superAppId?`, `from?`, `to?`, `page?`, `limit?`
**Reads:** `notification_logs` from appropriate DB (workspace or superapp).
**Response:**
```json
{
  "total": 42,
  "page": 1,
  "limit": 25,
  "logs": [
    { "_id": "...", "userId": "<sha256>", "eventType": "state_transition", "channel": "email", "status": "sent", "sentAt": 1770447080, "docId": "0xf97a54af...", "templateId": "..." }
  ]
}
```
`logs` items: delivery audit — `eventType`, `channel`, `status` (sent/failed), `sentAt`, `docId`, `templateId`, etc. Filtered by `from`/`to` timestamp range when provided.

---

## 20. Middleware Chain & Request Context

### 20.1 Lifecycle Order

```
HTTP Request
    │
    ▼
onRequest: authMiddleware
    │  reads: param_auth.sessions → validate session token
    │  sets: request.authContext = {
    │    paramId,        // from X-Param-ID — caller's org Param ID
    │    workspace,      // from X-Workspace
    │    superAppId,     // from X-SuperApp-ID (optional)
    │    portal,         // from X-Portal (optional)
    │    isAuthenticated
    │  }
    ▼
preHandler: deriveRequestContext
    │  reads: authContext
    │  sets: request.requestContext = {
    │    workspace,      // from X-Workspace
    │    superAppId,     // from X-SuperApp-ID (optional — resolves SuperApp DB)
    │    portal,         // from X-Portal (optional — needed for Org Partition DB)
    │    dbName,         // resolved DB name (see Section 21)
    │  }
    ▼
preHandler: platformContextMiddleware
    │  reads: requestContext → query sapp.app_users for caller's plant-team assignment
    │  sets: request.platformContext = {
    │    superAppId,     // from query param or body
    │    role,           // caller's role in this SuperApp
    │    plantTeams,     // caller's per-plant team assignments [{plant, teams[]}]
    │    isOrgAdmin,     // can manage org users
    │    isWorkspaceAdmin // owns the workspace
    │  }
    ▼
preHandler: rbacMiddleware (per-route guard)
    │  checks: platformContext against required role for this route
    │  403 if unauthorized
    ▼
Route Handler
```

### 20.2 Required Headers

| Header | Required | Description |
|---|---|---|
| `X-Param-ID` | Yes | Caller's org Param ID |
| `X-Workspace` | Yes | Workspace subdomain |
| `X-SuperApp-ID` | Optional | SuperApp ID (for SuperApp DB + Org Partition DB resolution) |
| `X-Portal` | Optional | Portal name (for Org Partition DB) |

### 20.3 Auth Context Population

```typescript
interface AuthContext {
  paramId: string;         // X-Param-ID — caller's org Param ID
  workspace: string;       // X-Workspace
  superAppId: string;      // X-SuperApp-ID (optional)
  portal: string;          // X-Portal (optional)
}
```

---

## 21. Database Resolver Logic

### 21.1 Org Partition DB Name Resolution

```typescript
function resolveOrgPartitionDbName(ctx: RequestContext): string {
  const { workspace, superAppId, paramId, portal } = ctx;

  // Must have all components for a valid Org Partition DB name
  if (!superAppId || !paramId || !portal) {
    // Fall back to workspace DB for workspace-level operations
    return workspace; // just the subdomain, e.g. "bosch-exim"
  }

  const superAppPrefix = superAppId.substring(0, 8); // first 8 hex chars
  const orgSuffix = paramId.replace(/^0x/, '').substring(0, 20); // strip 0x, take 20 chars

  return `${workspace}_${superAppPrefix}_${orgSuffix}_${portal}`;
}
```

### 21.2 SuperApp DB Name Resolution

```typescript
function resolveSuperAppDbName(workspace: string, superAppId: string): string {
  const superAppPrefix = superAppId.substring(0, 8);
  return `${workspace}_${superAppPrefix}`; // e.g. "bosch-exim_86bbaa78"
}
```

### 21.3 Workspace DB Resolution

```typescript
function resolveWorkspaceDb(workspace: string): string {
  return workspace; // DB name = subdomain directly, e.g. "bosch-exim"
}
```

### 21.4 Definitions DB Resolution

```typescript
function resolveDefinitionsDb(): string {
  return 'param_definitions'; // single canonical name per exchange deployment
}
```

### 21.5 DB Connection Strategy

- Maintain a connection pool map: `Map<dbName, Db>`
- On first access: connect via existing MongoClient, call `client.db(dbName)`
- All engines share the same MongoClient (one connection pool per MongoClient)
- Exchange DB requires a separate MongoClient if on a different MongoDB instance

---

## 22. RBAC Enforcement at Runtime

### 22.0 App User Context Resolution

**Before any RBAC check, the caller's `app_users` context must be resolved correctly.**

- **Sponsor user** — no `partnerId` in their doc. `findOne({ userId, superAppId })` returns exactly one document covering all their plants.
- **Vendor user** — one doc per `partnerId`. `find({ userId, superAppId })` may return multiple documents, each scoped to one vendor context's plants. The correct context for a given document is determined by which context's `plantTeams` overlaps with the document's plant.

**Resolution rule:** use the document's `_chain._sys.plantIDs[callerOrgParamId]` to identify the plant, then find the `app_users` document whose `plantTeams` contains that plant.

```typescript
// Resolve the correct app_users context for a specific document.
// Handles both sponsor (single doc) and vendor (multiple docs, one per partnerId).
//
// partnerIdHint: pass when partner_id is present in the request — skips plant-based
// resolution and directly fetches the exact vendor context. Faster and unambiguous.
async function resolveAppUserContext(
  appUsersCol: Collection,
  userId: string,
  superAppId: string,
  callerOrgParamId: string,
  doc: SmDocument,
  partnerIdHint?: string   // optional — from request's partner_id param
): Promise<AppUser | null> {
  // Fast path: partner_id was given in the request — directly fetch that vendor context.
  // Sponsor users never pass partner_id so this branch never runs for them.
  if (partnerIdHint) {
    return appUsersCol.findOne({ userId, superAppId, partnerId: partnerIdHint });
  }

  const docPlants = doc._chain._sys.plantIDs?.[callerOrgParamId] ?? [];

  if (docPlants.length > 0) {
    // Pick the context whose plantTeams includes the document's plant.
    // - Sponsor: their single doc covers all their plants → matched directly.
    // - Vendor (no partner_id hint): find whichever context covers this plant.
    return appUsersCol.findOne({
      userId,
      superAppId,
      'plantTeams.plant': { $in: docPlants },
    });
  }

  // No plant metadata on document — fall back to any context for this user.
  // All contexts share the same role so access is equivalent for plant-free docs.
  return appUsersCol.findOne({ userId, superAppId });
}

// For document listing: collect all plants across all vendor contexts.
// Used to pre-filter documents before per-doc RBAC resolution.
async function resolveAllUserPlants(
  appUsersCol: Collection,
  userId: string,
  superAppId: string,
  callerOrgParamId: string
): Promise<string[]> {
  const allContexts = await appUsersCol.find({ userId, superAppId }).toArray();
  const allPlants = allContexts.flatMap(ctx => ctx.plantTeams.map((pt: any) => pt.plant));
  return [...new Set(allPlants)];
}
```

---

### 22.1 L1 Check (Org Partition — implicit)

L1 is satisfied implicitly by the Org Partition DB structure. SyncFactory only writes documents to the partition DB for orgs that have L1 visibility for that state. Querying the caller's Org Partition DB (`{subdomain}_{superappId[0:8]}_{callerOrg[2:22]}_{portal}`) inherently filters to documents the org can see.

An explicit L1 cross-check is still performed as a safety guard:

```typescript
function passesL1(doc: SmDocument, callerOrgParamId: string): boolean {
  // caller's org must be mapped to some role in this document
  return Object.values(doc._chain.roles).includes(callerOrgParamId);
}
```

### 22.2 L2 Check (Team Permission + Plant-Team Resolution)

```typescript
// Resolve teams from plantTeams for the document's plant(s)
function resolveCallerTeams(
  appUser: AppUser,
  callerOrgParamId: string,
  docPlantIDs: Record<string, string[]>
): string[] {
  const docPlants = docPlantIDs?.[callerOrgParamId] ?? [];
  if (docPlants.length === 0) {
    // No plant restriction on document — use first plant-team entry as default
    return appUser.plantTeams[0]?.teams ?? [];
  }
  // Find the user's team assignments for one of the document's plants
  const match = appUser.plantTeams.find(pt => docPlants.includes(pt.plant));
  return match?.teams ?? [];
}

// Returns the most permissive access across all of the caller's teams
function resolveTeamAccess(
  teamRbacMatrix: TeamRbacMatrix,
  roleName: string,
  teams: string[],
  state: string,
  subState: string | null,
  microState: string | null
): "RW" | "RO" | "N/A" {
  const accesses = teams.map(t => getTeamAccess(teamRbacMatrix, roleName, t, state, subState, microState));
  if (accesses.includes("RW")) return "RW";
  if (accesses.includes("RO")) return "RO";
  return "N/A";
}

// Look up team permission from team_rbac_matrix
function getTeamAccess(
  teamRbacMatrix: TeamRbacMatrix,
  roleName: string,
  teamName: string,
  state: string,
  subState: string | null,
  microState: string | null
): "RW" | "RO" | "N/A" {
  const key = `${roleName}.${teamName}`;

  // Most specific match wins: microState > subState > state
  const entry =
    teamRbacMatrix.permissions.find(p =>
      p.state === state && p.subState === subState && p.microState === microState
    ) ??
    teamRbacMatrix.permissions.find(p =>
      p.state === state && p.subState === subState && p.microState === null
    ) ??
    teamRbacMatrix.permissions.find(p =>
      p.state === state && p.subState === null && p.microState === null
    );

  return entry?.access[key] ?? "N/A";
}
```

### 22.3 L3 Check (Document-Level Restriction)

```typescript
interface RestrictedToEntry {
  userId: string;
  role: string;
  team: string;
}

function passesL3(
  doc: SmDocument,
  callerId: string,
  callerRole: string,
  callerTeam: string
): boolean {
  const restrictedTo: RestrictedToEntry[] = doc._chain._sys.restrictedTo ?? [];

  if (restrictedTo.length === 0) return true; // no restriction, skip L3

  // Check if any entries exist for the caller's {role, team} combination
  const teamEntries = restrictedTo.filter(
    e => e.role === callerRole && e.team === callerTeam
  );

  if (teamEntries.length === 0) {
    // No restriction targeting this team → L3 does not apply to caller → pass
    return true;
  }

  // This team IS restricted — caller must be explicitly listed
  return teamEntries.some(e => e.userId === callerId);
}
```

### 22.4 Plant Filter (Combined with L2)

```typescript
// Returns false if user has no plant overlap with the document (no team can be resolved)
function passesPlantFilter(
  doc: SmDocument,
  callerOrgParamId: string,
  appUser: AppUser
): boolean {
  const docPlants = doc._chain._sys.plantIDs?.[callerOrgParamId];
  if (!docPlants || docPlants.length === 0) return true; // no plant restriction on document

  const userPlants = appUser.plantTeams.map((pt: any) => pt.plant);
  return docPlants.some((p: string) => userPlants.includes(p));
}
```

### 22.5 Combined Access Resolution

`resolveDocumentAccess` operates on a **pre-resolved** `appUser` context (from `resolveAppUserContext` in 22.0). It does not do the context lookup itself — that separation keeps it synchronous and testable.

```typescript
// Returns null (hidden) or "RO" | "RW" for the document.
// appUser must already be the correct context for this document (see 22.0).
function resolveDocumentAccess(
  doc: SmDocument,
  appUser: AppUser,
  teamRbacMatrix: TeamRbacMatrix,
  callerOrgParamId: string
): "RW" | "RO" | null {
  // L1: implicit via partition DB + explicit guard
  if (!passesL1(doc, callerOrgParamId)) return null;

  // Plant filter: verify this context actually covers the document's plant
  if (!passesPlantFilter(doc, callerOrgParamId, appUser)) return null;

  // L2: resolve teams from plant, look up permission (most permissive across all teams)
  const teams = resolveCallerTeams(appUser, callerOrgParamId, doc._chain._sys.plantIDs ?? {});
  if (teams.length === 0) return null;

  const state     = doc._local.state;
  const subState  = doc._local.subState ?? null;
  const microState = doc._local.microState ?? null;
  const access = resolveTeamAccess(teamRbacMatrix, appUser.role, teams, state, subState, microState);
  if (access === "N/A") return null;

  // L3: document-level restriction
  const passesL3Check = teams.some(team => passesL3(doc, appUser.userId, appUser.role, team));
  if (!passesL3Check) return null;

  return access; // "RW" or "RO"
}
```

**Caller pattern — document listing (`GET /documents`):**

```typescript
// Step 1: resolve all plants across all vendor contexts for this user
const userPlants = await resolveAllUserPlants(appUsersCol, userId, superAppId, callerOrgParamId);

// Step 2: build optional partnerId filter (vendor only, when partner_id param is present)
const partnerIdFilter = buildPartnerIdFilter(callerRole, callerIsSponsor, req.query.partner_id);

// Step 3: L1 query — scope to caller's org + plants + optional partnerId
const docs = await orgPartDb.collection(smCollection).find({
  [`_chain.roles.${callerRole}`]: callerOrgParamId,
  ...(userPlants.length > 0 && {
    [`_chain._sys.plantIDs.${callerOrgParamId}`]: { $elemMatch: { $in: userPlants } }
  }),
  ...(partnerIdFilter ?? {}),
}).toArray();

// Step 4: per-doc context resolution + L2 + L3
// Pass partnerIdHint when partner_id was in the request — skips plant-based resolution
const partnerIdHint = callerIsSponsor ? undefined : req.query.partner_id;
const filteredDocs = (await Promise.all(docs.map(async doc => {
  const appUser = await resolveAppUserContext(
    appUsersCol, userId, superAppId, callerOrgParamId, doc, partnerIdHint
  );
  if (!appUser) return null;
  const access = resolveDocumentAccess(doc, appUser, teamRbacMatrix, callerOrgParamId);
  if (!access) return null;
  return { ...doc, access };
}))).filter(Boolean);
```

**Caller pattern — single document (`GET /documents/:docId`):**

```typescript
const doc = await orgPartDb.collection(smCollection).findOne({ _id: docId });
if (!doc) return reply.status(404).send();

// Resolve the right vendor context for this specific document
// Pass partnerIdHint from request if caller is vendor and partner_id was supplied
const appUser = await resolveAppUserContext(
  appUsersCol, userId, superAppId, callerOrgParamId, doc, partnerIdHint
);
if (!appUser) return reply.status(403).send();

const access = resolveDocumentAccess(doc, appUser, teamRbacMatrix, callerOrgParamId);
if (!access) return reply.status(403).send();
```

---

### 22.6 Partner ID Document Filter

When `partner_id` is passed as a query parameter to `GET /documents`:

| Caller type | `partner_id` passed | Behaviour |
|---|---|---|
| **Sponsor** | any | Filter **ignored** — sponsor sees all documents for their org regardless |
| **Vendor** | yes | Add MongoDB filter: `{ "_participants.{callerRole}.C_InternalID": partner_id }` |
| **Vendor** | no | No partnerId filter — vendor sees documents across **all** their vendor contexts |

**How it works:**

`_participants` is written by SyncFactory when the document is created. For each vendor/partner role, SyncFactory includes `C_InternalID` (the sponsor-assigned vendor ID, from `Contact.C_InternalID` of the Partner SM). This field is what the filter targets.

```typescript
// Applied in GET /documents query — step 5 of the logic
function buildPartnerIdFilter(
  callerRole: string,
  callerIsSponsor: boolean,
  partnerIdParam: string | undefined
): Record<string, unknown> | null {
  // Sponsor never filtered by partnerId
  if (callerIsSponsor) return null;

  // Vendor with no partner_id param — show all their documents
  if (!partnerIdParam) return null;

  // Vendor with partner_id — scope to documents where their role has that C_InternalID
  return { [`_participants.${callerRole}.C_InternalID`]: partnerIdParam };
}
```

**Effect on `resolveAppUserContext`:** when `partner_id` is passed, pass it as `partnerIdHint` to `resolveAppUserContext` (Section 22.0). This skips plant-based resolution and directly returns the exact `app_users` document for that vendor context — faster and unambiguous.

**How to determine `callerIsSponsor`:** check if the caller's `app_users` document has no `partnerId` field. Sponsor `app_users` docs never carry `partnerId`; vendor docs always do.

---

## 23. Project File Structure

```
packages/wallet-backend/
├── src/
│   ├── index.ts                        # entry point, starts Fastify server
│   ├── app.ts                          # Fastify instance, plugin registration
│   ├── config.ts                       # env config (MONGO_URI, NATS_URL, etc.)
│   ├── logger.ts                       # pino logger config
│   │
│   ├── db/
│   │   ├── mongo.ts                    # MongoClient singleton + connection pool
│   │   ├── resolver.ts                 # DB name resolution logic (orgPartition, superapp, workspace, definitions)
│   │   ├── platform-db.ts              # helpers for platform DB operations (SuperApp DB + workspace DB)
│   │   ├── definitions-db.ts           # helpers for param_definitions reads
│   │   └── queries.ts                  # shared MongoDB query builders
│   │
│   ├── nats/
│   │   └── client.ts                   # NATS JetStream client singleton
│   │
│   ├── middleware/
│   │   ├── auth.ts                     # authMiddleware (validates session from param_auth)
│   │   ├── request-context.ts          # deriveRequestContext (resolves dbName)
│   │   ├── platform-context.ts         # platformContextMiddleware (resolves role/team)
│   │   ├── rbac.ts                     # requireRole / requireWorkspaceAdmin guards
│   │   └── error-handler.ts            # global error handler
│   │
│   └── engines/
│       │
│       ├── platform/
│       │   ├── router.ts               # Fastify plugin, mounts all platform routes
│       │   ├── schemas.ts              # Zod/JSON schemas for all platform endpoints
│       │   ├── workspace.handler.ts    # /workspace/* handlers
│       │   ├── definitions.handler.ts  # /definitions/* handlers (reads param_definitions)
│       │   ├── superapp.handler.ts     # /superapp/install, /superapp/* handlers
│       │   ├── partner.handler.ts      # /superapp/:id/partners/* + /orgs/* handlers
│       │   ├── user.handler.ts         # /superapp/:id/roles/:role/users handlers
│       │   ├── team-rbac.handler.ts    # /superapp/:id/team-rbac-matrix handlers
│       │   ├── profile.handler.ts      # /profile, /user/profile handlers
│       │   └── org.handler.ts          # /workspace/organizations, /workspace/plants, /superapp/:id/org/profile, /superapp/:id/orgs
│       │
│       ├── query/
│       │   ├── router.ts               # Fastify plugin, mounts all query routes
│       │   ├── schemas.ts              # query endpoint schemas
│       │   ├── documents.handler.ts    # /documents, /documents/:docId
│       │   ├── chain.handler.ts        # /documents/:docId/chain, /documents/:docId/diff
│       │   ├── actions.handler.ts      # /documents/:docId/actions (L1+L2+L3, all action sources)
│       │   ├── offchain.handler.ts     # /offchain/registry/*, /offchain/config/*
│       │   └── rbac-filter.ts          # L1+L2+L3 RBAC filter utilities (resolveDocumentAccess)
│       │
│       ├── auth/
│       │   ├── router.ts               # /auth/* routes
│       │   ├── schemas.ts
│       │   ├── enn-client.ts           # HTTP client for ENN service
│       │   ├── otp.handler.ts          # /auth/otp/request, /auth/otp/verify
│       │   ├── sso.handler.ts          # /auth/sso/:provider
│       │   └── session.handler.ts      # /auth/refresh, /auth/logout, /auth/addapp
│       │
│       ├── realtime/
│       │   ├── ws-router.ts            # WebSocket + SSE routes
│       │   ├── ws-hub.ts               # connection registry
│       │   ├── nats-subscriber.ts      # NATS subscription + event routing
│       │   └── types.ts                # realtime event type definitions
│       │
│       └── notification/
│           ├── router.ts               # /notifications/* REST routes
│           ├── schemas.ts
│           ├── intent-processor.ts     # NATS event → notification intent
│           ├── recipient-resolver.ts   # determine who to notify (L1+L2 filtered)
│           ├── dispatchers.ts          # email/slack/whatsapp/inApp dispatchers
│           ├── inbox.handler.ts        # /notifications/inbox/*
│           ├── preferences.handler.ts  # /notifications/preferences/*
│           ├── template.handler.ts     # template rendering
│           └── log.handler.ts          # /notifications/logs
│
├── tests/
│   ├── setup.ts                        # MongoMemoryServer setup, test helpers
│   ├── helpers/
│   │   └── test-db.ts                  # seed helpers for exchange, project, workspace DBs
│   └── engines/
│       ├── platform/
│       │   ├── workspace.test.ts
│       │   ├── superapp-install.test.ts
│       │   ├── partner.test.ts
│       │   ├── user.test.ts
│       │   ├── team-rbac.test.ts
│       │   └── platform-integration.test.ts
│       ├── query/
│       │   ├── documents.test.ts
│       │   ├── actions.test.ts
│       │   ├── offchain.test.ts
│       │   └── rbac-filter.test.ts
│       ├── auth/
│       │   └── session.test.ts
│       ├── realtime/
│       │   └── ws-hub.test.ts
│       └── notification/
│           └── intent-processor.test.ts
│
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 24. Technology Stack & Dependencies

| Category | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20+ |
| Language | TypeScript | 5.x |
| Framework | Fastify | 4.x |
| WebSocket | @fastify/websocket | latest |
| MongoDB Driver | mongodb | 6.x |
| Test DB | @shelf/jest-mongodb / MongoMemoryServer | latest |
| NATS Client | nats | 2.x (JetStream) |
| Test Runner | Vitest | 1.x |
| Logger | Pino | 8.x |
| HTTP Client | got / node-fetch | for ENN proxy |
| Email | nodemailer | 6.x |
| Validation | Zod (for internal) + Fastify JSON schema (for HTTP) | - |
| Build | tsc | 5.x |
| Process mgr | Node.js native (--watch in dev) | - |

### 24.1 Environment Variables

```
MONGO_URI=mongodb://localhost:27017
NATS_URL=nats://localhost:4222
ENN_BASE_URL=http://enn-service:3000
PORT=3001
LOG_LEVEL=info
NODE_ENV=production
```

---

## 25. Implementation Sequence

Build in this order. Each phase is independently testable. **Current build scope:** Phases 1–4 and 7 (Foundation, Platform Manager, Query Engine, Auth Gate, Integration). Phases 5–6 (Realtime Relay, Notification Engine) are **future** — defer until those capabilities are required.

### Phase 1: Foundation (Days 1-2)
1. Project setup: Fastify app, TypeScript config, Vitest setup
2. MongoDB connection (`db/mongo.ts`) + MongoMemoryServer for tests
3. NATS client (`nats/client.ts`)
4. DB resolver (`db/resolver.ts`) with full test coverage
5. Middleware: `auth.ts`, `request-context.ts`, `platform-context.ts`, `error-handler.ts`
6. Config (`config.ts`), logger (`logger.ts`)

### Phase 2: Platform Manager (Days 3-5)
7. Definitions handler (`definitions.handler.ts`) — reads from `param_definitions` (seed test data in tests)
8. Workspace handler (`workspace.handler.ts`) — create, list, get
9. SuperApp install handler (`superapp.handler.ts`) — full install sequence
10. Partner onboard handler (`partner.handler.ts`)
11. User assignment handler (`user.handler.ts`)
12. Team RBAC handler (`team-rbac.handler.ts`)
13. Profile handler (`profile.handler.ts`)

### Phase 3: Query Engine (Days 6-8)
15. RBAC filter utilities (`rbac-filter.ts`) — L1 + L2 + plant — test thoroughly
16. Documents handler (`documents.handler.ts`) — list + get
17. Actions handler (`actions.handler.ts`) — reads `param_definitions.onchain_sm_definitions`, applies L1+L2+L3 RBAC, computes all action sources (nextState + alternateNext + subState transitions + linkedSMs)
18. Chain handler (`chain.handler.ts`) — history + diff
19. OffChain handler (`offchain.handler.ts`)

### Phase 4: Auth Gate (Day 9)
21. ENN client (`enn-client.ts`)
22. OTP + SSO + session handlers

### Phase 5: Realtime Relay (Day 10) — *Future*
23. WebSocket hub (`ws-hub.ts`)
24. NATS subscriber (`nats-subscriber.ts`) + event routing with L1 filter
25. SSE fallback
26. WS router

### Phase 6: Notification Engine (Days 11-12) — *Future*
27. Intent processor (`intent-processor.ts`) + recipient resolver
28. Dispatchers (email, in-app — others configurable)
29. Inbox + preferences REST APIs

### Phase 7: Integration & Hardening (Days 13-14)
30. Full integration tests end-to-end through real Fastify pipeline
31. Error handling for all edge cases (missing headers, DB not found, etc.)
32. Index creation for all collections on app startup
33. Graceful shutdown (NATS drain, MongoDB close)

---

## 26. Key Implementation Rules

### Business Collections Are Read-Only for Wallet Backend

SM documents (`sm_*`), transaction history (`txn_history`), and chain head (`chain_head`) are written exclusively by SyncFactory. Wallet Backend only reads from them via the Query Engine.

```typescript
// Query Engine reads SM documents from the caller's Org Partition DB
const orgPartDb = client.db(resolveOrgPartitionDbName(request.requestContext));
const doc = await orgPartDb.collection('sm_Contract_e1ec34').findOne({ _id: docId });
```

### All DB Names Come from Resolver Functions

DB names are constructed from request context using resolver functions. This ensures correctness as naming conventions evolve and avoids hardcoded strings scattered through handlers.

```typescript
// Org Partition DB — for SM docs, txn_history, chain_head, drafts
const dbName = resolveOrgPartitionDbName(request.requestContext);
const db = client.db(dbName);

// SuperApp DB — for organizations, team_rbac_matrix, app_users, offchain data
const sappDb = client.db(resolveSuperAppDbName(workspace, superAppId));

// Workspace DB — for installed_superapps, plants, email_config
const wsDb = client.db(resolveWorkspaceDb(workspace));

// Definitions DB — for onchain_sm_definitions, superapp_definitions, etc.
const defsDb = client.db(resolveDefinitionsDb());
```

### SM Definitions Are Always Read from `param_definitions`

`onchain_sm_definitions` and `onchain_schema_definitions` live in `param_definitions` and are the source of truth for SM topology, field schemas, and L1 RBAC rules.

```typescript
const defsDb = client.db('param_definitions');
const smDef = await defsDb.collection('onchain_sm_definitions').findOne({ _id: smId });
const schema = await defsDb.collection('onchain_schema_definitions').findOne({ _id: schemaId });
```

### Platform State (RBAC, Users, Org Bindings) Comes from SuperApp DB

`organizations`, `team_rbac_matrix`, and `app_users` are shared across all orgs and live in the SuperApp DB. The Org Partition DB holds only `drafts` and SyncFactory-written business collections.

```typescript
const superAppDb = client.db(resolveSuperAppDbName(workspace, superAppId));
const rbac = await superAppDb.collection('team_rbac_matrix').findOne({ smId });

// Do NOT use a bare findOne for app_users — vendor users have multiple docs (one per partnerId).
// Use resolveAppUserContext (Section 22.0) to get the right context for the document being accessed.
// For document listing, use resolveAllUserPlants to collect all plants first, then resolve per-doc.
const appUsersCol = superAppDb.collection('app_users');
```

### `installed_superapps` Is Resolved from the Workspace DB

A user needs to see all installed SuperApps before entering any specific one — so this collection lives in `{subdomain}`, not inside any SuperApp DB.

```typescript
const wsDb = client.db(workspace);
const installedApps = await wsDb.collection('installed_superapps').find({ status: 'active' }).toArray();
```

### Document Access Applies All Three RBAC Levels (L1 → L2 → L3)

Every document served by the Query Engine passes through three sequential checks. L1 is implicit via the Org Partition DB partition. L2 and L3 are applied per-document using the resolved `app_users` context (see Section 22.0 for sponsor vs vendor lookup rules).

```typescript
// Step 1: collect all plants across all vendor contexts for pre-filtering
const userPlants = await resolveAllUserPlants(appUsersCol, userId, superAppId, callerOrgParamId);

// Step 2: build partnerId filter if applicable (vendor + partner_id param present)
const partnerIdFilter = buildPartnerIdFilter(callerRole, callerIsSponsor, partnerIdParam);

// Step 3: L1 — query caller's Org Partition DB scoped to their org + plants + partnerId
const docs = await orgPartDb.collection(smCollection).find({
  [`_chain.roles.${callerRole}`]: callerOrgParamId,
  ...(userPlants.length > 0 && {
    [`_chain._sys.plantIDs.${callerOrgParamId}`]: { $elemMatch: { $in: userPlants } }
  }),
  ...(partnerIdFilter ?? {}),
}).toArray();

// Step 4: L2 + L3 — per doc, resolve vendor context (use partnerIdHint if provided)
const partnerIdHint = callerIsSponsor ? undefined : partnerIdParam;
const filteredDocs = (await Promise.all(docs.map(async doc => {
  const appUser = await resolveAppUserContext(
    appUsersCol, userId, superAppId, callerOrgParamId, doc, partnerIdHint
  );
  if (!appUser) return null;
  const access = resolveDocumentAccess(doc, appUser, teamRbacMatrix, callerOrgParamId);
  if (!access) return null;
  return { ...doc, access };
}))).filter(Boolean);
```

### Notification Collections Are Scoped to the Event Level

Workspace-level notifications live in `{subdomain}`. SuperApp-level notifications live in `{subdomain}_{superappId[0:8]}`. SMTP config is always read from `{subdomain}.email_config` regardless of event level.

```typescript
// SuperApp-level notification
const sappDb = client.db(resolveSuperAppDbName(workspace, superAppId));
const pref = await sappDb.collection('notification_preferences').findOne({ userId });
await sappDb.collection('notification_inbox').insertOne(inboxEntry);

// Workspace-level notification
const wsDb = client.db(workspace);
const pref = await wsDb.collection('notification_preferences').findOne({ userId });
await wsDb.collection('notification_inbox').insertOne(inboxEntry);

// SMTP config — always workspace-level
const smtpConfig = await wsDb.collection('email_config').findOne({ _id: 'emailconfig:main' });
```

---