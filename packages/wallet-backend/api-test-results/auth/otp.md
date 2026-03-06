# Auth — OTP Flow

**Base URL:** `http://localhost:3001/api/v1`
**Test Date:** 2026-03-06
**Test Email:** `admin@bosch5.com`
**Test OTP:** `qwertyui`

---

## 1. Send OTP

**`POST /auth/otp/request`**

### Request
```bash
curl -X POST http://localhost:3001/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@bosch5.com"}'
```

```json
{ "email": "admin@bosch5.com" }
```

### Response — `200 OK`
```json
{ "status": "sent", "message": "OTP sent to email" }
```

**Result: ✅ PASS**

---

## 2. Verify OTP

**`POST /auth/otp/verify`**

### Request
```bash
curl -X POST http://localhost:3001/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@bosch5.com", "otp": "qwertyui"}'
```

```json
{ "email": "admin@bosch5.com", "otp": "qwertyui" }
```

### Response — `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...",
  "refreshToken": "de286fcd-41c3-4dfc-9235-10ef5f0ee90c",
  "expiresAt": 1772796720504,
  "isTermsAndConditionVerified": true,
  "user": {
    "userId": "a785000a2774dadde1f4c547ac9801e7c0856a6f6594fa2f4abb41e99a84db50",
    "email": "admin@bosch5.com"
  },
  "enn": {
    "paramId": "0x996fc8177dFD5839987606Ff8504D0008166BdE8",
    "pennId": "EHPI1668",
    "publicKey": "8c3c9cb81c20cd2bd88821cbbf66f41f3ca7dce00ad31997db0d31e4ef8cd138d52855245c861f6b14289116b709f5ad9ca7b758e3b5a061bb70b45f19b67513"
  }
}
```

**Result: ✅ PASS** (re-verified after sessions collection change)

### Bug Found & Fixed
**Issue:** `enn` block was missing from all responses.

**Root Cause:** CryptoJS (used by ENN server) applies PKCS7 padding even in CTR mode — appending 16 bytes of `\x10` to the plaintext before encryption. Node.js `aes-256-ctr` decrypts correctly but does NOT auto-strip that padding. `JSON.parse` threw `"Unexpected non-whitespace character after JSON at position 2560"` because of the 16 trailing garbage bytes.

**Fix:** Added PKCS7 unpadding in `enn-client.ts → decryptEnnPayload()` — verifies and strips trailing padding bytes after AES-CTR decryption before calling `JSON.parse`.

**File changed:** `src/engines/auth/enn-client.ts`

---

### Stored Values (for use in subsequent tests)
| Key | Value |
|-----|-------|
| `token` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...` |
| `refreshToken` | `de286fcd-41c3-4dfc-9235-10ef5f0ee90c` |
| `userId` | `a785000a2774dadde1f4c547ac9801e7c0856a6f6594fa2f4abb41e99a84db50` |
| `paramId` | `0x996fc8177dFD5839987606Ff8504D0008166BdE8` |
| `pennId` | `EHPI1668` |
| `email` | `admin@bosch5.com` |
