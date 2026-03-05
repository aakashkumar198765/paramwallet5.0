# Wallet Frontend — Implementation Plan
**Version:** 1.0 | **Date:** 2026-03-05 | **Status:** Authoritative

---

## 1. Technology Stack

| Category | Technology | Version | Rationale |
|---|---|---|---|
| Framework | React 18 | 18.x | Concurrent features (Suspense, useTransition) for smooth loading; best virtualization ecosystem |
| Build tool | Vite 5 | 5.x | Sub-second HMR; tree-shaking; route-based code splitting |
| Language | TypeScript | 5.x | Type safety across 50+ API calls; RBAC-driven conditional UI |
| State (UI) | Zustand | 4.x | Minimal boilerplate; shared workspace/superapp/demo state; no Redux ceremony |
| State (server) | TanStack Query v5 | 5.x | Caching, pagination, background refetch; eliminates manual loading states |
| UI Library | shadcn/ui (Radix + Tailwind CSS) | latest | Unstyled, accessible Radix primitives; Tailwind for rapid custom styling; dark mode via CSS variables |
| Table | TanStack Table v8 | 8.x | Server-side pagination; column sorting; integrates with TanStack Virtual |
| Virtualization | TanStack Virtual | 3.x | Windowed rendering — only 20–30 rows in DOM regardless of total count |
| Forms | React Hook Form + Zod | RHF 7.x, Zod 3.x | Schema-driven forms from `onchain_schema_definitions`; no re-render on every keystroke |
| Routing | React Router v6 | 6.x | Nested layouts; URL encodes workspace + SuperApp context |
| HTTP | Axios | 1.x | Interceptors inject auth headers; automatic token refresh on 401 |
| Icons | Lucide React | latest | Tree-shakeable; consistent |
| Date formatting | date-fns | 3.x | Lightweight; tree-shakeable |

### 1.1 Environment Variables

```
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_PARAMGATEWAY_BASE_URL=http://speedtest.param.network:8450   # ParamGateway; definitions full integration
```

---

## 2. Project Structure

