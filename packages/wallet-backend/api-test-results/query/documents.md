# Query Engine — Documents APIs

**Base URL:** `http://localhost:3001/api/v1`
**Test Date:** 2026-03-06
**Test User:** `admin@bosch5.com` / paramId: `0x996fc8177dFD5839987606Ff8504D0008166BdE8`
**Test Workspace:** `bosch-test2`
**SuperApp:** `d39059d121cc4f1cb918` (Bosch EXIM)
**Portal (role):** `Consignee`

**Required headers for Query Engine:**
- `X-Workspace`, `X-SuperApp-ID`, `X-Portal` are ALL required
- Org partition DB resolved as: `{workspace}_{superAppId[0:8]}_{paramId[2:22]}_{portal}`
  = `bosch-test2_d39059d1_996fc8177dFD58399876_Consignee`

**Test setup (seeded directly via MongoDB):**
- `app_users` doc for admin inserted into `bosch-test2_d39059d1` (required for `platformContext`)
- 2 SM documents inserted into `bosch-test2_d39059d1_996fc8177dFD58399876_Consignee.sm_Invoice_94a7d0`
  - `doc:inv001` — Invoice:Bosch subState
  - `doc:inv002` — Invoice:NonBosch subState
- `chain_head` docs inserted for both

---

## 1. List Documents

**`GET /documents`**

### Request (basic — all SM collections)
```bash
curl "http://localhost:3001/api/v1/documents?page=1&limit=10" \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2" \
  -H "X-SuperApp-ID: d39059d121cc4f1cb918" \
  -H "X-Portal: Consignee"
```

### Response — `200 OK`
```json
{
  "total": 2,
  "page": 1,
  "limit": 10,
  "documents": [
    {
      "_id": "doc:inv001",
      "data": { "invoiceNumber": "INV-2026-001", "amount": 50000, "currency": "USD" },
      "_chain": {
        "smId": "public:0x94a7d022...",
        "roles": { "Consignee": "0x996fc8177dFD5839987606Ff8504D0008166BdE8" },
        "_sys": { "plantIDs": { "0x996fc8177dFD58...": ["2001"] }, "restrictedTo": null }
      },
      "_local": { "state": "Invoice", "subState": "Bosch", "phase": "Agreement", "timestamp": 1772803553366 },
      "access": "RO",
      "smId": "public:0x94a7d022...",
      "smName": "Sales Invoice"
    },
    {
      "_id": "doc:inv002",
      "access": "RO",
      "smName": "Sales Invoice",
      "_local": { "state": "Invoice", "subState": "NonBosch" }
    }
  ]
}
```

**Result: ✅ PASS**

### Request (filtered by state + subState + smId)
```bash
curl "http://localhost:3001/api/v1/documents?page=1&limit=10&state=Invoice&subState=Bosch&smId=public%3A0x94a7d022..." \
  ...same headers...
```

### Response — `200 OK` (1 doc, access=RW)
```json
{ "total": 1, "documents": [{ "_id": "doc:inv001", "access": "RW", "smName": "Sales Invoice" }] }
```

**Result: ✅ PASS**

### Notes
- Without `smId`: no RBAC matrix loaded → all docs get `access: 'RO'`
- With `smId` + state filter: RBAC matrix loaded → resolves per-team access (Consignee.Admin → RW for Invoice:Bosch)
- L1 filter: `_chain.roles.Consignee = callerParamId` (mandatory)
- Plant filter: `_chain._sys.plantIDs.{callerParamId}: { $in: userPlants }`
- Response: `{ total, page, limit, documents: [...] }` — no wrapper, no `pages` field
- `smName` annotated from `param_definitions.onchain_sm_definitions`
- Sorted by `_local.timestamp DESC` across all `sm_*` collections

---

## 2. Get Document

**`GET /documents/:docId`**

### Request
```bash
curl "http://localhost:3001/api/v1/documents/doc:inv001" \
  -H "Authorization: Bearer <token>" \
  -H "X-Workspace: bosch-test2" \
  -H "X-SuperApp-ID: d39059d121cc4f1cb918" \
  -H "X-Portal: Consignee" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8"
```

### Response — `200 OK`
```json
{
  "_id": "doc:inv001",
  "smId": "public:0x94a7d022...",
  "smName": "Sales Invoice",
  "access": "RW",
  "_local": { "state": "Invoice", "subState": "Bosch" },
  ...
}
```

