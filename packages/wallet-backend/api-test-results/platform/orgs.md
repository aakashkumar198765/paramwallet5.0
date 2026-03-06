# Platform — Orgs / Partners APIs

**Base URL:** `http://localhost:3001/api/v1`
**Test Date:** 2026-03-06
**Test User:** `admin@bosch5.com` / paramId: `0x996fc8177dFD5839987606Ff8504D0008166BdE8`
**Test Workspace:** `bosch-test2`
**SuperApp:** `d39059d121cc4f1cb918` (Bosch EXIM)

**State entering tests:**
- Consignee org (sponsor) — created during `POST /superapp/install`
- FF org (DHL Freight, partnerId: DHL001) — created during `POST /superapp/manifest`

---

## 1. Get Caller's Org Profile

**`GET /superapp/:superAppId/org/profile`**

### Request
```bash
curl http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/org/profile \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK` (sponsor org)
```json
{
  "_id": "org:d39059d121cc4f1cb918:Consignee:996fc8177dFD58399876",
  "role": "Consignee",
  "isSponsorOrg": true,
  "org": { "paramId": "0x996fc8177dFD5839987606Ff8504D0008166BdE8", "name": "Bosch GmbH" },
  "orgAdmin": null,
  "status": "active",
  "superAppId": "d39059d121cc4f1cb918"
}
```

**Result: ✅ PASS**

### Notes
- Looks up by `org.paramId = callerParamId`
- Optional `?partnerId=` query param — returns single vendor org if provided
- Sponsor has no `partnerId` so single doc returned directly
- Returns `404` if caller has no org in this SuperApp

---

## 2. List All Orgs

**`GET /superapp/:superAppId/orgs`**

### Request
```bash
curl http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/orgs \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK`
```json
[
  {
    "_id": "org:d39059d121cc4f1cb918:Consignee:996fc8177dFD58399876",
    "role": "Consignee",
    "isSponsorOrg": true,
    "org": { "paramId": "0x996fc8177dFD5839987606Ff8504D0008166BdE8", "name": "Bosch GmbH" }
  },
  {
    "_id": "org:d39059d121cc4f1cb918:FF:1234567890abcdef1234:DHL001",
    "role": "FF",
    "isSponsorOrg": false,
    "org": { "paramId": "0x1234...", "name": "DHL Freight", "partnerId": "DHL001" }
  }
]
```

**Result: ✅ PASS**

### Notes
- Returns all orgs across all roles (no filtering)
- No pagination — returns full array

---

## 3. List Orgs by Role

**`GET /superapp/:superAppId/orgs/:role`**

### Request
```bash
curl http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/orgs/FF \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK`
```json
[
  {
    "_id": "org:d39059d121cc4f1cb918:FF:1234567890abcdef1234:DHL001",
    "org": { "name": "DHL Freight", "partnerId": "DHL001" },
    "status": "active"
  }
]
```

**Result: ✅ PASS**

### Empty Role — `200 OK` with `[]`
```bash
# GET /orgs/CHA (before any CHA was onboarded)
[]
```
**Result: ✅ PASS**

---

## 4. Onboard Partner (REST override)

**`POST /superapp/:superAppId/partners/onboard`**

### Request
```bash
curl -X POST http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/partners/onboard \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "CHA",
    "org": {
      "paramId": "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
      "name": "Customs House Alpha",
      "partnerId": "CHA001",
      "taxId": "TAX123",
      "legalName": "Customs House Alpha Pvt Ltd"
    },
    "orgAdmin": "admin@cha.com",
    "plants": [
      { "code": "2001", "name": "Mumbai Port", "location": "Mumbai" }
    ]
  }'
```

### Response — `201 Created`
```json
{
  "_id": "org:d39059d121cc4f1cb918:CHA:ABCDEF1234567890ABCD:CHA001",
  "role": "CHA",
  "isSponsorOrg": false,
  "org": {
    "paramId": "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
    "name": "Customs House Alpha",
    "partnerId": "CHA001",
    "taxId": "TAX123",
    "legalName": "Customs House Alpha Pvt Ltd"
  },
  "orgAdmin": "admin@cha.com",
  "status": "active"
}
```

**Result: ✅ PASS**

### Duplicate — `409 Conflict`
```json
{ "error": "Partner with this role and partnerId already exists" }
```
**Result: ✅ PASS**

### Notes
- 4-step process: creates org, upserts plants in workspace DB, registers orgAdmin in `subdomain_users`, creates `app_users` doc for orgAdmin
- Org `_id` format: `org:{superAppId}:{role}:{paramId[2:22]}:{partnerId}` (5-part)
- `orgAdmin` gets `isOrgAdmin: true` in `app_users`
- Conflict check: `role + org.partnerId` must be unique
- NATS-driven path also exists (`partnerLifecycleHandler`) — REST is the admin override

---

## 5. Update Org Status

**`PUT /superapp/:superAppId/orgs/:role/:paramId/status`**

### Request
```bash
curl -X PUT "http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/orgs/CHA/0xABCDEF.../status" \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2" \
  -H "Content-Type: application/json" \
  -d '{"status": "suspended"}'
```

### Response — `200 OK`
```json
{ "role": "CHA", "paramId": "0xABCDEF1234567890ABCDEF1234567890ABCDEF12", "status": "suspended" }
```

**Result: ✅ PASS** (suspended → active restore also verified ✅)

### Notes
- Uses `updateMany` on `{ org.paramId, role }` — updates all orgs for this paramId in this role (handles multiple vendor IDs)
- Returns minimal `{ role, paramId, status }` — not the full document
- No 404 — returns `200` even if no matching org found (MongoDB `updateMany` returns 0 modified but no error)
