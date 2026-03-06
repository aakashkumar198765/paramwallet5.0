# Auth — Session Flow

**Base URL:** `http://localhost:3001/api/v1`
**Test Date:** 2026-03-06
**paramId used:** `0x996fc8177dFD5839987606Ff8504D0008166BdE8`

---

## 1. Refresh Token

**`POST /auth/refresh`**

### Request
```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -d '{"refreshToken": "a3510878-561b-4f02-9cf8-b8c7b7d3e322"}'
```

```json
{
  "refreshToken": "a3510878-561b-4f02-9cf8-b8c7b7d3e322"
}
```

**Headers required:** `X-Param-ID`

### Response — `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "d0e638be-7594-455c-8a16-047efa5adfd9",
  "expiresAt": 1772797159102,
  "user": {
    "userId": "a785000a2774dadde1f4c547ac9801e7c0856a6f6594fa2f4abb41e99a84db50",
    "email": "admin@bosch5.com",
    "paramId": "0x996fc8177dFD5839987606Ff8504D0008166BdE8"
  }
}
```

**Result: ✅ PASS** (re-verified after sessions collection change)

### Session Rotation Verified
Old refresh token reused after rotation:
```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -d '{"refreshToken": "a3510878-561b-4f02-9cf8-b8c7b7d3e322"}'
# → 401 { "error": "Invalid refresh token" }
```
**Result: ✅ Old token correctly rejected after rotation**

### Notes
- Issues a brand new `token` + `refreshToken` pair on each call
- Old session document deleted, new one inserted (rotation)
- `user` block includes `paramId` (unlike OTP verify which omits it from `user`)
- `X-Param-ID` header is required — 401 without it

---

---

## 2. Logout

**`POST /auth/logout`**

### Request
```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8"
```

**Headers required:** `Authorization: Bearer <token>`, `X-Param-ID`

### Response — `200 OK`
```json
{ "status": "logged_out" }
```

**Result: ✅ PASS**

### Token Invalidation Verified
Reusing the same token after logout:
```bash
# → 401 { "error": "Session not found or expired" }
```
**Result: ✅ Token correctly rejected after logout** (re-verified after sessions collection change)

---

## Stored Values (updated after refresh)
| Key | Value |
|-----|-------|
| `token` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (new) |
| `refreshToken` | `d0e638be-7594-455c-8a16-047efa5adfd9` (new) |
| `userId` | `a785000a2774dadde1f4c547ac9801e7c0856a6f6594fa2f4abb41e99a84db50` |
| `paramId` | `0x996fc8177dFD5839987606Ff8504D0008166BdE8` |
| `email` | `admin@bosch5.com` |
