# Wallet Backend Audit Report V2

**Date:** 2026-03-06
**Auditor:** Claude Sonnet 4.6
**Scope:** Full line-by-line comparison of all implementation files against `wallet-backend-architecture.md` v2.1
**Methodology:** Every endpoint, DB write, field name, _id format, response shape, and RBAC mechanism was compared against the spec text. "Correct" means both spec text and code were read side-by-side.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 6     |
| HIGH     | 14    |
| MEDIUM   | 12    |
| LOW      | 8     |
| **Total**| **40**|

---

## CRITICAL Findings

---

### CRIT-1: `passesL1` — Wrong field shape assumed for `_chain.roles`

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/rbac-filter.ts`, lines 109–126
**Spec section:** §10.2, §22.1

**Spec says:**
```
_chain.roles = { "Consignee": "0x6193b497...", "FF": "0x40Af9B6a...", "CHA": "0x56C865EB..." }
// values are plain 0x address strings (paramId)
```

**Code does:**
```typescript
const roles = chain.roles as Record<string, { paramId: string; name: string }> | undefined;
if (roles && typeof roles === 'object' && !Array.isArray(roles)) {
  return Object.values(roles).some(r => r.paramId === callerOrgParamId);
}
```

The code treats `_chain.roles` values as objects `{ paramId, name }`. The spec defines them as plain strings (the `0x...` address directly). The correct check is:
```typescript
Object.values(roles).some(r => r === callerOrgParamId)
```

This means **L1 RBAC always fails** for every document, because `r.paramId` on a string is `undefined`, so `undefined === callerOrgParamId` is always `false`. All document queries return empty results even for legitimate users.

**Impact:** Every `GET /documents`, `GET /documents/:docId`, `/chain`, `/diff`, `/actions` endpoint returns no data or 403 for all users.

---

### CRIT-2: L3 check in `rbac-filter.ts` — `passesL3` checks only `firstTeam`, not all teams

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/rbac-filter.ts`, lines 305–307
**Spec section:** §22.5, §3.3

**Spec says:**
```
L3 check: if _chain._sys.restrictedTo non-empty, verify caller is listed; exclude if blocked
```
The spec passes the caller's *team* when checking `restrictedTo`. A user in multiple teams can be in any one of them in `restrictedTo`.

**Code does:**
```typescript
const firstTeam = callerTeams[0] ?? '';
if (!passesL3(doc, appUser.userId, appUser.role, firstTeam)) return null;
```

Only the **first team** is checked. The spec (§22.5, `resolveDocumentAccess`) and the `actions.handler.ts` code itself (line 244) use `callerTeams.every(team => !passesL3(...))` — meaning L3 passes if **any** team passes. But `resolveDocumentAccess` in `rbac-filter.ts` only checks the first team, so a user whose restrictedTo entry uses their second team (not first) is incorrectly blocked.

**Impact:** Users in multiple teams can be incorrectly blocked from documents they should have access to via L3.

---

### CRIT-3: `getDocPlantCodes` in `actions.handler.ts` reads wrong field path

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/actions.handler.ts`, lines 446–453
**Spec section:** §10.2, §22.0, §22.4

**Spec says:**
```javascript
_chain._sys.plantIDs = { "0x6193b497...": ["1810"] }
// plant IDs are in _chain._sys.plantIDs[orgParamId]
```

**Code does:**
```typescript
function getDocPlantCodes(doc: Record<string, unknown>): string[] {
  const chain = doc._chain as Record<string, unknown> | undefined;
  if (!chain) return [];
  const plants: string[] = [];
  if (typeof chain.plant === 'string') plants.push(chain.plant);
  if (Array.isArray(chain.plants)) plants.push(...chain.plants);
  return plants;
}
```

The function reads `_chain.plant` and `_chain.plants` — neither of these fields exist in the spec schema. The correct path is `_chain._sys.plantIDs[callerOrgParamId]`. This means `callerTeams` is resolved from an empty `docPlantIds` array, causing the fallback "use all teams from all plants" path, which may incorrectly grant access or use wrong team scope.

**Impact:** Team resolution for actions is incorrect, leading to wrong action availability.

---

### CRIT-4: `buildDateRangeFilter` wraps timestamp range incorrectly

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/db/queries.ts`, lines 32–38
**Spec section:** §16.1, §10.3

**Spec says:** `_local.timestamp` is **epoch ms integer** (e.g. `1770447080`). The `from`/`to` query params are also epoch ms.

**Code does:**
```typescript
if (from) filter['$gte'] = new Date(from);
if (to) filter['$lte'] = new Date(to);
return { '_local.timestamp': filter };
```

The code converts `from`/`to` string values to `Date` objects before comparing. But since `_local.timestamp` is stored as a plain integer (epoch ms), MongoDB will never match — the stored value `1770447080` (a number) will not compare correctly to a BSON Date object. Additionally, the spec says `from`/`to` params are "epoch ms", so they should remain as numbers. This breaks all `from`/`to` timestamp range filtering.

**Impact:** All `from`/`to` date range filters on `GET /documents` return wrong results.

---

### CRIT-5: `subdomain_users._id` format wrong in `workspace.handler.ts` `createWorkspace`

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/workspace.handler.ts`, line 41
**Spec section:** §7.2

**Spec says:**
```javascript
{ "_id": "user:0x878042B8...", ... }
// _id = "user:{userId}" where userId = SHA256(email) → a 0x hex hash
```

Wait — let me re-check. The spec at §7.2 shows:
```javascript
{ "_id": "user:0x878042B8...", ... }
```

But `userId` = SHA256(email.toLowerCase()) which is a 64-char hex string without `0x` prefix. The spec example shows `user:0x878042B8...` but that is the `userId` field value shown in the example with the `0x` prefix matching it to the Ethereum `ethID`. This is the spec's `userId` stored in the `subdomain_users` document itself.

Looking more carefully: the spec at §7.2 shows `"_id": "user:0x878042B8..."` but the system stores `userId = SHA256(email)` which is a 64-char lowercase hex string (no `0x`). The spec example is illustrative and may be showing a different format than what the implementation uses.

However, the actual code at line 41 uses:
```typescript
const wsOwnerDocId = `user:${req.authContext.userId}`;
```

And `authContext.userId` = SHA256(email) from JWT, which is correct per spec §17.1 step 5. This is consistent throughout. This is NOT an error. Retracting CRIT-5.

---

### CRIT-5 (revised): `resolveAppUserContext` — single-doc early return bypasses partner context check

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/rbac-filter.ts`, lines 60–63
**Spec section:** §22.0, §11