```
packages/wallet-frontend/
├── public/
│
├── src/
│   ├── main.tsx                        # React root; router setup
│   ├── App.tsx                         # Top-level route provider + QueryClientProvider
│   │
│   ├── api/
│   │   ├── client.ts                   # Axios instance; interceptors; token refresh
│   │   ├── auth.api.ts                 # /auth/* endpoints
│   │   ├── workspace.api.ts            # /workspace/* endpoints
│   │   ├── definitions.api.ts          # /definitions/* endpoints
│   │   ├── superapp.api.ts             # /superapp/* endpoints
│   │   ├── org.api.ts                  # /superapp/:id/orgs, /partners/onboard
│   │   ├── user.api.ts                 # /superapp/:id/roles/:role/users
│   │   ├── team-rbac.api.ts            # /superapp/:id/team-rbac-matrix
│   │   ├── documents.api.ts            # /documents, /documents/:id, /actions, /diff, /chain
│   │   ├── offchain.api.ts             # /offchain/* endpoints
│   │   └── paramgateway/
│   │       ├── client.ts               # Base URL, headers (X-Gateway-Role, X-Workspace), fetch/axios
│   │       ├── executePipeline.ts      # POST pipelines/{id}/execute
│   │       ├── getBatchTasks.ts        # GET batches/{batchId}/tasks
│   │       ├── definitions/           # Full integration: execute → poll until synced
│   │       │   ├── onchainSm.ts
│   │       │   ├── onchainSchema.ts
│   │       │   ├── offchainSm.ts
│   │       │   └── offchainSchema.ts
│   │       ├── stubs/                  # Stub until API provided
│   │       │   ├── documentCreate.ts
│   │       │   └── documentTransition.ts
│   │       └── types.ts
│   │
│   ├── store/
│   │   ├── auth.store.ts               # user, token, paramId
│   │   ├── workspace.store.ts          # activeWorkspace, workspaceList
│   │   ├── superapp.store.ts           # activeSuperApp, activeDocType (state)
│   │   └── demo.store.ts               # isDemoMode, demoRole
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                  # login, logout, token refresh
│   │   ├── useWorkspace.ts             # TanStack Query wrappers for workspace APIs
│   │   ├── useDefinitions.ts           # TanStack Query wrappers for definition APIs
│   │   ├── useSuperApp.ts              # TanStack Query wrappers for superapp APIs
│   │   ├── useDocuments.ts             # Paginated document list + single doc
│   │   ├── useActions.ts               # GET /documents/:id/actions
│   │   ├── useDiff.ts                  # GET /documents/:id/diff
│   │   ├── useChain.ts                 # GET /documents/:id/chain
│   │   ├── useOffchain.ts              # TanStack Query wrappers for offchain APIs
│   │   └── useRbac.ts                  # Derive UI permissions from platformContext
│   │
│   ├── layouts/
│   │   ├── AuthLayout.tsx              # Unauthenticated pages (login only)
│   │   ├── AppShell.tsx                # Main 3-panel shell: topbar + left nav + center + right
│   │   ├── DefinitionsLayout.tsx       # Definitions hub layout (no workspace context)
│   │   └── WorkspaceLayout.tsx         # Workspace context; workspace switcher in topbar
│   │
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── PostLogin.tsx               # Two-path: Workspaces + Definitions
│   │   │
│   │   ├── definitions/
│   │   │   ├── DefinitionsHub.tsx      # Left nav: Onchain SM, Onchain Schema, Offchain SM, Offchain Schema, SuperApps, RBAC
│   │   │   ├── OnchainSM/
│   │   │   │   ├── OnchainSMList.tsx
│   │   │   │   ├── OnchainSMDetail.tsx
│   │   │   │   └── OnchainSMForm.tsx   # Create/Edit — calls ParamGateway full integration
│   │   │   ├── OnchainSchema/
│   │   │   │   ├── OnchainSchemaList.tsx
│   │   │   │   ├── OnchainSchemaDetail.tsx
│   │   │   │   └── OnchainSchemaForm.tsx
│   │   │   ├── OffchainSM/
│   │   │   │   └── ... (same pattern)
│   │   │   ├── OffchainSchema/
│   │   │   │   └── ... (same pattern)
│   │   │   ├── SuperAppDefs/
│   │   │   │   ├── SuperAppDefList.tsx
│   │   │   │   ├── SuperAppDefDetail.tsx
│   │   │   │   └── SuperAppDefForm.tsx  # Create/Edit — calls Wallet Backend
│   │   │   └── TeamRbacMatrix/
│   │   │       ├── RbacMatrixList.tsx
│   │   │       ├── RbacMatrixDetail.tsx
│   │   │       └── RbacMatrixForm.tsx   # Editable grid — calls Wallet Backend
│   │   │
│   │   ├── workspace/
│   │   │   ├── WorkspaceCreate.tsx
│   │   │   ├── SuperAppList.tsx         # Lists installed SuperApps with KPI strip
│   │   │   ├── SuperAppInstall.tsx      # Pick from definitions; call /superapp/install
│   │   │   ├── documents/
│   │   │   │   ├── DocumentList.tsx     # Center panel; state tabs + substate tab bar
│   │   │   │   ├── DocumentDetail.tsx   # Right panel; actions list
│   │   │   │   ├── DocumentCreate.tsx   # Schema-driven form; calls ParamGateway stub
│   │   │   │   └── DocumentChain.tsx    # Transaction history view
│   │   │   └── settings/
│   │   │       ├── Settings.tsx         # Left nav: Profile, Users, RBAC, Orgs, Plants, Master Data
│   │   │       ├── Profile.tsx
│   │   │       ├── Users.tsx
│   │   │       ├── RbacSettings.tsx
│   │   │       ├── Orgs.tsx
│   │   │       ├── Plants.tsx
│   │   │       └── MasterData.tsx
│   │   │
│   │   └── demo/
│   │       └── DemoRolePicker.tsx
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui generated components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── TopBar.tsx              # Brand + Definitions pill + workspace switcher + role badge
│   │   │   ├── WorkspaceSwitcher.tsx   # Popover with workspace list + create
│   │   │   ├── LeftNav.tsx             # Contextual nav: workspace or SuperApp document types
│   │   │   ├── RightPanel.tsx          # Detail inspector
│   │   │   └── KpiStrip.tsx
│   │   │
│   │   ├── documents/
│   │   │   ├── DocumentTable.tsx       # TanStack Table + TanStack Virtual; paginated
│   │   │   ├── SubstateTabBar.tsx      # Horizontal subtabs from SM definition substates
│   │   │   ├── ActionButtons.tsx       # Available/alternate/linked actions from GET /actions
│   │   │   └── DiffView.tsx            # Per-SKU quantity balance
│   │   │
│   │   ├── forms/
│   │   │   ├── SchemaForm.tsx          # Dynamic form from onchain_schema_definitions
│   │   │   ├── SchemaField.tsx         # Renders a single field by type (string, number, date, enum, array)
│   │   │   └── RbacMatrixGrid.tsx      # Editable RBAC matrix (Role.Team × State × RW/RO/N/A)
│   │   │
│   │   └── shared/
│   │       ├── AccessBadge.tsx         # RW / RO / N/A badge with color coding
│   │       ├── StateBadge.tsx          # State/substate badge
│   │       ├── PhaseBadge.tsx
│   │       ├── JsonViewer.tsx          # For definition JSON view
│   │       ├── EmptyState.tsx
│   │       └── LoadingSpinner.tsx
│   │
│   ├── lib/
│   │   ├── utils.ts                    # cn() helper, formatDate, truncate
│   │   ├── rbac.ts                     # UI RBAC helpers: canEdit, canCreate, isAdmin
│   │   └── schema.ts                   # Schema traversal helpers for SchemaForm
│   │
│   └── types/
│       ├── api.ts                      # All API request/response types
│       ├── definitions.ts              # SuperApp, SM, Schema, RbacMatrix types
│       ├── documents.ts                # SmDocument, ChainHead, TxnHistory types
│       ├── workspace.ts                # Workspace, Plant, InstalledSuperApp types
│       └── auth.ts                     # Session, User, AuthContext types
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Implementation Sequence

Build each phase independently. Each phase is demoable.

### Phase 1: Foundation & Auth (Days 1–2)

**Goal:** Login screen → authenticated shell → post-login screen.

1. **Project bootstrap**
   - `pnpm create vite wallet-frontend --template react-ts`
   - Install: Tailwind CSS, shadcn/ui init, React Router v6, Zustand, TanStack Query, Axios, React Hook Form, Zod, Lucide React
   - Configure Vite proxy: `/api` → `localhost:3001`, `/pg` → `localhost:4001`

2. **Axios client** (`api/client.ts`)
   - Base URL from `VITE_API_BASE_URL`
   - Request interceptor: inject `Authorization: Bearer`, `X-Param-ID`, `X-Workspace`, `X-SuperApp-ID`, `X-Portal` from stores
   - Response interceptor: on 401, attempt token refresh via `/auth/refresh`; on refresh failure, clear auth + redirect to login

3. **Auth store** (`store/auth.store.ts`)
   - `{ token, refreshToken, paramId, userId, email, isAuthenticated }`
   - `setAuth(authData)`, `clearAuth()`
   - Persisted to `localStorage` via Zustand persist middleware

4. **Auth API** (`api/auth.api.ts`)
   - `requestOtp(email)` → `POST /auth/otp/request`
   - `verifyOtp(email, otp)` → `POST /auth/otp/verify`
   - `ssoLogin(provider, code)` → `POST /auth/sso/:provider`
   - `refreshToken(refreshToken, paramId)` → `POST /auth/refresh`
   - `logout(token, paramId)` → `POST /auth/logout`

5. **Login page** (`pages/Login.tsx`)
   - Email input → Request OTP / Sign in with Google
   - OTP input (6 digits) → Verify
   - On success: store auth → navigate to `/post-login`
   - Minimal, centered layout (matches spec Section 03)

6. **Post-Login page** (`pages/PostLogin.tsx`)
   - `GET /profile` to get user + workspaces
   - Two cards: Workspaces (list + Create) + Definitions
   - Workspace card: list workspaces as clickable items → navigate to `/workspace/:subdomain`
   - Definitions card: → navigate to `/definitions`

7. **Protected route wrapper**
   - `<RequireAuth>` component: if not authenticated → redirect to `/login`
   - App router: `/login` (public), all others require auth

---

### Phase 2: App Shell & Navigation (Day 3)

**Goal:** Three-panel layout; workspace context; navigation works.

8. **App Shell** (`layouts/AppShell.tsx`)
   - Fixed 3-panel: left nav (220px) + center (flex-1) + right panel (260px)
   - Top bar: brand + Definitions pill + workspace switcher + role badge (single role always)
   - Dark mode toggle via `html.dark` class + Tailwind dark: variants

9. **Workspace store** (`store/workspace.store.ts`)
   - `{ activeWorkspace, workspaceList }`
   - `setActiveWorkspace(subdomain)`, `clearWorkspace()`

10. **SuperApp store** (`store/superapp.store.ts`)
    - `{ activeSuperApp, activeDocType }` (activeDocType = SM state name currently selected)
    - Set when user clicks a SuperApp or a document type in left nav

11. **Left Nav** (`components/layout/LeftNav.tsx`)
    - Two modes:
      - **Workspace mode**: SuperApps link; when SuperApp selected → shows SuperApp name section + document types (SM states from linkedSMs)
      - **Definitions mode**: Onchain SM, Onchain Schema, Offchain SM, Offchain Schema, SuperApps, Team RBAC
    - Navigation rules: "SuperApps" nav item always goes back to SuperApp list; switching workspace collapses nav

12. **Workspace Switcher** (`components/layout/WorkspaceSwitcher.tsx`)
    - Popover with list of workspaces from `param_saas.subdomain_users`
    - "+ Create Workspace" at bottom → navigates to `/workspace/create`
    - On workspace select: update store → navigate to `/workspace/:subdomain`

---

### Phase 3: Definitions Hub (Days 4–5)

**Goal:** All six definition types: Create, View, Edit.

**Backend calls:** All Wallet Backend for reads and writes. Onchain/offchain SM and Schema deploys use ParamGateway full integration (execute → poll until synced).

13. **Definitions API** (`api/definitions.api.ts`)
    - `getSuperapps()`, `getSuperapp(id)`, `createSuperapp(body)`, `updateSuperapp(id, body)`
    - `getSMs()`, `getSM(smId)`, `getSMStates(smId)`
    - `getSchemas()`, `getSchema(schemaId)`
    - `getOffchainSMs()`, `getOffchainSM(id)`
    - `getOffchainSchemas()`, `getOffchainSchema(id)`
    - `getRbacMatrix(superAppId)`, `getRbacMatrixForSM(superAppId, smId)`
    - `createRbacMatrix(body)`, `updateRbacMatrix(superAppId, smId, body)`

14. **ParamGateway integration** (`api/paramgateway/`)

    **Definitions — full integration** (execute pipeline → poll task status until synced):
    - `definitions/onchainSm.ts` — `deployOnchainSM(payload)` → `pipe:sys:define-sm-v1`
    - `definitions/onchainSchema.ts` — `deployOnchainSchema(payload)` → `pipe:sys:define-schema-v1`
    - `definitions/offchainSm.ts` — `deployOffchainSM(payload)` → `pipe:sys:define-offchain-sm-v1`
    - `definitions/offchainSchema.ts` — `deployOffchainSchema(payload)` → `pipe:sys:define-offchain-schema-v1`

    Flow: `POST /api/pipelines/{pipelineId}/execute?dryRun=false` → receive `batchIds` → poll `GET /api/batches/{batchId}/tasks` every 2–3s until all tasks `status: "synced"`. Required headers: `X-Gateway-Role`, `X-Workspace`.

    **Document operations — stubs** (return `{ success: true }`; API not yet provided):
    - `stubs/documentCreate.ts` — `createDocument(pipelineId, payload)`
    - `stubs/documentTransition.ts` — `transitionDocument(pipelineId, payload)`

15. **Definitions Hub Layout** (`layouts/DefinitionsLayout.tsx`)
    - No workspace context; no workspace switcher
    - Top bar shows "Definitions" context + "Param Admin" role badge
    - Left nav: fixed definition type list

16. **Three-panel Definitions pattern** (reused for each type):
    - Left nav: active type highlighted with count
    - Center: toolbar (+ Create button + search) + table list
    - Right: detail inspector (selected item metadata + View JSON + Edit actions)

17. **OnchainSMList/Detail/Form** (`pages/definitions/OnchainSM/`)
    - List: SM ID, Name, Type (@sm/Commerce etc.), States count
    - Detail (right panel): SM ID, Roles, Start State, View JSON, Edit, "Use in SuperApp"
    - Create/Edit form → calls `deployOnchainSM(payload)` (ParamGateway full integration) → poll until synced → show success toast
    - Read from `GET /definitions/sm`

18. **OnchainSchema, OffchainSM, OffchainSchema** — same three-panel pattern; each Create/Edit form calls the corresponding ParamGateway definition function (full integration: execute → poll until synced)

19. **SuperApp Definition Form** (`pages/definitions/SuperAppDefs/SuperAppDefForm.tsx`)
    - Name, Description, Version, Sponsor Role (select from roles array)
    - Linked SMs: multi-select from `GET /definitions/sm` results
    - Roles & Teams: dynamic role builder (add role → add teams per role)
    - Submit → `POST /definitions/superapps` (Wallet Backend) → toast + refresh list

20. **Team RBAC Matrix Form** (`components/forms/RbacMatrixGrid.tsx`)
    - Selected SM → load SM states/substates/microstates from `GET /definitions/sm/:smId/states`
    - Auto-generate matrix rows: one row per `{state, subState, microState}` combination (substate rows indented with ↳)
    - Auto-generate columns: one column per `Role.Team` from SuperApp definition
    - Each cell: dropdown `RW | RO | N/A` with color coding (green/blue/red)
    - Submit → `POST /definitions/team-rbac-matrix` (Wallet Backend)
    - Edit → `PUT /definitions/team-rbac-matrix/:superAppId/:smId`
    - Show warning: "Required before install" — Install button on SuperApp def is disabled until all linked SM matrices exist

---

### Phase 4: Workspace & SuperApp Install (Day 6)

**Goal:** Create workspace; install SuperApps.

21. **Workspace Create Form** (`pages/workspace/WorkspaceCreate.tsx`)
    - Subdomain input (validated: alphanumeric + hyphen)
    - Workspace Name
    - Exchange Param ID (text input)
    - Submit → `POST /workspace/create` → navigate to new workspace

22. **SuperApp List** (`pages/workspace/SuperAppList.tsx`)
    - KPI strip: SuperApps count, Documents count, Synced count, Active States count
    - Table: SuperApp name, SM, Document Types, Documents count, Status badge
    - Click row → select SuperApp in store → sidebar updates to show document types
    - Right panel: selected SuperApp details + "Open App" button + "🎭 Demo" button
    - "+ Install SuperApp" button → opens install dialog

23. **SuperApp Install** (`pages/workspace/SuperAppInstall.tsx`)
    - Fetch `GET /definitions/superapps` → list available definitions
    - Each card: name, linked SMs, sponsor role
    - Check: all linked SM matrices must exist (`GET /definitions/team-rbac-matrix/:superAppId`) — disable Install if missing
    - Install → `POST /superapp/install { superAppId }` → navigate to new SuperApp

---

### Phase 5: Document Testing (Days 7–9)

**Goal:** Full document list, detail, create, transition flow.

This is the most complex phase — RBAC-filtered views, schema-driven forms, substate tab bar, action buttons.

24. **Document API** (`api/documents.api.ts`)
    - `getDocuments(params)` — supports all query params: superAppId, smId, state, subState, phase, from, to, plant, partner_id, search, page, limit, include_actions, include_diff, filter[*]
    - `getDocument(docId)` → `GET /documents/:docId`
    - `getDocumentActions(docId)` → `GET /documents/:docId/actions`
    - `getDocumentDiff(docId)` → `GET /documents/:docId/diff`
    - `getDocumentChain(docId)` → `GET /documents/:docId/chain`

25. **Document List** (`pages/workspace/documents/DocumentList.tsx`)

    **Substate tab bar:**
    - Load SM definition via `GET /definitions/sm/:smId` (cached)
    - Extract substates for the active state
    - Render horizontal tab bar: "All" first, then each substate name
    - Active tab adds `subState=<name>` to `GET /documents` query params
    - If state has no substates → no tab bar rendered

    **Document table:**
    - TanStack Table + TanStack Virtual for virtualized rows
    - Server-side pagination: TanStack Query with `keepPreviousData: true` during page change
    - Columns: schema-driven from the SM's primary schema fields (`order: 1, 2, 3` fields from the state schema)
    - Click row → select document → update right panel
    - Search input: 300ms debounce → updates `search` query param
    - `+ Create <DocType>` button (shown only if user has `RW` access on start state)

    **Performance:**
    ```typescript
    // TanStack Query document list
    const { data, isFetching } = useQuery({
      queryKey: ['documents', workspace, superAppId, smId, state, subState, page, search, filters],
      queryFn: () => getDocuments({ superAppId, smId, state, subState, page, limit: 25, search }),
      staleTime: 30_000,         // 30s before background refetch
      placeholderData: keepPreviousData,   // no flicker on page change
    });
    ```

26. **Document Detail** (right panel) (`pages/workspace/documents/DocumentDetail.tsx`)
    - Selected document metadata: state + substate badge, participants, key fields from schema
    - Available Actions section: buttons from `GET /documents/:docId/actions`
    - `availableActions` → primary action buttons
    - `alternateNextActions` → secondary (outline) buttons
    - `linkedSmActions` → "Create <SM name>" buttons
    - `canCreate: false` → button disabled with tooltip showing `diffReason`
    - Action button click → opens transition modal → calls `transitionDocument()` ParamGateway stub → toast success → invalidate document list query

27. **Schema-Driven Form** (`components/forms/SchemaForm.tsx`)

    Rendered from `onchain_schema_definitions.properties` in order:

    ```typescript
    // Render groups in order (using group-level order for arrays, alphabetical for others)
    // Within each group, render fields by order: 1, 2, 3, ...
    // Skip fields with hidden: true
    // For contact groups: show only non-hidden fields; C_InternalID always hidden
    // For array groups: render repeating row set (+ Add Row button)
    // Field types: string → Input, number → Input[type=number], date → DatePicker, enum → Select
    ```

    Contact field groups (Seller, Buyer, etc.): render as collapsible section with party name as header. Party dropdown pre-populated from `GET /offchain/registry/` or `GET /superapp/:id/orgs/:role` as appropriate.

28. **Document Create** (`pages/workspace/documents/DocumentCreate.tsx`)
    - Open as a full-page form or slide-over panel
    - Load schema from `GET /definitions/schemas/:schemaId` (schema ID from SM state definition)
    - Render `<SchemaForm>` with schema
    - Populate `_chain` fields: `smId`, `roles` (from SuperApp orgs), `stateTo` (start state + start subState)
    - On submit → `createDocument(pipelineId, payload)` ParamGateway stub → toast → close → refresh list

29. **Document Chain View** (`pages/workspace/documents/DocumentChain.tsx`)
    - Timeline of transactions from `GET /documents/:docId/chain`
    - Each entry: sequence number, stateTo, timestamp, actor, changeType badge

---

### Phase 6: Settings (Days 10–11)

**Goal:** Full settings section: Profile, Users, RBAC, Orgs, Plants, Master Data.

30. **Settings Layout** (`pages/workspace/settings/Settings.tsx`)
    - Left nav tabs: Profile, Users, RBAC, Orgs, Plants, Master Data
    - All scoped to active workspace; Users/RBAC/Orgs also scoped to active SuperApp

31. **Profile** (`pages/workspace/settings/Profile.tsx`)
    - Display name (editable via `PUT /user/profile`)
    - Email (read-only)
    - Org name + Role (from `GET /profile` with workspace + superApp context)

32. **Users** (`pages/workspace/settings/Users.tsx`)
    - Table: all users from `GET /superapp/:id/roles/:role/users` (one tab per role)
    - Add user: email + name + plant-team matrix form → `POST /superapp/:id/roles/:role/users`
    - Edit: update plantTeams/status → `PUT /superapp/:id/users/:userId`
    - Suspend: `DELETE /superapp/:id/users/:userId` (sets status: suspended)

33. **RBAC Settings** (`pages/workspace/settings/RbacSettings.tsx`)
    - Shows workspace-installed copy of team_rbac_matrix (editable post-install)
    - Same `<RbacMatrixGrid>` component as definitions
    - Save → `PUT /superapp/:id/team-rbac-matrix/:smId` (workspace copy only; does not affect param_definitions)

34. **Orgs** (`pages/workspace/settings/Orgs.tsx`)
    - List organizations by role (`GET /superapp/:id/orgs`)
    - Partner org: Onboard form → `POST /superapp/:id/partners/onboard`
      - Before submit: call `POST /auth/domain/register { email, subdomain }` to register partner in ENN → store paramId + pennId in form hidden fields → include in Contact.C_Identifier / Contact.C_PenID
    - Suspend org: `PUT /superapp/:id/orgs/:role/:paramId/status { status: "suspended" }`

35. **Plants** (`pages/workspace/settings/Plants.tsx`)
    - List plants from `GET /workspace/plants`
    - Add plant: code, name, location → `POST /workspace/plants`
    - Edit/Deactivate: `PUT /workspace/plants/:code` / `DELETE /workspace/plants/:code`

36. **Master Data** (`pages/workspace/settings/MasterData.tsx`)
    - List offchain registry and config collections from `GET /offchain/definitions`
    - Select a collection → show data table from `GET /offchain/registry/:collectionName` or `GET /offchain/config/:collectionName`

---

### Phase 7: Demo Mode (Day 12)

**Goal:** Role impersonation for testing UX without separate login.

37. **Demo Store** (`store/demo.store.ts`)
    - `{ isDemoMode, demoRole }` — when active, all RBAC-filtered UI components use `demoRole` instead of real role

38. **Demo Role Picker** (`pages/demo/DemoRolePicker.tsx`)
    - Opens as dialog from "🎭 Demo" button in right panel or top bar
    - Lists roles from active SuperApp (`installed_superapps.roles`)
    - Select role → set `isDemoMode = true`, `demoRole = selectedRole` in store
    - Top bar role badge changes to: `🎭 <RoleName>` (never shows real role simultaneously)
    - All document list queries re-run with new role context (query key changes → TanStack Query refetches)
    - "End Demo" button → clears demo store → UI returns to real role

39. **RBAC-filtered UI rule:**
    ```typescript
    // In useRbac.ts
    const effectiveRole = isDemoMode ? demoRole : platformContext.role;
    const canEdit = resolveTeamAccess(rbacMatrix, effectiveRole, currentTeams, state, subState, null) === "RW";
    const canCreate = /* check start state owner includes effectiveRole */;
    ```

---

### Phase 8: Performance & Polish (Day 13–14)

**Goal:** Handles 100k+ records smoothly; polished UX.

40. **Code splitting** — all major routes lazy-loaded:
    ```typescript
    const Definitions = lazy(() => import('./pages/definitions/DefinitionsHub'));
    const DocumentList = lazy(() => import('./pages/workspace/documents/DocumentList'));
    const Settings = lazy(() => import('./pages/workspace/settings/Settings'));
    ```

41. **TanStack Virtual for large tables:**
    ```typescript
    const rowVirtualizer = useVirtualizer({
      count: documents.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 48,      // row height in px
      overscan: 5,                 // render 5 extra rows outside viewport
    });
    ```
    Only visible rows + 5 overscan are in the DOM — handles 100k+ records without performance degradation.

42. **Infinite scroll (alternative to pagination):**
    - For very large lists, use TanStack Query `useInfiniteQuery` with cursor-based pagination
    - `getNextPageParam: (lastPage) => lastPage.nextCursor` (pass last document's timestamp + _id)
    - Load next page when scroll reaches 80% of container height

43. **Search debounce:**
    ```typescript
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebouncedValue(searchInput, 300);
    // debouncedSearch used in query key → API call fires 300ms after user stops typing
    ```

44. **Dark mode:** Tailwind `darkMode: 'class'` — toggle `html.dark` class via theme FAB button (matches frontend spec). CSS variables in `:root` and `html.dark` cover all color values.

45. **Error boundaries:** Wrap each major panel in a React error boundary to prevent full-page crashes.

46. **Empty states:** Custom `<EmptyState>` with contextual message for: no documents, no SuperApps installed, no definitions yet.

---

## 4. Wallet Backend API Integration

Summary of which Wallet Backend endpoints each frontend section calls:

| Screen | Endpoints Used |
|---|---|
| Login | `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/sso/:provider` |
| Post-Login | `GET /profile`, `GET /workspace/list` |
| Definitions Hub | `GET /definitions/sm`, `GET /definitions/schemas`, `GET /definitions/offchain-sm`, `GET /definitions/offchain-schemas`, `GET /definitions/superapps`, `GET /definitions/team-rbac-matrix/:superAppId` |
| Create SuperApp Def | `POST /definitions/superapps`, `PUT /definitions/superapps/:id` |
| Create RBAC Matrix | `POST /definitions/team-rbac-matrix`, `PUT /definitions/team-rbac-matrix/:id/:smId`, `GET /definitions/sm/:smId/states` |
| Create Workspace | `POST /workspace/create` |
| SuperApp List | `GET /superapp`, `GET /workspace` |
| Install SuperApp | `GET /definitions/superapps`, `GET /definitions/team-rbac-matrix/:superAppId`, `POST /superapp/install` |
| Document List | `GET /documents` (paginated, with state/subState/search/filter params), `GET /definitions/sm/:smId` (for substate tabs) |
| Document Detail | `GET /documents/:docId`, `GET /documents/:docId/actions` |
| Document Create | `GET /definitions/schemas/:schemaId`, `GET /superapp/:id/orgs/:role` |
| Document Chain | `GET /documents/:docId/chain` |
| Document Diff | `GET /documents/:docId/diff` |
| Offchain Data | `GET /offchain/definitions`, `GET /offchain/registry/:name`, `GET /offchain/config/:name` |
| Settings → Profile | `GET /profile`, `PUT /user/profile` |
| Settings → Users | `GET /superapp/:id/roles/:role/users`, `POST /superapp/:id/roles/:role/users`, `PUT /superapp/:id/users/:userId`, `DELETE /superapp/:id/users/:userId` |
| Settings → RBAC | `GET /superapp/:id/team-rbac-matrix`, `PUT /superapp/:id/team-rbac-matrix/:smId` |
| Settings → Orgs | `GET /superapp/:id/orgs`, `POST /superapp/:id/partners/onboard`, `PUT /superapp/:id/orgs/:role/:paramId/status`, `POST /auth/domain/register` |
| Settings → Plants | `GET /workspace/plants`, `POST /workspace/plants`, `PUT /workspace/plants/:code`, `DELETE /workspace/plants/:code` |

---

## 5. ParamGateway Integration

### 5.1 Full Integration — Definitions

| Operation | Function | Pipeline ID | Flow |
|---|---|---|---|
| Deploy onchain SM | `deployOnchainSM(payload)` | `pipe:sys:define-sm-v1` | Execute → poll until synced |
| Deploy onchain Schema | `deployOnchainSchema(payload)` | `pipe:sys:define-schema-v1` | Same |
| Deploy offchain SM | `deployOffchainSM(payload)` | `pipe:sys:define-offchain-sm-v1` | Same |
| Deploy offchain Schema | `deployOffchainSchema(payload)` | `pipe:sys:define-offchain-schema-v1` | Same |

**Required headers:** `X-Gateway-Role`, `X-Workspace`, `Content-Type: application/json`  
**Env var:** `VITE_PARAMGATEWAY_BASE_URL`  
**Polling:** 2–3s interval; timeout ~60s; complete when all tasks `status: "synced"`.

### 5.2 Stubs — Document Operations

| Operation | Stub Function | Triggered By |
|---|---|---|
| Create document | `createDocument(pipelineId, payload)` | Document Testing → Create → submit |
| Transition document | `transitionDocument(pipelineId, payload)` | Document Testing → Action button |
| Offchain registry/config | (stub) | Master Data → create/update |

Each stub returns `{ success: true }`. Replace with real integration when ParamGateway APIs are documented.

### 5.3 On Success

- Definitions: invalidate definitions query → TanStack Query refetches → Wallet Backend serves new definition from MongoDB
- Document create/transition: invalidate document list query → UI updates

---

## 6. UI/UX Implementation Notes

### Three-Panel Layout Rules

```
┌─────────────────────────────────────────────────────────────────┐
│ TOP BAR: ⬡ Wallet Console · [SuperApp breadcrumb] | ◇Definitions | [workspace▾] | [role▾] | ⚙ |
├──────────────┬──────────────────────────────┬───────────────────┤
│ LEFT NAV     │ CENTER (main content)         │ RIGHT PANEL       │
│ 220px fixed  │ flex-1, scrollable            │ 260px fixed       │
│              │                               │ Detail inspector  │
│ Context-     │ Toolbar + table               │ Metadata +        │
│ sensitive    │ Substate tabs (when in docs)  │ Action buttons    │
│              │ + Virtual table               │                   │
└──────────────┴──────────────────────────────┴───────────────────┘
```

- Left nav is **never** an accordion or nested menu — flat items with section headers
- Center panel always has a toolbar (search + primary action button)
- Right panel updates on row click — never navigates to a new page for detail view (except for full document forms)
- Document transitions open as a slide-over or modal — not a new page

### RBAC-Filtered UI Rules

```typescript
// Components check access before rendering actions
const { access } = document;  // "RW" | "RO" from API response

