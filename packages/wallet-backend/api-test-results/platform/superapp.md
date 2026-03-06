# Platform — SuperApp APIs

**Base URL:** `http://localhost:3001/api/v1`
**Test Date:** 2026-03-06
**Test User:** `admin@bosch5.com` / paramId: `0x996fc8177dFD5839987606Ff8504D0008166BdE8`
**Test Workspace:** `bosch-test2`
**SuperApp used:** `d39059d121cc4f1cb918` (Bosch EXIM)

---

## 1. Install SuperApp

**`POST /superapp/install`**

### Request
```bash
curl -X POST http://localhost:3001/api/v1/superapp/install \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2" \
  -H "Content-Type: application/json" \
  -d '{"superAppId": "d39059d121cc4f1cb918", "orgName": "Bosch GmbH"}'
```

```json
{ "superAppId": "d39059d121cc4f1cb918", "orgName": "Bosch GmbH" }
```

### Response — `201 Created`
```json
{
  "_id": "d39059d121cc4f1cb918",
  "name": "Bosch EXIM",
  "status": "active",
  "paramId": "0x996fc8177dFD5839987606Ff8504D0008166BdE8",
  "installedAt": 1772799741620
}
```

**Result: ✅ PASS**

### Not Found — `404`
```json
{ "error": "SuperApp definition not found" }
```
**Result: ✅ PASS**

### Notes
- 6-step install process:
  1. Reads `param_definitions.superapp_definitions`
  2. Reads all linked `team_rbac_matrix` docs
  3. Writes `{workspace}.installed_superapps`
  4. Creates sponsor org in `{sappDb}.organizations` (`isSponsorOrg: true`)
  5. Copies all RBAC matrices into `{sappDb}.team_rbac_matrix`
  6. Appends workspace to caller's `subdomain_users.subdomains`
- `orgName` optional — falls back to caller's name from `subdomain_users`
- `sponsorRole` read from `superapp_definitions.sponsor` (not from request body)
- Sponsor org `_id` format: `org:{superAppId}:{role}:{paramId[2:22]}` (4-part, no partnerId)
- Idempotent — uses `upsert: true` on all writes

---

## 2. List Installed SuperApps

**`GET /superapp`**

### Request
```bash
curl http://localhost:3001/api/v1/superapp \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK`
```json
[
  {
    "_id": "d39059d121cc4f1cb918",
    "name": "Bosch EXIM",
    "version": "1.0.0",
    "sponsor": "Consignee",
    "status": "active",
    "installedAt": 1772799741620
  }
]
```

**Result: ✅ PASS**

### Notes
- Returns projected fields only: `_id, name, version, sponsor, status, installedAt`
- Full doc available via `GET /superapp/:superAppId`

---

## 3. Get Installed SuperApp

**`GET /superapp/:superAppId`**

### Request
```bash
curl http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918 \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK`
```json
{
  "_id": "d39059d121cc4f1cb918",
  "name": "Bosch EXIM",
  "status": "active",
  "sponsor": "Consignee",
  "roles": [...],
  "linkedSMs": [...],
  "orgs": {
    "Consignee": [
      {
        "_id": "org:d39059d121cc4f1cb918:Consignee:996fc8177dFD58399876",
        "isSponsorOrg": true,
        "org": { "paramId": "0x996fc8177dFD5839987606Ff8504D0008166BdE8", "name": "Bosch GmbH" },
        "orgAdmin": null,
        "role": "Consignee",
        "status": "active"
      }
    ]
  }
}
```

**Result: ✅ PASS**

### Not Found — `404`
```json
{ "error": "SuperApp not found" }
```
**Result: ✅ PASS**

### Notes
- Full `installed_superapps` doc merged with `orgs` grouped by role
- `orgs` is a `Record<role, org[]>` — sponsor org automatically present after install

---

## 4. Update SuperApp Status

**`PUT /superapp/:superAppId/status`**

### Request
```bash
curl -X PUT http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/status \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2" \
  -H "Content-Type: application/json" \
  -d '{"status": "suspended"}'
```

### Response — `200 OK`
```json
{ "_id": "d39059d121cc4f1cb918", "status": "suspended" }
```

**Result: ✅ PASS** (suspended → active restore also verified ✅)

### Notes
- Returns minimal `{ _id, status }` — not the full document
- Any string is accepted as status (no enum validation in handler)

---

## 5. Manifest SuperApp (batch onboard)

**`POST /superapp/:superAppId/manifest`**

### Request
```bash
curl -X POST http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/manifest \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2" \
  -H "Content-Type: application/json" \
  -d '{
    "roles": [
      {
        "role": "FF",
        "paramId": "0x1234567890abcdef1234567890abcdef12345678",
        "orgName": "DHL Freight",
        "orgAdmin": "admin@dhl.com",
        "partnerId": "DHL001",
        "users": [
          {
            "email": "ops@dhl.com",
            "name": "DHL Ops",
            "plantTeams": [{ "plant": "1810", "teams": ["FF"] }],
            "isOrgAdmin": false
          }
        ]
      }
    ]
  }'
```

### Response — `201 Created`
```json
{
  "onboarded": [
    { "role": "FF", "paramId": "0x1234567890abcdef1234567890abcdef12345678", "orgName": "DHL Freight" }
  ],
  "users": [
    { "email": "ops@dhl.com", "userId": "ed7e624e3f61cef745b6fe96e3ad625aa40927f43c91369d98095f5858c18d18" }
  ]
}
```

**Result: ✅ PASS**

### Verified after manifest
- `GET /superapp/:superAppId` now shows `orgs: { Consignee: [...], FF: [...] }` ✅
- FF org `_id`: `org:{superAppId}:FF:{orgParamId[2:22]}:{partnerId}` (5-part with partnerId) ✅
- FF user `_id`: `user:{superAppId}:{userId}:{partnerId}` (vendor format) ✅

### Notes
- Atomic — on any failure, all created orgs and app_users are rolled back
- Per-role: upserts org, registers orgAdmin in `subdomain_users`, creates `app_users` docs for each user
- Sponsor org `_id`: 4-part (no partnerId). Partner org `_id`: 5-part (with partnerId)
- `userId = SHA256(email.toLowerCase())`

### Stored Values
| Key | Value |
|-----|-------|
| `superAppId` | `d39059d121cc4f1cb918` |
| `workspace` | `bosch-test2` |