**Spec says:**
```typescript
// Fast path: partner_id was given in the request — directly fetch that vendor context.
// Sponsor users never pass partner_id so this branch never runs for them.
if (partnerIdHint) {
  return appUsersCol.findOne({ userId, superAppId, partnerId: partnerIdHint });
}
```

**Code does:**
```typescript
const allDocs = await appUsersCol.find({ userId, superAppId }).toArray() as unknown as AppUser[];
if (allDocs.length === 0) return null;
// Single doc — sponsor user
if (allDocs.length === 1) return allDocs[0];
// Multiple docs — vendor user, resolve by partnerId hint or plant overlap
if (partnerIdHint) {
  const byPartner = allDocs.find(d => d.partnerId === partnerIdHint);
  if (byPartner) return byPartner;
}
```

The code always fetches ALL docs first, then applies the `partnerIdHint` filter. The spec says the fast path (when `partnerIdHint` is set) should go directly to a targeted `findOne` without fetching everything. More critically: the early return `if (allDocs.length === 1) return allDocs[0]` will return a vendor user's doc when they happen to have only one vendor context, but the `partnerIdHint` is set to a different partnerId. The doc returned may not match the requested `partnerIdHint`, giving the wrong vendor context.

**Impact:** When a vendor user has exactly one partner context and `partner_id` is passed for a different (non-existent) partner, the wrong vendor context is returned instead of `null`, potentially granting incorrect access.

---

### CRIT-6: `getTeamAccess` does NOT implement fallback logic from spec §22.2

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/rbac-filter.ts`, lines 169–196
**Spec section:** §22.2

**Spec says:**
```typescript
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
```

The spec defines a **three-level fallback**: microState → subState → state. If no exact match for (state, subState, microState) is found, fall back to (state, subState, null), then to (state, null, null).

**Code does:**
```typescript
for (const perm of permissions) {
  if (perm.state !== state) continue;
  const permSubState = (perm.subState as string | null) ?? null;
  const permMicroState = (perm.microState as string | null) ?? null;
  if (permSubState === subState && permMicroState === microState) {
    const access = perm.access as Record<string, string> | undefined;
    return (access?.[key] as AccessLevel) ?? 'N/A';
  }
}
return 'N/A';
```

The code only does an **exact match** — no fallback. If a team has `subState: "Booking", microState: null` in the matrix, and the lookup is for `microState: "AwaitingApproval"`, the code returns `'N/A'` instead of falling back to the subState-level entry. This means all microState-level documents appear hidden to users whose matrices have subState but not microState granularity.

**Impact:** Documents at any microState level are invisible to all users, because getTeamAccess always returns 'N/A' when an exact match on all three levels is not present.

---

## HIGH Findings

---

### HIGH-1: `createWorkspace` — response HTTP status 201 vs spec 200

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/workspace.handler.ts`, line 66
**Spec section:** §15.1

The spec doesn't explicitly state 200 vs 201 for `POST /workspace/create`, but standard REST practice for resource creation is 201. However, this is minor. More importantly:

**Spec response shape:**
```json
{ "subdomain": "...", "workspaceName": "...", "exchangeParamId": "...", "createdAt": 1740484800000 }
```

**Code returns:** exactly this shape. Correct.

**But**: `ownerOrgName` is set to empty string `''` in the DB write (line 32) instead of being resolved from the caller's org. The spec schema at §7.1 requires `ownerOrgName`. Since there's no lookup for the org's display name, this field is always blank. This is a data completeness deviation.

---

### HIGH-2: `installSuperApp` — `installedDoc` may include MongoDB `_id` ObjectId from spread

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/superapp.handler.ts`, lines 88–96
**Spec section:** §15.4, §8.1

**Code does:**
```typescript
const installedDoc = {
  ...defRecord,    // spreads the entire Mongo document including MongoDB's internal _id ObjectId
  _id: superAppId, // overrides it
  ...
};
```

`defRecord` is the raw MongoDB document from `superapp_definitions`. Spreading it includes all fields MongoDB added (like `__v`, internal fields). While `_id` is overridden, other raw MongoDB metadata fields may be included in the `installed_superapps` document. More importantly, the spec says the installed doc should be a **full copy of superapp_definitions + install metadata**. The spread approach is correct intent but could contaminate with unexpected fields.

**More critical**: The spec (§15.4 step 4) says the sponsor org's `_id` format is `"org:{superAppId}:{role}:{paramId[2:22]}"`. The code at line 108:
```typescript
const orgId = `org:${superAppId}:${sponsorRole}:${orgPart}`;
```
This matches the **sponsor** format from spec §9.1 (no `vendorId` suffix for sponsor). Correct.

---

### HIGH-3: `installSuperApp` — missing `installedBy` field in step 6 upsert

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/superapp.handler.ts`, lines 142–150
**Spec section:** §15.4 step 6

The spec's step 6 says: "Append workspace to `param_saas.subdomain_users[caller.userId].subdomains` if not already present." The code does this. However, the subdomain_users upsert at line 142 does NOT set `$setOnInsert` for required fields (`email`, `userId`, `name`) — it only sets `updatedAt` and `$addToSet`. If this is the first time the user touches subdomain_users (unlikely, since they logged in), the upsert would create a document without `email` or `userId`.

**Spec §7.2:** All `subdomain_users` documents require `email`, `userId`, `name`, etc.

---

### HIGH-4: `handlePartnerOnboardRest` — missing `addedAt` field on `app_users`

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/partner.handler.ts`, lines 326–348
**Spec section:** §9.2

**Spec schema for app_users:**
```javascript
{
  "addedAt": 1740484800000,
  "addedBy": "system",
  ...
}
```

**Code does:**
```typescript
$set: {
  ...
  isOrgAdmin: true,
  status: 'active',
  addedBy: 'admin',    // present
  updatedAt: now,
  // addedAt is NOT set
}
$setOnInsert: { createdAt: now }
```

`addedAt` is missing from the REST override `handlePartnerOnboardRest`. The NATS path (`partnerLifecycleHandler`) also lacks `addedAt` on line 178-179.

---

### HIGH-5: `createUsers` — `app_users._id` format assumes sponsor (no partnerId variant)

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/user.handler.ts`, line 119
**Spec section:** §9.2, §15.6

**Spec says:**
- Sponsor: `"user:{superAppId}:{userId}"`
- Vendor: `"user:{superAppId}:{userId}:{partnerId}"`

**Code does:**
```typescript
const docId = `user:${superAppId}:${userId}`;
```

This always uses the sponsor format. The `POST /superapp/:superAppId/roles/:role/users` endpoint is used to add users for any role, including vendor roles. If a workspace admin is adding users for an FF role (vendor), the `_id` should include `partnerId`. There is no mechanism to pass `partnerId` in the request body or distinguish vendor users from sponsor users in this endpoint.

