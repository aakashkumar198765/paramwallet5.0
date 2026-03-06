# Platform — Definitions APIs

**Base URL:** `http://localhost:3001/api/v1`
**Test Date:** 2026-03-06
**Test User:** `admin@bosch5.com` / paramId: `0x996fc8177dFD5839987606Ff8504D0008166BdE8`

---

## 1. List SuperApp Definitions

**`GET /definitions/superapps`**

### Request
```bash
curl http://localhost:3001/api/v1/definitions/superapps \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8"
```

### Response — `200 OK`
```json
[
  {
    "_id": "d39059d121cc4f1cb918",
    "name": "Bosch EXIM",
    "desc": "Export & Import Shipment Automation",
    "version": "1.0.0",
    "roles": [ { "name": "Consignee", ... }, { "name": "FF", ... }, { "name": "CHA", ... } ],
    "linkedSMs": ["@sm/Commerce:public:0x...", ...],
    "sponsor": "Consignee",
    "isActive": 1,
    "createdBy": "EHPI1668",
    "createdAt": 1772544241326
  }
]
```

**Result: ✅ PASS**

### Notes
- Returns all docs from `param_definitions.superapp_definitions`
- Pre-seeded `Bosch EXIM` found in DB

---

## 2. Get SuperApp Definition

**`GET /definitions/superapps/:id`**

### Request
```bash
curl http://localhost:3001/api/v1/definitions/superapps/d39059d121cc4f1cb918 \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8"
```

### Response — `200 OK`
```json
{ "_id": "d39059d121cc4f1cb918", "name": "Bosch EXIM", "sponsor": "Consignee", "isActive": 1, ... }
```

**Result: ✅ PASS**

### Not Found — `404`
```json
{ "error": "SuperApp definition not found" }
```
**Result: ✅ PASS**

---

## 3. Create SuperApp Definition

**`POST /definitions/superapps`**

### Request
```bash
curl -X POST http://localhost:3001/api/v1/definitions/superapps \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test SuperApp",
    "desc": "A test superapp definition",
    "version": "1.0.0",
    "roles": [
      { "name": "Sponsor", "desc": "Owner role", "teams": [{ "name": "Admin", "desc": "Admins" }] },
      { "name": "Vendor",  "desc": "Partner role", "teams": [{ "name": "Ops", "desc": "Operations" }] }
    ],
    "linkedSMs": [],
    "sponsor": "Sponsor"
  }'
```

### Response — `201 Created`
```json
{
  "_id": "ef4491349d3ac4ff21a1",
  "name": "Test SuperApp",
  "desc": "A test superapp definition",
  "version": "1.0.0",
  "roles": [...],
  "linkedSMs": [],
  "sponsor": "Sponsor",
  "isActive": 1,
  "createdBy": "a785000a2774dadde1f4c547ac9801e7c0856a6f6594fa2f4abb41e99a84db50",
  "createdAt": 1772798297381,
  "updatedAt": 1772798297381
}
```

**Result: ✅ PASS**

### Notes
- `_id` is a random 20-char hex (`randomBytes(10).toString('hex')`)
- `isActive` defaults to `1`
- `createdBy` set to caller's `userId`

---

## 4. Update SuperApp Definition

**`PUT /definitions/superapps/:id`**

### Request
```bash
curl -X PUT http://localhost:3001/api/v1/definitions/superapps/ef4491349d3ac4ff21a1 \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "Content-Type: application/json" \
  -d '{"desc": "Updated description", "version": "1.0.1"}'
```

### Response — `200 OK`
```json
{
  "_id": "ef4491349d3ac4ff21a1",
  "name": "Test SuperApp",
  "desc": "Updated description",
  "version": "1.0.1",
  "updatedAt": 1772798305765
}
```

**Result: ✅ PASS**

### Notes
- `UpdateSuperAppDefinitionSchema` is a partial of `CreateSuperAppDefinitionSchema` — all fields optional
- `updatedAt` refreshed on every update

---

## 5. List SM Definitions

**`GET /definitions/sm`**

### Request
```bash
curl http://localhost:3001/api/v1/definitions/sm \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8"
```

### Response — `200 OK`
```json
[
  { "_id": "public:0x94a7d022...", "name": null },
  { "_id": "public:0xbad94eef...", "name": null },
  { "_id": "0x9fcf3b35...", "name": null }
]
```

**Result: ✅ PASS** (3 pre-seeded SM definitions found)

### Notes
- Read-only collection — seeded by SyncFactory, not writable via this API

---

## 6. Get SM Definition

**`GET /definitions/sm/:smId`**

### Request (smId must be URL-encoded if it contains colons)
```bash
curl "http://localhost:3001/api/v1/definitions/sm/public%3A0x94a7d022351c54007630239187ec461b84a9f3a6b6961de7ad496ec1c1012e3a" \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8"
```

### Response — `200 OK`
```json
{ "_id": "public:0x94a7d022...", "name": null, "states": { ... } }
```

**Result: ✅ PASS**

### Notes
- `smId` values containing `:` must be URL-encoded as `%3A` in the path

---

## 7. Get SM States

**`GET /definitions/sm/:smId/states`**

### Request
```bash
curl "http://localhost:3001/api/v1/definitions/sm/public%3A0x94a7d022.../states" \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8"
```