// Show create button only if user has RW on the start state
const canCreate = startStateOwner.includes(effectiveRole) && startStateTeamAccess === "RW";

// Show action button only if canCreate: true from GET /actions
<Button disabled={!action.canCreate} title={action.canCreate ? undefined : action.diffReason}>
  {action.label}
</Button>

// Read-only form fields when access === "RO"
<SchemaForm readOnly={access === "RO"} />

// Hidden document: API never returns N/A documents — if a document appears, user can see it
```

### Schema-Driven Form Rules

1. Load `onchain_schema_definitions` by `schemaId` from the SM state definition
2. Render groups in declaration order (for arrays: use `order` on the group; for objects/contacts: render in property declaration order)
3. Within each group: render fields in ascending `order` value (1, 2, 3...)
4. Skip fields with `hidden: true` — never render them (C_InternalID, C_TaxID etc.)
5. Array groups: render `+ Add Row` button; each row has all non-hidden item fields
6. Contact groups: render as a section with the group key (e.g. "Seller", "Buyer") as section label
7. Field type → input component mapping:
   - `string` → `<Input type="text">`
   - `number` → `<Input type="number">`
   - `date` → `<DatePicker>`
   - `string` with `enum` → `<Select>` with enum values as options
   - `boolean` → `<Switch>`

### Substate Tab Bar Rules

1. Tabs derived from `GET /definitions/sm/:smId` states → selected state → substates array
2. "All" tab always first; renders all documents regardless of substate
3. If state has no substates: no tab bar rendered
4. Active tab underlined with accent color; inactive tabs in muted color
5. Many substates (9+): tab bar scrolls horizontally with `overflow-x: auto`; no wrapping

### Top Bar Role Badge Rules

- **Normal session**: show user's real role from `platformContext.role` (e.g. `Admin ▾`)
  - `▾` opens role-switcher popover if user has multiple roles in the current SuperApp
- **Demo mode active**: show demo role with 🎭 prefix (e.g. `🎭 Buyer`)
- **Never both simultaneously** — exactly one badge always

---

## 7. Performance Optimizations

### Frontend

| Optimization | Implementation |
|---|---|
| Route-based code splitting | `React.lazy()` + `<Suspense>` for each major route |
| Document table virtualization | `TanStack Virtual` — only visible rows in DOM |
| Server-side pagination | `useInfiniteQuery` or `useQuery` with `page` param; default limit 25 |
| Debounced search | `useDebouncedValue(search, 300)` before query key updates |
| SM definition caching | TanStack Query `staleTime: 300_000` (5 min) for definitions |
| Document list caching | `staleTime: 30_000` (30s); `keepPreviousData: true` on page change |
| Selective refetch | `queryClient.invalidateQueries(['documents'])` only after write operations |
| Optimistic updates | Enabled for: RBAC matrix edits, user preference changes (safe to rollback) |
| Optimistic updates | Disabled for: document transitions (blockchain latency = unpredictable) |

### API Layer

| Optimization | Implementation |
|---|---|
| Auth header injection | Axios interceptor (not per-request) |
| Token refresh | Single refresh request even if multiple concurrent 401s (via in-flight promise dedup) |
| Request dedup | TanStack Query deduplicates concurrent identical queries automatically |
| Schema prefetch | On SuperApp select: prefetch all linked SM schemas into query cache |

---

## 8. Testing Strategy

### Component Tests (Vitest + React Testing Library)

- `SchemaForm.test.tsx` — renders correct fields for each schema type; hidden fields not rendered; array groups add/remove rows
- `RbacMatrixGrid.test.tsx` — correct rows generated from SM states; cell values update; save fires correct payload
- `DocumentTable.test.tsx` — pagination controls; search debounce; row click selects document
- `SubstateTabBar.test.tsx` — tabs generated from SM definition; "All" always first; click updates query params
- `ActionButtons.test.tsx` — disabled when `canCreate: false`; correct labels from actions response
- `TopBar.test.tsx` — single role badge; demo mode badge format; workspace switcher opens

### Integration Tests (React + MSW — Mock Service Worker)

- Full login flow: enter email → mock OTP request → enter OTP → mock verify → navigate to post-login
- Workspace create: fill form → mock API → verify navigation to workspace
- Document list: mock documents API → verify virtualized rows rendered → click row → right panel updates
- Demo mode: activate demo → verify role badge changes → deactivate → verify resets

### E2E (optional, Playwright)

- Login → workspace → superapp → document list → create document (stub returns success) → verify toast
- RBAC: login as RO team → verify no action buttons visible

### Coverage Targets

- `api/paramgateway/definitions/*`: 100% (execute + poll flow); `api/paramgateway/stubs/*`: 100% (return `{ success: true }`)
- `lib/rbac.ts`: 100%
- `components/forms/SchemaForm.tsx`: 90%+ (critical rendering logic)
- All API wrappers: happy path + network error handling
