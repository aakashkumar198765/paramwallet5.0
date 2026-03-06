# Platform — Workspace APIs

**Base URL:** `http://localhost:3001/api/v1`
**Test Date:** 2026-03-06
**Test User:** `admin@bosch5.com` / paramId: `0x996fc8177dFD5839987606Ff8504D0008166BdE8`

---

## 1. List Workspaces

**`GET /workspace/list`**

### Request
```bash
curl http://localhost:3001/api/v1/workspace/list \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8"
```

### Response — `200 OK`
```json
[
  { "subdomain": "bosch-5",     "workspaceName": "Bosch-5.0" },
  { "subdomain": "bosch-test",  "workspaceName": "Bosch Test Workspace" },
  { "subdomain": "bosch-test2", "workspaceName": "Bosch Test 2" }
]
```

**Result: ✅ PASS**

### Notes
- Returns only workspaces the caller belongs to (via `subdomain_users.subdomains[]`)
- `_id` excluded from projection (`_id: 0`) — fixed during test
- Empty array `[]` returned when user has no workspaces

---

## 2. Get Workspace

**`GET /workspace`**

### Request
```bash
curl http://localhost:3001/api/v1/workspace \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK`
```json
{
  "_id": "bosch-test2",
  "subdomain": "bosch-test2",
  "workspaceName": "Bosch Test 2",
  "ownerParamId": "0x996fc8177dFD5839987606Ff8504D0008166BdE8",
  "ownerOrgName": "Bosch GmbH",
  "createdAt": 1772794902281,
  "updatedAt": 1772794902281,
  "status": "active"
}
```

**Result: ✅ PASS**

### Not Found — `404`
```json
{ "error": "Workspace not found" }
```
**Result: ✅ PASS**

### Notes
- Requires `X-Workspace` header — `400` without it
- Returns full `param_saas.subdomains` document (no field filtering)

---

## 3. Create Workspace

**`POST /workspace/create`**

### Request
```bash
curl -X POST http://localhost:3001/api/v1/workspace/create \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "bosch-test2",
    "workspaceName": "Bosch Test 2",
    "ownerOrgName": "Bosch GmbH"
  }'
```

```json
{
  "subdomain": "bosch-test2",
  "workspaceName": "Bosch Test 2",
  "ownerOrgName": "Bosch GmbH"
}
```

### Response — `201 Created`
```json
{
  "subdomain": "bosch-test2",
  "workspaceName": "Bosch Test 2",
  "createdAt": 1772794902281
}
```

**Result: ✅ PASS**

### Duplicate Subdomain — `409 Conflict`
```json
{ "error": "Workspace with this subdomain already exists" }
```

**Result: ✅ PASS**

### Notes
- `exchangeParamId` removed — not needed
- Creates doc in `param_saas.subdomains` with `_id = subdomain`
- Adds subdomain to caller's `param_saas.subdomain_users` record
- Initialises workspace DB with sentinel document in `_meta` collection
- `ownerOrgName` optional — defaults to `''` if not provided

### Stored Values
| Key | Value |
|-----|-------|
| `subdomain` | `bosch-test2` |

---

## 4. Update Workspace

**`PUT /workspace`**

### Request
```bash
curl -X PUT http://localhost:3001/api/v1/workspace \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2" \
  -H "Content-Type: application/json" \
  -d '{"workspaceName": "Bosch Test 2 Updated"}'
```

```json
{ "workspaceName": "Bosch Test 2 Updated" }
```

### Response — `200 OK`
```json
{
  "_id": "bosch-test2",
  "subdomain": "bosch-test2",
  "workspaceName": "Bosch Test 2 Updated",
  "ownerParamId": "0x996fc8177dFD5839987606Ff8504D0008166BdE8",
  "ownerOrgName": "Bosch GmbH",
  "createdAt": 1772794902281,
  "updatedAt": 1772795441570,
  "status": "active"
}
```

**Result: ✅ PASS**

### Not Found — `404`
```json
{ "error": "Workspace not found" }
```
**Result: ✅ PASS**

### Notes
- Requires `X-Workspace` header — `400` without it
- Only `workspaceName` is updatable
- Returns full updated `param_saas.subdomains` document (no field filtering)
- `updatedAt` reflects the update timestamp

---

## 5. List Plants

**`GET /workspace/plants`**

### Request
```bash
curl http://localhost:3001/api/v1/workspace/plants \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK` (empty)
```json
[]
```

### Response — `200 OK` (with plants)
```json
[
  {
    "_id": "plant:1810",
    "code": "1810",
    "name": "Stuttgart Plant",
    "paramId": null,
    "location": "Stuttgart, Germany",
    "isActive": true,
    "createdAt": 1772795568860,
    "updatedAt": 1772795568860
  }
]
```

**Result: ✅ PASS**

### Notes
- Filters `isActive: { $ne: false }` — soft-deleted plants are excluded
- Returns full plant documents (no field projection)

---

## 6. Create Plant

**`POST /workspace/plants`**

### Request
```bash
curl -X POST http://localhost:3001/api/v1/workspace/plants \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2" \
  -H "Content-Type: application/json" \
  -d '{"code": "1810", "name": "Stuttgart Plant", "location": "Stuttgart, Germany"}'
```

```json
{ "code": "1810", "name": "Stuttgart Plant", "location": "Stuttgart, Germany" }
```

### Response — `201 Created`
```json
{
  "_id": "plant:1810",
  "code": "1810",
  "name": "Stuttgart Plant",
  "paramId": null,
  "location": "Stuttgart, Germany",
  "isActive": true,
  "createdAt": 1772795568860,
  "updatedAt": 1772795568860
}
```

**Result: ✅ PASS**

### Notes
- `_id` is `plant:{code}`
- `paramId` and `location` are optional — default to `null`
- `isActive` always set to `true` on create

---

## 7. Update Plant

**`PUT /workspace/plants/:code`**

### Request
```bash
curl -X PUT http://localhost:3001/api/v1/workspace/plants/1810 \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2" \
  -H "Content-Type: application/json" \
  -d '{"name": "Stuttgart Main Plant", "location": "Stuttgart, DE"}'
```

### Response — `200 OK`
```json
{
  "_id": "plant:1810",
  "code": "1810",
  "name": "Stuttgart Main Plant",
  "paramId": null,
  "location": "Stuttgart, DE",
  "isActive": true,
  "createdAt": 1772795568860,
  "updatedAt": 1772795613199
}
```

**Result: ✅ PASS**

### Not Found — `404`
```json
{ "error": "Plant not found" }
```
**Result: ✅ PASS**

### Notes
- Only `name` and `location` are updatable
- Returns full updated plant document

---

## 8. Delete Plant (soft delete)

**`DELETE /workspace/plants/:code`**

### Request
```bash
curl -X DELETE http://localhost:3001/api/v1/workspace/plants/1810 \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK`
```json
{ "code": "1810", "isActive": false }
```

**Result: ✅ PASS**

### Not Found — `404`
```json
{ "error": "Plant not found" }
```
**Result: ✅ PASS**

### Notes
- Soft delete — sets `isActive: false` (record stays in DB)
- Plant disappears from `GET /workspace/plants` list after deletion
- Response is minimal `{ code, isActive }` — not the full document