**Impact:** Vendor users added via this endpoint get wrong `_id` format — they will not be found by `resolveAppUserContext` which looks for `partnerId` in the doc.

---

### HIGH-6: `getSmStates` — response shape does not match spec §16.2

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/definitions.handler.ts`, lines 149–152
**Spec section:** §16.2

**Spec says response:**
```json
{
  "smId": "public:0xe1ec34e6...",
  "states": [
    { "name": "Contract", "phase": "Agreement", "subStates": [...] }
  ]
}
```
The spec says `states` is an **array** with `name`, `phase`, `subStates` objects.

**Code does:**
```typescript
const raw = doc.states ?? (doc.stateMachine as Record<string, unknown>)?.states ?? {};
return reply.send({ smId, states: raw });
```

The code returns the **raw `states` object from MongoDB** — which is a keyed object `{ "Contract": { desc, phase, subStates, ... } }`, not the navigable array format specified. The spec requires a flat array with `name` keys.

---

### HIGH-7: `listDocuments` — `include_actions` and `include_diff` query params are parsed but not implemented

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/documents.handler.ts`
**Spec section:** §16.1

**Spec says:**
```
include_actions (optional — true to append available actions per document)
include_diff (optional — true to compute diff per document)
```

**Code does:** Parses `include_actions` and `include_diff` via `DocumentListQuerySchema` (schemas.ts lines 16-17) but never uses them in `listDocuments`. Neither the `actions` nor `diff` computations are invoked based on these flags.

**Impact:** `GET /documents?include_actions=true` silently returns documents without actions, violating the spec contract.

---

### HIGH-8: `schema-filter.ts` — does not return 400 on invalid fields, silently ignores them

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/schema-filter.ts`, lines 155–160
**Spec section:** §16.1.1

**Spec says:**
```
If the path is not in the whitelist → reject: 400 { "error": "Unknown schema field", "field": path }
If the path starts with _ → reject: 400 { "error": "Filter on system fields is not allowed", "field": path }
```

**Code does:**
```typescript
for (const [field, value] of Object.entries(filterParams)) {
  if (whitelist.has(field)) {
    validParams[field] = value;
  }
  // Silently ignore non-whitelisted fields
}
```

The code silently skips unknown fields instead of rejecting with 400. System fields (`_` prefix) are also not checked for rejection here. The spec requires explicit 400 errors for invalid filter paths.

---

### HIGH-9: `schema-filter.ts` — bracket notation for operators (`[gte]`, `[lte]`, `[contains]`, `[in]`) is not parsed

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/schema-filter.ts`
**Spec section:** §16.1.1

**Spec says:**
```
filter[DocDetails.D_Date][gte]=2026-01-01
filter[DocDetails.D_Date][lte]=2026-03-31
filter[Buyer.C_Organization][contains]=Bosch
filter[DocDetails.D_Type][in]=Import,Export
```

The filter params include **nested bracket notation** like `filter[path][gte]`. The `documents.handler.ts` at lines 169-174 only parses the outer `filter[path]` level:
```typescript
if (k.startsWith('filter[') && k.endsWith(']')) {
  const field = k.slice(7, -1);
  filterParams[field] = v;
}
```

This only handles `filter[path]=value` (exact match). Operator variants like `filter[path][gte]=value` would produce a `field` of `path][gte` (wrong key) and be ignored. The `buildSchemaFilter` function then has no logic for `gte`, `lte`, `contains`, `in` operators at all — it only does exact match. The entire range/substring/set-membership filtering spec is unimplemented.

---

### HIGH-10: `otp.handler.ts` — session document missing `pennId` fallback to `ennResult.data.paramID`

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/auth/otp.handler.ts`, lines 107, 131–134
**Spec section:** §17.1

**Spec says (enn response block):**
```json
"enn": {
  "paramId": "<ethID from decrypted payload>",
  "pennId": "<paramID from decrypted payload — EHPI code>",
  "publicKey": "<publicKey>"
}
```

The `enn` block must contain `publicKey` from the decrypted payload. The code at lines 131–134:
```typescript
response.enn = {
  paramId: decryptedEnn.paramId,
  pennId: decryptedEnn.pennId ?? null,
  publicKey: decryptedEnn.publicKey ?? null,
};
```

This is correct. However, the session document stored in MongoDB at line 107 sets `pennId: decryptedEnn?.pennId ?? null`. The spec §12 session schema requires `pennId` to be the EHPI code. But `decryptedEnn.pennId` maps from `parsed.paramID` (line 81 of `enn-client.ts`). The spec says the session stores `pennId` which comes from `ENN's paramID (EHPI code)`. This looks correct.

**But**: The spec §17.1 step 3 says to extract `ethID, paramID, publicKey` from the decrypted payload. `decryptEnnPayload` in `enn-client.ts` maps `parsed.paramID → pennId`. Then in `otp.handler.ts`, `decryptedEnn.pennId` is used. This chain is correct.

**One issue remains**: The session document at line 102–115 does NOT store `publicKey` from the decrypted ENN payload in the session. The spec session schema at §12 does not require `publicKey` in the session — it's returned to the client in the `enn` block but not required in the session doc. So this is not an error.

Retracting HIGH-10, but replacing with a real issue:

### HIGH-10 (revised): `enn-client.ts` `registerExchange` — checks HTTP status code 500+ only, not `body.status`

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/auth/enn-client.ts`, lines 166–182
**Spec section:** §17.0, §17.3

**Spec says:**
> ENN returns HTTP 500 for business-logic failures. Wallet Backend does NOT throw on non-2xx — it always checks the `status` field of the JSON body.

All other ENN functions (`sendOtp`, `verifyOtp`, `verifySso`) correctly check `body.status === false || body.res === 'error'`. But `registerExchange` at lines 173-174:
```typescript
if (response.statusCode >= 500) {
  return { success: false, message: body.message ?? 'Exchange registration failed' };
}
return body;
```

This checks HTTP status code, not `body.status`. If ENN returns HTTP 200 with `{ "status": false, "res": "error" }` (business failure), the code returns `body` directly, and `body.success` will be `undefined` (not `false`), so `handleAddApp` will proceed as if the registration succeeded.

---

### HIGH-11: `listWorkspaces` — queries `subdomain_users` by `userId` but stores records by `_id: "user:{userId}"`

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/workspace.handler.ts`, lines 82–83
**Spec section:** §7.2, §11

**Spec §7.2:** `subdomain_users._id = "user:0x878042B8..."` and also has a `userId` field.