### Response — `200 OK`
```json
{
  "smId": "public:0x94a7d022...",
  "states": [
    {
      "name": "Invoice",
      "phase": "Agreement",
      "owner": ["Consignee"],
      "schema": "public:0xe81fa6...",
      "subStates": {
        "Bosch":    { "nextState": "NonBosch", "owner": ["Consignee"], "start": true },
        "NonBosch": { "end": true, "owner": ["Consignee"] }
      }
    }
  ]
}
```

**Result: ✅ PASS**

### Notes
- Raw `doc.states` object is converted to array with `name` key injected (HIGH-6 fix)
- Used by frontend RBAC matrix builder to enumerate states/subStates

---

## 8. List Schema Definitions

**`GET /definitions/schemas`**

### Response — `200 OK`
```json
[ { "_id": "0x2773f95c...", "properties": { "AirCarrier": {...}, "Buyer": {...}, ... } }, ... ]
```

**Result: ✅ PASS** (2 pre-seeded schema definitions)

---

## 9. Get Schema Definition

**`GET /definitions/schemas/:schemaId`**

### Response — `200 OK`
```json
{
  "_id": "0x2773f95c4988d4631f8a8b45c4168af78afa2a4cc43f51778389427e5269f668",
  "properties": {
    "AirCarrier": {...}, "Buyer": {...}, "OrderedItems": {...}, ...
  }
}
```

**Result: ✅ PASS** (25 top-level property groups)

---

## 10. List Offchain SM Definitions

**`GET /definitions/offchain-sm`**

### Response — `200 OK`
```json
[ { "_id": "public:0xf54dde24...", "name": "...", "states": {...} } ]
```

**Result: ✅ PASS** (1 pre-seeded offchain SM)

---

## 11. Get Offchain SM Definition

**`GET /definitions/offchain-sm/:id`**

### Response — `200 OK`
```json
{ "_id": "public:0xf54dde24...", "defId": "...", "defType": "...", "name": "...", "states": {...} }
```

**Result: ✅ PASS**

---

## 12. Get Offchain Schema Definition

**`GET /definitions/offchain-schemas/:id`**

### Not Found — `404`
```json
{ "error": "Offchain schema definition not found" }
```

**Result: ✅ PASS** (no offchain schemas seeded; 404 path verified)

---

## 13. Create Team RBAC Matrix (Definitions layer)

**`POST /definitions/team-rbac-matrix`**

### Request
```bash
curl -X POST http://localhost:3001/api/v1/definitions/team-rbac-matrix \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "Content-Type: application/json" \
  -d '{
    "superAppId": "d39059d121cc4f1cb918",
    "smId": "public:0x94a7d022...",
    "smName": "Invoice SM",
    "version": "1.0.0",
    "permissions": [
      {
        "state": "Invoice",
        "subState": "Bosch",
        "microState": null,
        "access": { "Consignee.Admin": "RW", "Consignee.OSD4": "RO", "FF.FF": "N/A" }
      }
    ]
  }'
```

### Response — `201 Created`
```json
{
  "_id": "d39059d1:public:0x94a7d022...",
  "superAppId": "d39059d121cc4f1cb918",
  "smId": "public:0x94a7d022...",
  "smName": "Invoice SM",
  "permissions": [...],
  "version": "1.0.0",
  "createdAt": 1772798605219,
  "updatedAt": 1772798605219
}
```

**Result: ✅ PASS**

### Notes
- `_id` format: `{superAppId[0:8]}:{smId}`
- Pre-seeded matrices in DB use a different format (`{fullId}_{smId}`) — seeding inconsistency, not a code bug
- `smName` auto-resolved from `onchain_sm_definitions` if not provided in body

---

## 14. List Team RBAC Matrix

**`GET /definitions/team-rbac-matrix/:superAppId`**

### Response — `200 OK`
```json
[
  { "_id": "d39059d121cc4f1cb918_public:0xe1ec34...", "smName": "Shipment Booking" },
  { "_id": "d39059d121cc4f1cb918_public:0x39388e...", "smName": "Shipment Tracker" },
  ...
  { "_id": "d39059d1:public:0x94a7d0...",            "smName": "Invoice SM" }
]
```

**Result: ✅ PASS** (11 entries including newly created one)

---

## 15. Get Team RBAC Matrix

**`GET /definitions/team-rbac-matrix/:superAppId/:smId`**

### Response — `200 OK`
```json
{
  "_id": "d39059d1:public:0x94a7d022...",
  "smName": "Invoice SM",
  "permissions": [{ "state": "Invoice", "subState": "Bosch", "access": {...} }]
}
```

**Result: ✅ PASS**

### Not Found — `404`
```json
{ "error": "Team RBAC matrix not found" }
```
**Result: ✅ PASS**

---

## 16. Update Team RBAC Matrix

**`PUT /definitions/team-rbac-matrix/:superAppId/:smId`**

### Request
```bash
curl -X PUT "http://localhost:3001/api/v1/definitions/team-rbac-matrix/d39059d121cc4f1cb918/public%3A0x94a7d022..." \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "permissions": [{ "state": "Invoice", "subState": "Bosch", "microState": null, "access": { "Consignee.Admin": "RW", "Consignee.OSD4": "RW", "FF.FF": "RO" } }] }'
```

### Response — `200 OK`
```json
{
  "_id": "d39059d1:public:0x94a7d022...",
  "permissions": [{ "access": { "Consignee.Admin": "RW", "Consignee.OSD4": "RW", "FF.FF": "RO" } }]
}
```

**Result: ✅ PASS**

### Notes
- Only `permissions` array is updatable via `UpdateTeamRbacMatrixSchema`
- `updatedAt` refreshed on update