**Result: ✅ PASS**

### Not Found — `404`
```json
{ "error": "Document not found" }
```
**Result: ✅ PASS**

### Notes
- Uses `chain_head` to narrow collection scan (finds current state → `sm_{state}_*` prefix)
- Full L1+L2+L3 RBAC check; falls back to L1+L3 when no RBAC matrix
- Returns doc spread with `smId`, `smName`, `access` injected at top level

---

## 3. Get Document Actions

**`GET /documents/:docId/actions`**

### Request
```bash
curl "http://localhost:3001/api/v1/documents/doc:inv001/actions" \
  ...same headers...
```

### Response — `200 OK`
```json
{
  "currentState": "Invoice",
  "currentSubState": "Bosch",
  "currentMicroState": null,
  "availableActions": [],
  "alternateNextActions": [],
  "linkedSmActions": []
}
```

**Result: ✅ PASS**

### Notes
- `availableActions` empty because `Invoice:Bosch` subState has no `nextState` transition defined in the SM def (only `NonBosch` has `end: true`)
- Traverses SM `states` hierarchy: state → subState → microState for transition rules
- L2 RBAC checked for each action — only returns actions where caller has `RW` access to target state
- `currentState/SubState/MicroState` resolved from `chain_head.stateTo`

---

## 4. Get Document Chain

**`GET /documents/:docId/chain`**

### Request
```bash
curl "http://localhost:3001/api/v1/documents/doc:inv001/chain" \
  ...same headers...
```

### Response — `200 OK`
```json
[]
```

**Result: ✅ PASS** (empty — only 1 transaction in chain, no history yet)

### Notes
- Returns plain array of all `txn_history` records for this doc
- Full L1+L2+L3 RBAC checked before returning
- Empty array when no history transactions (doc only has its creation txn in chain_head)

---

## 5. Get Document Diff

**`GET /documents/:docId/diff`**

### Request
```bash
curl "http://localhost:3001/api/v1/documents/doc:inv001/diff" \
  ...same headers...
```

### Response — `200 OK`
```json
{
  "_id": "doc:inv001",
  "data": { "invoiceNumber": "INV-2026-001", "amount": 50000, "currency": "USD" },
  "_chain": { ... },
  "_local": { "state": "Invoice", "subState": "Bosch" },
  "access": "RW",
  "diff": {
    "hasOrderedItems": false,
    "parentQty": null,
    "consumedQty": null,
    "remainingQty": null,
    "canCreateChild": true,
    "items": [],
    "children": []
  }
}
```

**Result: ✅ PASS**

### Notes
- Returns full doc + `diff` block appended
- `hasOrderedItems: false` — no `OrderedItems` field in this doc
- `canCreateChild: true` — no children in `chain_head` for this doc
- If `OrderedItems` present: reduces to `{ total, used, remaining }` per item

---

## 6. Offchain Registry List

**`GET /offchain/registry/:collectionName`**

### Response — `200 OK` (empty)
```json
{ "total": 0, "page": 1, "limit": 25, "records": [] }
```

**Result: ✅ PASS** (no offchain data seeded)

### Notes
- Reads from org partition DB `{collectionName}` collection
- Response: `{ total, page, limit, records }` — note `records` (not `documents`)

---

## 7. Offchain Registry Item

**`GET /offchain/registry/:collectionName/:keyValue`**

### Response — `404` (no data)
```json
{ "error": "Registry item not found" }
```

**Result: ✅ PASS** (404 path verified)

---

## 8. Offchain Config

**`GET /offchain/config/:collectionName`**

### Response — `404` (no data)
```json
{ "error": "Config not found" }
```

**Result: ✅ PASS** (404 path verified)

---

## 9. Offchain Definitions List

**`GET /offchain/definitions`**

### Response — `200 OK`
```json
[]
```

**Result: ✅ PASS** (0 offchain SM definitions linked to Bosch EXIM superApp)

### Notes
- Filtered by `linkedSuperApps` containing the current `superAppId`
- Returns plain array

---

## 10. Offchain Definition Get

**`GET /offchain/definitions/:offchainSmId`**

### Response — `404`
```json
{ "error": "Offchain SM definition not found" }
```

**Result: ✅ PASS** (404 path verified)