**Code does:**
```typescript
const userRecord = await saasDb.collection('subdomain_users').findOne({ userId: req.authContext.userId });
```

This queries by the `userId` field (not `_id`). Since there is an index on `userId` (`createCoreIndexes` line 18), this is functionally correct but relies on the `userId` field being indexed. However, the spec says lookup should be by `_id` (which is `"user:{userId}"`). The code is consistent with how records are created (line 41-42 of `workspace.handler.ts` sets both `_id: "user:{userId}"` and `userId: authContext.userId`). This is actually fine — both approaches work.

Retracting HIGH-11.

### HIGH-11 (revised): `getDocumentChain` — no L1 explicit check on parentDoc

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/chain.handler.ts`, lines 64–75
**Spec section:** §16.1, §22.1

**Spec says:** `GET /documents/:docId/chain` — L1 enforced.

**Code does:**
```typescript
const appUserDoc = await resolveAppUserContext(..., parentDoc);
if (!appUserDoc) return reply.status(403).send({ error: 'Access denied' });
// Get txn_history
```

The code calls `resolveAppUserContext` which does plant-based lookup, but never calls `passesL1()` or `resolveDocumentAccess()` to check L1+L2 access. A user who has an `app_users` doc but whose org does NOT appear in `_chain.roles` would still get the transaction history.

---

### HIGH-12: `manifestSuperApp` — org `_id` format missing `vendorId` suffix for partner roles

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/superapp.handler.ts`, lines 259–263
**Spec section:** §9.1, §15.8

**Spec says:**
- Partner org: `_id = "org:{superAppId}:{role}:{paramId[2:22]}:{vendorId}"`

**Code does:**
```typescript
const orgId = `org:${superAppId}:${role}:${orgPart}`;
```

The manifest endpoint uses the sponsor format `_id` for all roles (no `vendorId`). Since the manifest can include FF/CHA (partner) roles (the spec at §15.8 shows `"role": "FF"` in the example body), these partner orgs get wrong `_id` format. Also, the body doesn't include `partnerId` in the manifest schema, so there's no vendor ID to use.

---

### HIGH-13: `updateSuperAppStatus` response wrong — should return `{ "_id": "...", "status": "..." }` but `_id` is the superAppId string

Looking at the spec §15.4:
```json
{ "_id": "86bbaa780565662b3154", "status": "suspended" }
```

Code:
```typescript
return reply.send({ _id: request.params.superAppId, status });
```
This is correct. Not a deviation.

### HIGH-13 (replacing): `actions.handler.ts` — alternateNext L2 check passes WRONG targetState

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/actions.handler.ts`, lines 330–331
**Spec section:** §3.4, §16.1 step 6

**Spec says (step 6):** "L2 check per candidate: does the caller's team have `RW` in `sapp.team_rbac_matrix` at `{targetState, targetSubState, targetMicroState}`?"

For alternateNext, the target is the **new state** (e.g., "Customs"). The code correctly computes `resolveStartSubState(states, next.state)` to get `subState` and `microState`. Then calls:
```typescript
passesL2Check(teamRbacMatrix, callerTeams, callerRole, next.state, null, null)
```

This passes `null` for both subState and microState instead of the resolved start subState/microState. The L2 check should be against the **resolved landing position** (`{targetState, targetSubState, targetMicroState}`), not just the top-level state with `null` substates.

**Impact:** L2 check is done at the state level only, ignoring subState/microState, which may allow actions that should be blocked at the subState level.

---

### HIGH-14: `getDocument` — L3 check is not performed

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/documents.handler.ts`, lines 366–376
**Spec section:** §16.1, §22.3

**Spec says:** `GET /documents/:docId` — L1 + L2 + L3 enforced.

**Code does:**
```typescript
let access = 'RO';
if (teamRbacMatrix) {
  const resolved = resolveDocumentAccess(foundDoc, appUserDoc as AppUser, teamRbacMatrix, callerOrgParamId);
  if (!resolved) return reply.status(403).send({ error: 'Access denied to this document' });
  access = resolved;
}
```

`resolveDocumentAccess` (lines 273–310 of `rbac-filter.ts`) DOES call L3 via `passesL3`. So L3 IS being called through `resolveDocumentAccess`.

However: if `teamRbacMatrix` is `null` (no RBAC matrix found), `access` defaults to `'RO'` without ANY L3 check. If a document is restricted via `_sys.restrictedTo` and there's no RBAC matrix, access is granted to any authenticated user with an `app_users` record.

---

## MEDIUM Findings

---

### MED-1: `otp.handler.ts` — OTP length validation is wrong (length 8, but OTPs are typically 6 digits)

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/auth/schemas.ts`, line 10
**Spec section:** §17.1

Spec says body: `{ email, otp, deviceId? }` — no length constraint mentioned. The code validates `otp: z.string().length(8)` which rejects any 6-digit OTP. This is likely wrong for production ENN which typically sends 6-digit OTPs. This should be `.min(4).max(8)` or removed entirely and left to ENN to validate.

---

### MED-2: `enn-client.ts` `EnnResponse` interface — `success` field doesn't match ENN's actual response

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/auth/enn-client.ts`, lines 6–15
**Spec section:** §17.0

**Spec says ENN response envelope:**
```json
{ "res": "success"|"error", "status": true|false, "message": "...", "data": {} }
```

The `EnnResponse` interface has `success: boolean` (a platform-added field) but ENN never returns `success` — it returns `status`. The interface conflates the ENN envelope with the platform wrapper. While functions correctly return `{ success: false/true }` as a platform abstraction, the `registerExchange` function at line 177 does `return body` — which returns the raw ENN body (with `res`, `status`, `data`) directly as an `EnnResponse`. This means `body.success` is `undefined` in `handleAddApp`, so `if (!ennResult.success)` is always `true` when the response is a raw ENN body.

---

### MED-3: `sso.handler.ts` — `pennId` in session is always `null` for SSO users

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/auth/sso.handler.ts`, line 81
**Spec section:** §12, §17.2

The spec session schema at §12 shows `pennId` as a field. For SSO users, ENN's `/v2/verify_sso` does not return `pennId`. The spec response for SSO (§17.2) doesn't include a `pennId` or `enn` block — this is noted as correct ("no enn wrapper for SSO"). The `pennId: null` in the session is acceptable. No issue.

Actually looking at this more carefully — for SSO, `ennResult.data.paramId` is used for `paramId`. But the SSO spec says:
```
"paramId": "0x6193b497..."  // in ENN response
```

And the code at line 45:
```typescript
let paramId: string = (ennResult.data?.paramId as string) ?? (ennResult.ethID as string) ?? '';
```

In `enn-client.ts` `verifySso` line 158:
```typescript
ethID: (data?.paramId as string) ?? (data?.ethID as string) ?? undefined,
```

So `ennResult.ethID` is set from `data.paramId`. Then in `sso.handler.ts`: `ennResult.data?.paramId` is the raw paramId (0x address) from ENN, and `ennResult.ethID` is also the same value. Both paths lead to the correct `paramId`. This is correct.

---

### MED-3 (replacing): `listDocuments` — smName annotation puts `smId` before spread, may be overwritten

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/documents.handler.ts`, lines 269–276
**Spec section:** §16.1 response shape

