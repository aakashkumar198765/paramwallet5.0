# Platform — Users APIs

**Base URL:** `http://localhost:3001/api/v1`
**Test Date:** 2026-03-06
**Test User:** `admin@bosch5.com` / paramId: `0x996fc8177dFD5839987606Ff8504D0008166BdE8`
**Test Workspace:** `bosch-test2`
**SuperApp:** `d39059d121cc4f1cb918` (Bosch EXIM)
**Role tested:** `CHA` (org onboarded with partnerId `CHA001`)

**State entering tests:**
- Plant `2001` (Mumbai Port) exists in workspace
- CHA org onboarded with `POST /partners/onboard` (partnerId: CHA001)

---

## 1. Create Users

**`POST /superapp/:superAppId/roles/:role/users`**

### Request
```bash
curl -X POST http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/roles/CHA/users \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerId": "CHA001",
    "users": [
      {
        "email": "ops@cha.com",
        "name": "CHA Ops",
        "plantTeams": [{ "plant": "2001", "teams": ["CHA"] }],
        "isOrgAdmin": false
      },
      {
        "email": "manager@cha.com",
        "name": "CHA Manager",
        "plantTeams": [{ "plant": "2001", "teams": ["CHA"] }],
        "isOrgAdmin": true
      }
    ]
  }'
```

### Response — `201 Created`
```json
[
  {
    "_id": "user:d39059d121cc4f1cb918:70dfdd45ab25827361d78d1d8911932cc0938957b14b90cd17823a1530f2f745:CHA001",
    "userId": "70dfdd45ab25827361d78d1d8911932cc0938957b14b90cd17823a1530f2f745",
    "email": "ops@cha.com",
    "name": "CHA Ops",
    "superAppId": "d39059d121cc4f1cb918",
    "role": "CHA",
    "orgParamId": "0x996fc8177dFD5839987606Ff8504D0008166BdE8",
    "partnerId": "CHA001",
    "plantTeams": [{ "plant": "2001", "teams": ["CHA"] }],
    "isOrgAdmin": false,
    "status": "active",
    "addedAt": 1772801168575,
    "addedBy": "0x996fc8177dFD5839987606Ff8504D0008166BdE8",
    "createdAt": 1772801168575,
    "updatedAt": 1772801168575
  },
  {
    "_id": "user:d39059d121cc4f1cb918:475fb0a53e86f03c10d3948151fc7632884e74672fd9b70491a6dc6ce3c44863:CHA001",
    "userId": "475fb0a53e86f03c10d3948151fc7632884e74672fd9b70491a6dc6ce3c44863",
    "email": "manager@cha.com",
    "name": "CHA Manager",
    ...
    "isOrgAdmin": true
  }
]
```

**Result: ✅ PASS**

### Invalid Plant — `400`
```json
{ "error": "Invalid plants", "missingPlants": ["1810"] }
```
**Result: ✅ PASS** (tested with non-existent plant `1810`)

### Notes
- `userId = SHA256(email.toLowerCase())` — backend computes, never from body
- `_id` format: `user:{superAppId}:{userId}:{partnerId}` (vendor 4-part with partnerId)
- Without `partnerId`: `user:{superAppId}:{userId}` (sponsor 3-part)
- `orgParamId` = caller's paramId (not the org's paramId)
- Also upserts into `param_saas.subdomain_users` (appends workspace to subdomains)
- Plant validation: checks `plants` collection for `plant:{code}` _id format, `isActive: { $ne: false }`
- Team validation: validated against sapp's `team_rbac_matrix` if RBAC docs exist
- Upsert behavior: `$setOnInsert` — won't overwrite existing users on duplicate email

---

## 2. List Users by Role

**`GET /superapp/:superAppId/roles/:role/users`**

### Request
```bash
curl http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/roles/CHA/users \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK`
```json
[
  { "_id": "user:d39059d121cc4f1cb918:91b545a4...:CHA001", ... },
  { "_id": "user:d39059d121cc4f1cb918:70dfdd45...:CHA001", ... },
  { "_id": "user:d39059d121cc4f1cb918:475fb0a5...:CHA001", ... }
]
```

**Result: ✅ PASS** (3 users: 1 from `partners/onboard` + 2 just created)

### Notes
- Returns plain array — no pagination, no wrapper
- Filters by `{ superAppId, role }` — returns all vendor users for role regardless of partnerId

---

## 3. Get User

**`GET /superapp/:superAppId/users/:userId`**

### Request
```bash
# userId = SHA256("ops@cha.com") = 70dfdd45...
curl http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/users/70dfdd45ab25827361d78d1d8911932cc0938957b14b90cd17823a1530f2f745 \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK`
```json
{
  "_id": "user:d39059d121cc4f1cb918:70dfdd45...:CHA001",
  "userId": "70dfdd45...",
  "email": "ops@cha.com",
  "name": "CHA Ops",
  "role": "CHA",
  "partnerId": "CHA001",
  "plantTeams": [{ "plant": "2001", "teams": ["CHA"] }],
  "isOrgAdmin": false,
  "status": "active"
}
```

**Result: ✅ PASS**

### Notes
- Queries `{ userId, superAppId }` — returns single doc if sponsor, array if vendor with multiple partnerIds
- `404` if no matching docs

---

## 4. Update User

**`PUT /superapp/:superAppId/users/:userId`**

### Request
```bash
curl -X PUT "http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/users/70dfdd45..." \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2" \
  -H "Content-Type: application/json" \
  -d '{"isOrgAdmin": true, "status": "active"}'
```

### Response — `200 OK`
```json
{
  "_id": "user:d39059d121cc4f1cb918:70dfdd45...:CHA001",
  "isOrgAdmin": true,
  "status": "active",
  "updatedAt": 1772801229672,
  ...
}
```

**Result: ✅ PASS**

### Notes
- Updatable fields: `plantTeams`, `status`, `isOrgAdmin`
- Returns full updated doc via `findOneAndUpdate` with `returnDocument: 'after'`
- `findOneAndUpdate` matches on `{ userId, superAppId }` — for vendor users with multiple docs, updates the first matched only
- `404` if no match

---

## 5. Delete User (Soft Suspend)

**`DELETE /superapp/:superAppId/users/:userId`**

### Request
```bash
curl -X DELETE "http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/users/70dfdd45..." \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK`
```json
{ "userId": "70dfdd45...", "status": "suspended" }
```

**Result: ✅ PASS**

### Not Found — `404`
```json
{ "error": "User not found" }
```
**Result: ✅ PASS**

### Notes
- Soft delete — sets `status: 'suspended'` via `updateMany` (all docs for this userId)
- Returns minimal `{ userId, status }` — not the full document
- `404` when `matchedCount === 0`
