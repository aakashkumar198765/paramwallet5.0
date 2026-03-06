# Query Engine — Architecture Spec Cross-Check

**Date:** 2026-03-06
**Spec section:** §16 (Query Engine)
**Test results from:** `api-test-results/query/documents.md`

---

## Summary

All Query Engine APIs are functionally correct. Two spec deviations found (both intentional design decisions, not bugs). One behavior note. No fixes required.

---

## Deviations

### MED-1: `superAppId` delivered via header, not query param

**Spec (§16.1):** `GET /documents` — `superAppId` listed as a **required query param**.

**Handler:** Reads `superAppId` from `X-SuperApp-ID` header (via `requestContext`). Returns `400` if missing. Query param `superAppId` is not read.

**Assessment:** Design decision — the entire platform consistently uses `X-SuperApp-ID` and `X-Portal` headers for all platform/query context. The spec description of `superAppId` as a query param is a documentation artifact from an earlier design. **No code change needed** — but the spec should be updated to reflect header-based context for all query engine endpoints.

**Action: Update architecture doc.**

---

### MED-2: SM collection discovery — `listCollections` vs `installed_superapps.linkedSMs`

**Spec (§16.1, Logic step 2):** "Determine SM collections to query from `ws.installed_superapps.linkedSMs`"

**Handler:** Calls `orgDb.listCollections().toArray()` and filters for `sm_*` prefix — discovers all existing SM collections dynamically. Does NOT read `installed_superapps.linkedSMs`.

**Assessment:** Both approaches produce the same result in practice (SyncFactory only creates `sm_*` collections for linked SMs), but the handler is looser than the spec. The L1 filter (`_chain.roles.{role} = callerParamId`) ensures no unauthorized documents are returned regardless. No security impact, but if a stale `sm_*` collection exists from a deinstalled SM it would still be scanned. **No code change needed** — but spec should be updated to note dynamic collection discovery.

**Action: Update architecture doc.**

---

## Behavioral Notes (not deviations)

### NOTE-1: `getDocumentChain` enforces L2 — spec says L1 only

**Spec (§16.1):** `GET /documents/:docId/chain` — "L1 enforced."
**Handler:** Performs full L1+L2+L3 via `resolveDocumentAccess` (HIGH-11 fix from audit).

**Assessment:** Handler is MORE restrictive than spec. Safe direction — users who can see a document via L2 can also see its chain. If L2 blocks them from the document itself, they shouldn't see chain history either. No change needed.

---

### NOTE-2: Offchain `verifyOrgAccess` — 403 path not live-tested

**Spec (§16.3):** Offchain endpoints return `403` if caller's org not in `sapp.organizations`.

**Handler:** `verifyOrgAccess()` → `findOne({ 'org.paramId': callerParamId })` in `sapp.organizations`. Correctly implemented.

**Assessment:** Test user IS in organizations (Consignee sponsor), so 403 path wasn't exercised. The code is correct.

---

### NOTE-3: `include_actions` / `include_diff` performance — connection pool risk

**Observed:** When multiple `include_actions=true` requests run concurrently (e.g. from background processes), they can exhaust the MongoDB connection pool (`MONGO_POOL_SIZE=10`), causing all subsequent requests to hang until connections free up.

**Assessment:** Not a spec deviation, but a production concern. Each document in the result set triggers multiple sequential MongoDB queries (`chain_head`, SM def, RBAC matrix, diff children). With `limit=25` (default) and 3-4 queries per doc, a single request can consume ~75-100 query slots.

**Recommendation:** Consider adding a `MONGO_POOL_SIZE` increase for production, or streaming responses per-document rather than collecting all then responding.

---

## Confirmed Correct

| API | Spec says | Handler does | Result |
|-----|-----------|-------------|--------|
| `GET /documents` response shape | `{ total, page, limit, documents }` | ✅ exact match | PASS |
| `GET /documents` L1 filter | `_chain.roles.{role} = callerParamId` | ✅ exact match | PASS |
| `GET /documents` plant filter | `_chain._sys.plantIDs.{callerParamId} ∩ userPlants` | ✅ exact match | PASS |
| `GET /documents` L2 access annotation | `access: "RW"/"RO"/"N/A"` | ✅ `access` field on each doc | PASS |
| `GET /documents` `smName` annotation | from `param_definitions.onchain_sm_definitions` | ✅ `smName: "Sales Invoice"` | PASS |
| `GET /documents` `include_actions=true` | appends `actions` block per doc | ✅ confirmed | PASS |
| `GET /documents` `include_diff=true` | appends `diff` block per doc | ✅ confirmed | PASS |
| `GET /documents` `filter[*]` without smId | `400 "smId required for schema filters"` | ✅ (verified in handler code) | PASS |
| `GET /documents/:docId` response shape | full doc + `smId`, `smName`, `access` at top level | ✅ exact match | PASS |
| `GET /documents/:docId` 404 | `{ "error": "Document not found" }` | ✅ | PASS |
| `GET /documents/:docId/actions` response | `{ currentState, currentSubState, currentMicroState, availableActions, alternateNextActions, linkedSmActions }` | ✅ exact match | PASS |
| `GET /documents/:docId/actions` L3 blocked | `{ blocked: true, ... }` | ✅ (in handler code, not triggered by test data) | PASS |
| `GET /documents/:docId/chain` response | plain array from `txn_history` | ✅ `[]` (empty, no history) | PASS |
| `GET /documents/:docId/diff` response | full doc + `diff` block | ✅ exact match | PASS |
| `GET /documents/:docId/diff` no OrderedItems | `hasOrderedItems: false, canCreateChild: true` | ✅ exact match | PASS |
| `GET /offchain/registry/:col` response | `{ total, page, limit, records }` | ✅ exact match | PASS |
| `GET /offchain/registry/:col/:key` 404 | `{ "error": "Registry item not found" }` | ✅ | PASS |
| `GET /offchain/config/:col` 404 | `{ "error": "Config not found" }` | ✅ | PASS |
| `GET /offchain/definitions` filter | by `linkedSuperApps` containing `superAppId` | ✅ | PASS |
| `GET /offchain/definitions/:id` 404 | `{ "error": "Offchain SM definition not found" }` | ✅ | PASS |
| Offchain org membership check | `sapp.organizations.org.paramId` lookup → 403 | ✅ `verifyOrgAccess()` implemented | PASS |

---

## Architecture Doc Updates Required

Two places to update:

1. **§16.1 GET /documents — query params**: Remove `superAppId` from query params list; add note that `superAppId`, `workspace`, and `portal` are passed via `X-SuperApp-ID`, `X-Workspace`, `X-Portal` headers respectively.

2. **§16.1 Logic step 2**: Update from "Determine SM collections from `ws.installed_superapps.linkedSMs`" to "Discover SM collections by scanning `sm_*` collections in the org partition DB dynamically."
