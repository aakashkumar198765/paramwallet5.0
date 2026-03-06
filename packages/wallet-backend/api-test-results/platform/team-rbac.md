# Platform — Team RBAC Matrix (SuperApp Level) APIs

**Base URL:** `http://localhost:3001/api/v1`
**Test Date:** 2026-03-06
**Test User:** `admin@bosch5.com` / paramId: `0x996fc8177dFD5839987606Ff8504D0008166BdE8`
**Test Workspace:** `bosch-test2`
**SuperApp:** `d39059d121cc4f1cb918` (Bosch EXIM)

**Note:** These are the workspace-level (installed SuperApp) RBAC matrices — distinct from the definition-level matrices under `/definitions/team-rbac-matrix`.

**State entering tests:**
- SuperApp installed → 10 RBAC matrices auto-copied from `param_definitions` into sapp DB during `installSuperApp`

---

## 1. List Team RBAC Matrix

**`GET /superapp/:superAppId/team-rbac-matrix`**

### Request
```bash
curl http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/team-rbac-matrix \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK`
```json
[
  { "_id": "d39059d1:public:0xe1ec34...", "smName": "Shipment Booking" },
  { "_id": "d39059d1:public:0x39388e...", "smName": "Shipment Tracker" },
  { "_id": "d39059d1:public:0xbad94e...", "smName": "Customs Clearance" },
  { "_id": "d39059d1:public:0x069cdb...", "smName": "Bonded Shipment" },
  { "_id": "d39059d1:public:0x0a28b0...", "smName": "HSN Queries" },
  { "_id": "d39059d1:public:0x94a7d0...", "smName": "Invoice SM" },
  { "_id": "d39059d1:public:0x8e0498...", "smName": "High Sea Sales" },
  { "_id": "d39059d1:public:0x5de6f8...", "smName": "Bad Cost" },
  { "_id": "d39059d1:public:0x52a6ae...", "smName": "Part Master" },
  { "_id": "d39059d1:public:0xa459fb...", "smName": "Partner Empanelment App" }
]
```

**Result: ✅ PASS** (10 matrices copied from param_definitions during install)

### Notes
- Returns full array from sapp DB `team_rbac_matrix` collection — no filtering, no wrapper
- `_id` format: `{superAppId[0:8]}:{smId}` — consistent with handler format
- All 10 matrices were populated by `installSuperApp` step 5 (copy RBAC matrices)

---

## 2. Get Team RBAC Matrix

**`GET /superapp/:superAppId/team-rbac-matrix/:smId`**

### Request
```bash
# smId must be URL-encoded (contains colons)
curl "http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/team-rbac-matrix/public%3A0x94a7d022351c54007630239187ec461b84a9f3a6b6961de7ad496ec1c1012e3a" \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2"
```

### Response — `200 OK`
```json
{
  "_id": "d39059d1:public:0x94a7d022351c54007630239187ec461b84a9f3a6b6961de7ad496ec1c1012e3a",
  "smName": "Invoice SM",
  "permissions": [
    {
      "state": "Invoice",
      "subState": "Bosch",
      "microState": null,
      "access": {
        "Consignee.Admin": "RW",
        "Consignee.OSD4": "RW",
        "FF.FF": "RO"
      }
    }
  ]
}
```

**Result: ✅ PASS**

### Not Found — `404`
```json
{ "error": "Team RBAC matrix not found" }
```
**Result: ✅ PASS**

### Notes
- Looks up by computed `_id = {superAppId[0:8]}:{smId}` — handler reconstructs the key from path params
- `smId` values containing `:` (all onchain SM IDs) must be URL-encoded as `%3A` in path

---

## 3. Update Team RBAC Matrix

**`PUT /superapp/:superAppId/team-rbac-matrix/:smId`**

### Request
```bash
curl -X PUT "http://localhost:3001/api/v1/superapp/d39059d121cc4f1cb918/team-rbac-matrix/public%3A0x94a7d022..." \
  -H "Authorization: Bearer <token>" \
  -H "X-Param-ID: 0x996fc8177dFD5839987606Ff8504D0008166BdE8" \
  -H "X-Workspace: bosch-test2" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      {
        "state": "Invoice",
        "subState": "Bosch",
        "microState": null,
        "access": {
          "Consignee.Admin": "RW",
          "Consignee.OSD4": "RW",
          "FF.FF": "RO",
          "CHA.CHA": "RO"
        }
      }
    ]
  }'
```

### Response — `200 OK`
```json
{
  "_id": "d39059d1:public:0x94a7d022...",
  "smName": "Invoice SM",
  "permissions": [
    {
      "state": "Invoice",
      "subState": "Bosch",
      "microState": null,
      "access": {
        "Consignee.Admin": "RW",
        "Consignee.OSD4": "RW",
        "FF.FF": "RO",
        "CHA.CHA": "RO"
      }
    }
  ],
  "customizedAt": 1772801384460
}
```

**Result: ✅ PASS**

### Notes
- Only `permissions` array is updatable — full replacement (not merge)
- Sets `customizedAt = Date.now()` in addition to `updatedAt` — signals workspace customization over copied definition
- Returns full updated doc via `findOneAndUpdate` with `returnDocument: 'after'`
- `404` if smId not found in sapp DB