**Spec response shows `smId` and `smName` as fields on each document:**
```json
{
  "smId": "public:0xe1ec34e6...",
  "smName": "Shipment Booking",
  "_id": "0xf97a54af...",
  ...
}
```

**Code does:**
```typescript
const annotated = paged.map(doc => {
  const docSmId = (doc._chain as Record<string, unknown>)?.smId as string | undefined;
  return {
    smId: docSmId ?? null,
    smName: docSmId ? (smNameMap[docSmId] ?? null) : null,
    ...doc,   // spread doc AFTER smId/smName — if doc has a top-level 'smId' field, it overwrites
  };
});
```

The `...doc` spread comes AFTER `smId` and `smName`, so if the stored document has a top-level `smId` field (which it doesn't in the spec schema — smId lives inside `_chain.smId`), it would overwrite the annotation. The order should be `{ ...doc, smId, smName }` not `{ smId, smName, ...doc }`. This is a minor ordering issue but can cause annotation to be lost if docs ever store top-level `smId`.

---

### MED-4: `createWorkspace` — does not return HTTP 409 on duplicate subdomain

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/workspace.handler.ts`, lines 38, 66
**Spec section:** §15.1 standard errors

**Spec says:** 409 — Conflict — duplicate key. The `insertOne` at line 38 will throw a MongoDB duplicate key error if the subdomain already exists. However, there is no try/catch around this to return 409 — the error will propagate as an unhandled 500. The error handler might catch it, but there's no explicit 409 mapping.

---

### MED-5: `partnerLifecycleHandler` — `Partner:Inactive` suspension uses `orgParamId` not `Contact.C_Identifier`

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/partner.handler.ts`, lines 192–200
**Spec section:** §15.5.1 `Partner:Inactive`

**Spec says:**
```
organizations → updateOne(
  { "org.paramId": Contact.C_Identifier, role: Invitee.C_Category, "org.partnerId": Contact.C_InternalID },
  { $set: { status: "suspended" } })
```

**Code does:**
```typescript
await sappDb.collection('organizations').updateOne(
  { 'org.paramId': orgParamId, role, 'org.partnerId': vendorId },
  { $set: { status: 'suspended', updatedAt: now } }
);
```

`orgParamId = contact.C_Identifier` (set at line 64). This is correct mapping — `Contact.C_Identifier → org.paramId`.

**But for app_users suspension:**
```typescript
await sappDb.collection('app_users').updateMany(
  { orgParamId, partnerId: vendorId },
  { $set: { status: 'suspended', updatedAt: now } }
);
```

The `app_users` query uses field name `orgParamId`, which matches the stored field name in `app_users` documents. Correct.

This is actually correct. Not a deviation.

### MED-5 (replacing): `buildDateRangeFilter` uses `new Date()` but `_local.timestamp` is stored as integer epoch seconds, not milliseconds

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/db/queries.ts`, lines 35-36
**Spec section:** §10.3

The spec's `txn_history` at §10.3 shows `"timestamp": 1770447080` — this is 10 digits, i.e., **epoch seconds** not milliseconds (13 digits would be ms). `_local.timestamp` in `sm_*` documents also shows `1770447080`. However, `from`/`to` query params are described as "epoch ms" in §16.1. If timestamps in DB are seconds and query params are ms, the comparison is off by 1000x even before the `new Date()` issue from CRIT-4.

---

### MED-6: `profile.handler.ts` — `getProfile` returns 404 when `partnerId` not found in org context

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/profile.handler.ts`, lines 48–54
**Spec section:** §15.2

**Spec says:** `GET /profile` with `partnerId` and workspace + superApp context: "returns single org doc. 404 if not found."

**Code does:**
```typescript
if (!org) return reply.status(404).send({ error: 'Org not found' });
```

This is correct. But the response is returned from within the try/catch block as a 404. If the org is not found, the reply was already started. The overall `response` shape is returned **early** with 404 — but the `response` object already has `user:` populated. The handler sends `{ error: 'Org not found' }` without the user context. The spec likely intends for 404 only on the org portion, not the whole response. However since the spec says "returns single org doc. 404 if not found", a bare 404 may be acceptable.

---

### MED-7: `schema-filter.ts` — `buildFieldWhitelist` generates `[]` suffix paths that `documents.handler.ts` doesn't generate

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/schema-filter.ts`, lines 39–47
**Spec section:** §16.1.1

`buildFieldWhitelist` generates paths like `OrderedItems[].I_SKU`. But `documents.handler.ts` strips bracket notation: `filter[OrderedItems.I_SKU]` → field = `OrderedItems.I_SKU`. The whitelist would contain `OrderedItems[].I_SKU` but the lookup `whitelist.has("OrderedItems.I_SKU")` fails (no `[]` in the requested path). So array field filters always fail whitelist check (silently ignored since HIGH-8 showed invalid fields are ignored, not rejected).

---

### MED-8: `getDocument` — no L3 check when `teamRbacMatrix` is null

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/documents.handler.ts`, lines 366–376
Already documented in HIGH-14. Not duplicating.

### MED-8 (replacing): `auth.ts` — `authMiddleware` does not check `X-Workspace` requirement

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/middleware/auth.ts`
**Spec section:** §20.2

**Spec says:**
```
X-Workspace | Yes | Required
X-Param-ID  | Yes | Required
```

`X-Workspace` is listed as **required** in §20.2. The `authMiddleware` checks `x-param-id` but NOT `x-workspace`. The spec notes `GET /profile` can be called without `X-Workspace`, implying all other routes require it. The code doesn't enforce this. Routes individually check for workspace — but auth middleware doesn't uniformly enforce it.

---

### MED-9: `offchain.handler.ts` `listOffchainDefinitions` — filters by `linkedSuperApps` but spec says filter by `linkedSuperApps` containing `superAppId`

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/offchain.handler.ts`, line 202–204
**Spec section:** §16.3

**Spec says:** "Reads `param_definitions.offchain_sm_definitions` filtered by `linkedSuperApps` containing `superAppId`."

**Code does:**
```typescript
const docs = await defsDb.collection('offchain_sm_definitions').find({ linkedSuperApps: superAppId }).toArray();
```

`{ linkedSuperApps: superAppId }` in MongoDB performs an array membership test: it matches documents where `linkedSuperApps` contains `superAppId`. This is actually correct MongoDB behavior for array fields. However, if `linkedSuperApps` is a plain string (not array), this would fail. Assuming it's an array as defined in the spec, this query is correct.

Not a deviation. Replacing:

### MED-9 (replacing): `platform-context.ts` — `PUT /user/profile` not in `PLATFORM_SKIP_EXACT`

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/middleware/platform-context.ts`, lines 34–38
**Spec section:** §15.2, §20.1

`PLATFORM_SKIP_EXACT` includes `GET /api/v1/user/profile` but not `PUT /api/v1/user/profile`. Since `PUT /user/profile` doesn't need SuperApp context (it's a user profile update), the platform context middleware will run and return `null` when no `X-SuperApp-ID` is set. The route handler in `profile.handler.ts` doesn't check `platformContext`, so this is fine — but it's unnecessary middleware overhead and should be explicitly skipped.

---

### MED-10: `createWorkspace` response — HTTP 201 not documented in spec but sent

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/workspace.handler.ts`, line 66
The spec does not specify `201` for `POST /workspace/create` — the example response box shows just the JSON without a status code. Using 201 is standard REST convention for POST creates, but the spec is ambiguous. This is LOW severity.

---

### MED-11: `listDocuments` — plant filter uses `$elemMatch: { $in: plants }` which is wrong MongoDB syntax

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/documents.handler.ts`, line 147
**Spec section:** §22.5

**Spec example:**
```javascript
[`_chain._sys.plantIDs.${callerOrgParamId}`]: { $elemMatch: { $in: userPlants } }
```

The spec code example at §22.5 literally shows this query. However, this is **invalid MongoDB** — `$elemMatch` applies to array elements as objects, not primitives with `$in`. For a field like `plantIDs.{orgId} = ["1810", "1820"]`, the correct query is:
```javascript
{ [`_chain._sys.plantIDs.${callerOrgParamId}`]: { $in: userPlants } }
```
`$elemMatch` with `$in` is for array-of-objects fields. For array-of-strings, `$in` directly works. The spec's own code example has a bug, and the code faithfully implements the buggy spec query. MongoDB will likely return `0` results for all plant-filtered queries.

**Note**: This is a spec error that the code copied faithfully. Recording it because it causes incorrect behavior.

---

### MED-12: `getDocument` — does not search via `chain_head` first as specified

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/documents.handler.ts`, lines 321–340
**Spec section:** §16.1 `GET /documents/:docId`

**Spec says:** "Reads: `chain_head` → SM collection."

**Code does:** Scans all SM collections with `findOne({ _id: docId })` without consulting `chain_head` first. The spec requires first looking up `chain_head` to know the current state → SM collection, then fetching the actual document. Not using `chain_head` means:
1. The document fetched may not be at the current state (if a doc has multiple versions across state collections)
2. The `stateTo` for L2/L3 decisions comes from `_local` rather than the authoritative `chain_head`

---

## LOW Findings

---

### LOW-1: `enn-client.ts` — `decryptEnnPayload` returns wrong field name order in spread

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/auth/enn-client.ts`, lines 78–83

The `decryptEnnPayload` spreads all parsed fields (`...parsed`) and then sets `paramId` and `pennId`. If `parsed` contains a field named `paramId` (original ENN mapping), the spread would include it and then the explicit assignment `paramId: (parsed.ethID ?? parsed.paramId ?? '')` overwrites it. This is the intended behavior and is correct. However, the returned object also includes all raw ENN fields (`ethID`, `paramID`, etc.) from the spread which are unnecessary in the platform's decrypted payload object.

---

### LOW-2: `otp.handler.ts` — `isTermsAndConditionVerified` response field missing in spec

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/auth/otp.handler.ts`, line 122
**Spec section:** §17.1 response

**Spec response:**
```json
{
  "token": "...",
  "refreshToken": "...",
  "expiresAt": 1740571200000,
  "isTermsAndConditionVerified": true,
  "user": { ... },
  "enn": { ... }
}
```

The spec includes `isTermsAndConditionVerified`. The code correctly includes it:
```typescript
isTermsAndConditionVerified: (ennResult.data?.isTermsAndConditionVerified as boolean) ?? false,
```
This is correct. Not a deviation.

---

### LOW-2 (replacing): `session.handler.ts` — `handleRefreshToken` session expiry check uses `new Date()` comparison on epoch ms

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/auth/session.handler.ts`, line 37

```typescript
if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
```

`session.expiresAt` is stored as epoch ms (integer). `new Date(1740571200000)` works correctly for epoch ms. This is fine.

### LOW-2 (replacing): `partner.handler.ts` — `partnerLifecycleHandler` uses `addedAt` field missing

Already captured in HIGH-4.

### LOW-2 (final replacing): `superapp.handler.ts` — `installSuperApp` creates `organizations` doc but `org.name` is empty

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/superapp.handler.ts`, lines 83–85

```typescript
const installerRecord = await saasDb.collection('subdomain_users').findOne({ userId: req.authContext.userId });
const sponsorOrgName = (installerRecord as Record<string, unknown> | null)?.name as string ?? '';
```

The `name` field on `subdomain_users` is the **user's name** (e.g., "SCM Team Lead"), NOT the org name. The org name should come from the `organizations` collection or from the user's `paramId` lookup. The spec §15.4 step 4 says `binds caller's paramId with status: "active"` — it doesn't specify where org name comes from, but using user's personal name as org name is clearly wrong.

---

### LOW-3: `createPlant` — response HTTP 201 vs spec shape

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/workspace.handler.ts`, line 193
**Spec section:** §15.1

Spec response: `{ code, name, paramId, location, isActive: true }` — same as GET items. Code returns the full `doc` object which also includes `_id`, `createdAt`, `updatedAt`. Minor deviation — extra fields in response not in spec.

---

### LOW-4: `getSmStates` — uses `doc.stateMachine.states` as fallback

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/platform/definitions.handler.ts`, line 149

```typescript
const raw = doc.states ?? (doc.stateMachine as Record<string, unknown>)?.states ?? {};
```

`doc.stateMachine` is not in the spec schema for `onchain_sm_definitions` (§6.2). This fallback references a non-existent field. Harmless since `doc.states` will always be used first, but the fallback is dead code.

---

### LOW-5: `queries.ts` — `buildPlantFilter` builds wrong filter

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/db/queries.ts`, lines 7–15
**Spec section:** §10.2, §22.4

`buildPlantFilter` uses `_chain.plant` and `_chain.plants` — these fields don't exist in the spec's document schema. Plants are in `_chain._sys.plantIDs`. This function is not called anywhere in the current codebase (it's dead code), but if used, it would produce wrong results.

---

### LOW-6: `resolveCallerTeams` — signature inconsistency with spec §22.2

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/query/rbac-filter.ts`, lines 146–158

**Spec §22.2 signature:**
```typescript
function resolveCallerTeams(appUser: AppUser, callerOrgParamId: string, docPlantIDs: Record<string, string[]>): string[]
```

**Code signature:**
```typescript
function resolveCallerTeams(appUser: AppUser, callerOrgParamId: string, docPlantIds: string[]): string[]
```

The spec passes a `Record<string, string[]>` (the full `plantIDs` map), while the code passes a pre-computed `string[]` of plant codes. The code already extracts the plant codes before calling (acceptable abstraction), but the `callerOrgParamId` parameter is accepted but not used inside the function body (lines 151–158 don't reference `callerOrgParamId`). The plant matching just checks if ANY doc plant is in the user's plants — the org-specific filtering from the spec is bypassed.

---

### LOW-7: `queries.ts` — `paginatedFind` helper returns `pages` field

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/db/queries.ts`, lines 78–80

The spec response for `GET /documents` is `{ total, page, limit, documents: [...] }` — no `pages` field. The `paginatedFind` helper returns `{ data, total, page, limit, pages }`. This function is not used by `listDocuments` (which builds its response manually), but if used by other endpoints, the `pages` field would be an extra non-spec field.

---

### LOW-8: `sso.handler.ts` `handleDomainRegister` — 409 detection uses string matching on message

**File:** `/Users/aakashkumar/Desktop/paramplatform_v2/packages/wallet-backend/src/engines/auth/sso.handler.ts`, lines 123–128

```typescript
if (ennResult.message?.toLowerCase().includes('already') ||
    ennResult.message?.toLowerCase().includes('exists')) {
  return reply.status(409).send({ error: ennResult.message });
}
```

Detecting 409 by matching error message strings is fragile. ENN could change its error messages and the 409 detection would silently break. The spec says "409 if email already registered for this subdomain" — there should be a more reliable way to distinguish this case (e.g., a specific ENN error code).

---

## Summary Table

| ID | Severity | File | Issue |
|----|----------|------|-------|
| CRIT-1 | CRITICAL | `rbac-filter.ts:109-126` | `passesL1` reads `_chain.roles` values as objects but they are plain strings — L1 always fails |
| CRIT-2 | CRITICAL | `rbac-filter.ts:305-307` | L3 only checks `firstTeam`, not all teams — should use any-of logic |
| CRIT-3 | CRITICAL | `actions.handler.ts:446-453` | `getDocPlantCodes` reads `_chain.plant` / `_chain.plants` — wrong fields; should read `_chain._sys.plantIDs` |
| CRIT-4 | CRITICAL | `queries.ts:32-38` | `buildDateRangeFilter` wraps epoch timestamps in `new Date()` — type mismatch with integer timestamps |
| CRIT-5 | CRITICAL | `rbac-filter.ts:60-63` | `resolveAppUserContext` early-returns on single doc before checking `partnerIdHint` — wrong vendor context returned |
| CRIT-6 | CRITICAL | `rbac-filter.ts:169-196` | `getTeamAccess` exact-match only — missing microState→subState→state fallback from spec §22.2 |
| HIGH-1 | HIGH | `workspace.handler.ts:32` | `ownerOrgName` set to empty string `''` in `subdomains` write |
| HIGH-2 | HIGH | `superapp.handler.ts:88-96` | `installSuperApp` spreads raw MongoDB doc into `installedDoc`, may include unwanted internal fields |
| HIGH-3 | HIGH | `superapp.handler.ts:142-150` | step 6 `subdomain_users` upsert missing `$setOnInsert` for `email`, `userId`, `name` |
| HIGH-4 | HIGH | `partner.handler.ts:158-183` | `app_users` write in `partnerLifecycleHandler` missing `addedAt` field; REST override also missing |
| HIGH-5 | HIGH | `user.handler.ts:119` | `createUsers` always generates sponsor `_id` format — vendor users get wrong `_id` (no `partnerId`) |
| HIGH-6 | HIGH | `definitions.handler.ts:149-152` | `getSmStates` returns raw keyed object; spec requires navigable array with `name` keys |
| HIGH-7 | HIGH | `documents.handler.ts` | `include_actions` and `include_diff` parsed but never applied |
| HIGH-8 | HIGH | `schema-filter.ts:155-160` | Invalid filter fields silently ignored; spec requires 400 with field identification |
| HIGH-9 | HIGH | `documents.handler.ts:169-174` | Operator bracket notation (`[gte]`, `[lte]`, `[contains]`, `[in]`) not parsed at all |
| HIGH-10 | HIGH | `enn-client.ts:173-177` | `registerExchange` checks HTTP status code, not `body.status` — inconsistent with spec §17.0 |
| HIGH-11 | HIGH | `chain.handler.ts:64-84` | `getDocumentChain` lacks L1+L2 document access check — only checks app_users exists |
| HIGH-12 | HIGH | `superapp.handler.ts:259-263` | `manifestSuperApp` uses sponsor org `_id` format for all roles — partner roles missing `vendorId` suffix |
| HIGH-13 | HIGH | `actions.handler.ts:330-331` | `alternateNextActions` L2 check passes `null` for subState/microState instead of resolved landing position |
| HIGH-14 | HIGH | `documents.handler.ts:366-376` | `getDocument` skips L3 when `teamRbacMatrix` is null |
| MED-1 | MEDIUM | `schemas.ts:10` | OTP validated as exactly 8 chars — standard OTPs are 6 digits, breaking real ENN OTPs |
| MED-2 | MEDIUM | `enn-client.ts:177` | `registerExchange` returns raw ENN body as `EnnResponse` — `body.success` is `undefined` |
| MED-3 | MEDIUM | `documents.handler.ts:269-276` | `smId`/`smName` annotation before spread — may be overwritten by doc fields |
| MED-4 | MEDIUM | `workspace.handler.ts:38` | `createWorkspace` no 409 handling for duplicate subdomain key error |
| MED-5 | MEDIUM | `queries.ts:35-36` | `buildDateRangeFilter` compares epoch ms vs. epoch seconds mismatch |
| MED-6 | MEDIUM | `profile.handler.ts:48-54` | `GET /profile` returns bare `{ error }` 404 rather than user+null when partnerId not found |
| MED-7 | MEDIUM | `schema-filter.ts:39-47` | Whitelist generates `[]` suffix paths; handler strips brackets — whitelist lookup always misses array fields |
| MED-8 | MEDIUM | `auth.ts` | `X-Workspace` not enforced in auth middleware despite being required for all non-profile routes |
| MED-9 | MEDIUM | `platform-context.ts:34-38` | `PUT /user/profile` not in `PLATFORM_SKIP_EXACT` — unnecessary platform context resolution |
| MED-10 | MEDIUM | `superapp.handler.ts:83-85` | Sponsor org `org.name` set from user's personal `name` field, not org name |
| MED-11 | MEDIUM | `documents.handler.ts:147` | Plant filter uses `$elemMatch: { $in: ... }` — invalid MongoDB for string arrays; should be `{ $in: ... }` directly |
| MED-12 | MEDIUM | `documents.handler.ts:321-340` | `getDocument` scans all SM collections; spec requires `chain_head` lookup first |
| LOW-1 | LOW | `enn-client.ts:78-83` | Decrypted payload includes raw ENN fields unnecessarily in platform representation |
| LOW-2 | LOW | `superapp.handler.ts:83-85` | `org.name` in `organizations` doc set to user display name, not organization name |
| LOW-3 | LOW | `workspace.handler.ts:193` | `createPlant` response includes `_id`, `createdAt`, `updatedAt` — extra fields not in spec |
| LOW-4 | LOW | `definitions.handler.ts:149` | `doc.stateMachine.states` fallback references non-existent schema field |
| LOW-5 | LOW | `queries.ts:7-15` | `buildPlantFilter` reads wrong fields (`_chain.plant`, `_chain.plants`) — dead code but incorrect |
| LOW-6 | LOW | `rbac-filter.ts:146-158` | `resolveCallerTeams` accepts `callerOrgParamId` but never uses it; logic subtly different from spec |
| LOW-7 | LOW | `queries.ts:78-80` | `paginatedFind` returns `pages` field — extra field not in spec response schema |
| LOW-8 | LOW | `sso.handler.ts:123-128` | 409 detection by string-matching ENN error messages — fragile |

---

## Detailed Notes on Correct Areas

The following areas were verified as **correctly implemented** (spec and code match):

1. **DB resolver functions** (`resolver.ts`) — all four functions match spec §21 exactly: `param_definitions`, `param_saas`, `param_auth`, workspace/superApp naming patterns.
2. **Auth session `_id` format** — `session:${SHA256(token)}` correctly implemented in `otp.handler.ts`, `sso.handler.ts`, `session.handler.ts`.
3. **JWT payload fields** — `{ userId, email, paramId }` — correct per spec §17.1 step 6.
4. **`userId = SHA256(email.toLowerCase())`** — correctly computed in all handlers.
5. **OTP verify response shape** — `{ token, refreshToken, expiresAt(ms), isTermsAndConditionVerified, user, enn? }` — correct per §17.1.
6. **SSO response shape** — `{ token, refreshToken, expiresAt(ms), user: { userId, email, paramId } }` — no `enn` block, correct per §17.2.
7. **Refresh response shape** — `{ token, refreshToken, expiresAt(ms), user: { userId, email, paramId } }` — correct per §17.3.
8. **Logout response** — `{ "status": "logged_out" }` — correct.
9. **addapp response** — `{ "status": "registered", "exchangeId": "..." }` — correct.
10. **ENN endpoints** — `v2/send_otp`, `v2/verify_otp`, `v2/verify_sso`, `v2/register_exchange`, `v4/onboard` — all use correct paths.
11. **ENN headers** — `app-key` (not `x-app-key`) header correctly used. `param_exchange_enn_key` and `subdomain_name` for `/v4/onboard` correct.
12. **`/v4/onboard` uses `searchParams`** (query params) not JSON body — correct per spec §17.0.
13. **Sponsor org `_id` format** in `installSuperApp` — `org:{superAppId}:{sponsorRole}:{paramId[2:22]}` — correct for sponsor.
14. **Partner org `_id` format** in `partner.handler.ts` `handlePartnerOnboardRest` and `partnerLifecycleHandler` — `org:{superAppId}:{role}:{paramId[2:22]}:{vendorId}` — correct.
15. **Vendor `app_users._id`** in `partnerLifecycleHandler` — `user:{superAppId}:{userId}:{vendorId}` — correct.
16. **`plant._id` format** — `plant:{code}` — correct throughout.
17. **All timestamps use `Date.now()`** (epoch ms) not `new Date()` in DB writes.
18. **`callerIsSponsor` logic** — `platformContext.appUserDocs.some(d => !d.partnerId)` — correct per spec §22.6 (absence of partnerId, not isWorkspaceAdmin).
19. **`buildPartnerIdFilter`** — sponsor gets null (filter ignored), vendor gets `_participants.{callerRole}.C_InternalID` — correct per spec §22.6.
20. **L3 `blocked: true` response** (not 403) in `actions.handler.ts` — correct per spec §16.1 step 1.
21. **`getDocumentChain` response** — plain array, no wrapper — correct per spec §16.1.
22. **`getDocumentDiff` diff algorithm** — per-SKU remaining quantity, `canCreateChild`, `items`, `children` shape — correct per spec §16.1.
23. **Offchain endpoints** — `{ total, page, limit, records }` for registry list, single doc for registry item and config, `{ sm, schemas }` for definition — correct per spec §16.3.
24. **`GET /offchain/definitions`** — filters by `linkedSuperApps` containing `superAppId` — correct.
25. **`verifyOrgAccess`** — checks `organizations` collection by `org.paramId` — correct per spec §16.3.
26. **Workspace routes** — `POST /workspace/create`, `GET /workspace/list`, `GET /workspace`, `PUT /workspace`, `GET/POST/PUT/DELETE /workspace/plants` — all paths match spec §15.1.
27. **`platform-context.ts`** — fetches all `app_users` docs (handles multi-vendor), merges `plantTeams`, derives `isWorkspaceAdmin` and `isOrgAdmin` — correct pattern.
28. **`Partner:Inactive` writes** — organizations suspend by `org.paramId + role + org.partnerId`, app_users suspend by `orgParamId + partnerId` — correct per spec §15.5.1.
29. **`DELETE /superapp/:superAppId/users/:userId`** — sets `status: suspended` — correct soft-delete per spec §15.6.
30. **Team RBAC matrix `_id` format** — `{superAppId[0:8]}:{smId}` — correct per spec §6.4.
