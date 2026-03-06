# Platform — Profile APIs

**Base URL:** `http://localhost:3001/api/v1`
**Test Date:** 2026-03-06
**Test User:** `admin@bosch5.com` / paramId: `0x996fc8177dFD5839987606Ff8504D0008166BdE8`

---

## 1. Get Profile

**`GET /profile`**

### Request
```bash
curl http://localhost:3001/api/v1/profile \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8"
```

### Response — `200 OK`
```json
{
  "user": {
    "userId": "a785000a2774dadde1f4c547ac9801e7c0856a6f6594fa2f4abb41e99a84db50",
    "email": "admin@bosch5.com",
    "name": "Admin Bosch",
    "subdomains": ["bosch-5", "bosch-test", "bosch-test2"]
  },
  "org": null
}
```

**Result: ✅ PASS**

### Notes
- `X-Workspace` and `X-SuperApp-ID` are optional — when both provided, `org` field is enriched with caller's org doc(s) from the SuperApp DB
- Without workspace+superapp context, `org` is always `null`
- Skips `platformContextMiddleware` — safe to call immediately after login with no workspace selected

---

## 2. Get User Profile

**`GET /user/profile`**

### Request
```bash
curl http://localhost:3001/api/v1/user/profile \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8"
```

### Response — `200 OK`
```json
{
  "userId": "a785000a2774dadde1f4c547ac9801e7c0856a6f6594fa2f4abb41e99a84db50",
  "email": "admin@bosch5.com",
  "name": "Admin Bosch",
  "subdomains": ["bosch-5", "bosch-test", "bosch-test2"]
}
```

**Result: ✅ PASS**

### Notes
- Flat shape (no `user` wrapper) — differs from `GET /profile`
- Returns `null` for `name` if not yet set (empty profile for new users)

---

## 3. Update User Profile

**`PUT /user/profile`**

### Request
```bash
curl -X PUT http://localhost:3001/api/v1/user/profile \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin Bosch"}'
```

```json
{ "name": "Admin Bosch" }
```

### Response — `200 OK`
```json
{
  "_id": "user:a785000a2774dadde1f4c547ac9801e7c0856a6f6594fa2f4abb41e99a84db50",
  "userId": "a785000a2774dadde1f4c547ac9801e7c0856a6f6594fa2f4abb41e99a84db50",
  "email": "admin@bosch5.com",
  "name": "Admin Bosch",
  "paramId": "0x996fc8177dFD5839987606Ff8504D0008166BdE8",
  "subdomains": ["bosch-5", "bosch-test", "bosch-test2"],
  "createdAt": 1772718519570,
  "updatedAt": 1772797427701
}
```

**Result: ✅ PASS**

### Not Found — `404`
```json
{ "error": "User profile not found" }
```
(Returned if the user has no `subdomain_users` record yet)

### Notes
- Only `name` is updatable (via `UpdateProfileSchema`)
- Returns full updated `param_saas.subdomain_users` document
- `updatedAt` reflects update timestamp
- Verified: subsequent `GET /user/profile` shows updated name ✅
