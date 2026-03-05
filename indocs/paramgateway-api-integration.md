# ParamGateway API Integration — Architecture & API Spec

**Version:** 1.0  
**Date:** 2026-03-05  
**Status:** Authoritative. Use for Wallet Frontend integration and application build.

This document describes the ParamGateway API integration for the Wallet Application: its place in the Param 5.0 ecosystem, the pipeline execution model, full API specifications for param definitions (onchain SM, onchain schema, offchain SM, offchain schema), task status polling, MongoDB storage outcomes, and which operations remain stubbed.

---

## Table of Contents

1. [Ecosystem Context](#1-ecosystem-context)
2. [Integration vs Stub Summary](#2-integration-vs-stub-summary)
3. [Monorepo Placement & Folder Structure](#3-monorepo-placement--folder-structure)
4. [Foundational Principles](#4-foundational-principles)
5. [API Base Configuration](#5-api-base-configuration)
6. [Pipeline Execute API — Unified Spec](#6-pipeline-execute-api--unified-spec)
7. [Batch Task Status API](#7-batch-task-status-api)
8. [Onchain SM Definition — Full Spec](#8-onchain-sm-definition--full-spec)
9. [Onchain Schema Definition — Full Spec](#9-onchain-schema-definition--full-spec)
10. [Offchain SM Definition — Full Spec](#10-offchain-sm-definition--full-spec)
11. [Offchain Schema Definition — Full Spec](#11-offchain-schema-definition--full-spec)
12. [MongoDB Storage — Definition Outcomes](#12-mongodb-storage--definition-outcomes)
13. [Stub APIs — Not Yet Documented](#13-stub-apis--not-yet-documented)
14. [Integration Flow & Implementation Notes](#14-integration-flow--implementation-notes)

---

## 1. Ecosystem Context

### 1.1 Where ParamGateway Sits

```
┌─────────────────────────────────────────────────────────────────────┐
│                          APP LAYER                                   │
│  Wallet Console  │  FloForward Apps  │  ParamAI Chat  │  Domain Apps │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP
┌────────────────────────────▼────────────────────────────────────────┐
│                         DATA LAYER                                   │
│                                                                      │
│  ┌──────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ ParamGateway │  │   WALLET BACKEND      │  │  ENN (Auth)      │  │
│  │ (Data IN)    │  │   (Platform + READ)  │  │  (OTP/SSO)       │  │
│  └──────┬───────┘  └───────────┬──────────┘  └──────────────────┘  │
└─────────┼─────────────────────┼──────────────────────────────────────┘
          │ NATS                 │ MongoDB reads/writes
┌─────────▼─────────────────────▼──────────────────────────────────────┐
│                          KERNEL LAYER                                 │
│  NATS JetStream │ paramledger │ gPRM │ SyncFactory │ IPFS             │
└───────────────────────────────────────────────────────────────────────┘
```

### 1.2 What ParamGateway Is

- The **data-in** layer: all definitions (onchain SM, onchain schema, offchain SM, offchain schema) enter the platform via ParamGateway
- The **pipeline orchestrator**: standard system pipelines (`pipe:sys:define-*`) process definition payloads and trigger SyncFactory to write to `param_definitions`
- The **async execution model**: execute returns `batchIds`; clients poll task status to determine completion
- The **single entry point** for on-chain writes: document create, document transition — when documented — will also go through ParamGateway

### 1.3 What ParamGateway Is NOT

- It does **NOT** write directly to MongoDB — SyncFactory writes after processing pipeline events
- It does **NOT** serve reads — Wallet Backend reads from MongoDB
- It does **NOT** own authentication — session/cookie or API key is passed by the caller

---

## 2. Integration vs Stub Summary

| Operation | Status | Notes |
|-----------|--------|-------|
| Onchain SM Definition | **Full integration** | `pipe:sys:define-sm-v1` — execute + poll task status |
| Onchain Schema Definition | **Full integration** | `pipe:sys:define-schema-v1` |
| Offchain SM Definition | **Full integration** | `pipe:sys:define-offchain-sm-v1` |
| Offchain Schema Definition | **Full integration** | `pipe:sys:define-offchain-schema-v1` |
| Onchain document create | **Stub** | Return `{ success: true }`; API not provided |
| Onchain document transition | **Stub** | Return `{ success: true }`; API not provided |
| Offchain registry/config | **Stub** | Return `{ success: true }`; API not provided |

---

## 3. Monorepo Placement & Folder Structure

ParamGateway is called **from the Wallet Frontend only**. The Wallet Backend does not call ParamGateway; it reads from MongoDB (written by SyncFactory).

**Placement in monorepo:**

```
paramplatform_v2/
├── packages/
│   ├── wallet-backend/          # Does NOT call ParamGateway
│   └── wallet-frontend/
│       └── src/
│           └── api/
│               └── paramgateway/    ← ParamGateway integration lives here
│                   ├── client.ts           # Base URL, headers, fetch/axios
│                   ├── executePipeline.ts  # POST pipelines/{id}/execute
│                   ├── getBatchTasks.ts    # GET batches/{batchId}/tasks
│                   ├── definitions/       # Full integration
│                   │   ├── onchainSm.ts
│                   │   ├── onchainSchema.ts
│                   │   ├── offchainSm.ts
│                   │   └── offchainSchema.ts
│                   ├── stubs/             # Stub until API provided
│                   │   ├── documentCreate.ts
│                   │   └── documentTransition.ts
│                   └── types.ts
```

**Environment variable:** `VITE_PARAMGATEWAY_BASE_URL` (e.g. `http://speedtest.param.network:8450`)

---

## 4. Foundational Principles

### P1: Pipeline-Based Definition Creation

All param definitions are created and updated through **standard system pipelines**. The Wallet Frontend does not call a generic "create definition" API — it calls the specific pipeline for each definition type:

| Definition Type | Pipeline ID | MongoDB Collection |
|----------------|-------------|---------------------|
| Onchain SM | `pipe:sys:define-sm-v1` | `param_definitions.onchain_sm_definitions` |
| Onchain Schema | `pipe:sys:define-schema-v1` | `param_definitions.onchain_schema_definitions` |
| Offchain SM | `pipe:sys:define-offchain-sm-v1` | `param_definitions.offchain_sm_definitions` |
| Offchain Schema | `pipe:sys:define-offchain-schema-v1` | `param_definitions.offchain_schema_definitions` |

### P2: Execute → BatchIds → Poll Status

1. **Execute** — `POST /api/pipelines/{pipelineId}/execute?dryRun=false` with a JSON array of definition payloads
2. **Response** — Returns `batchIds[]`; each batch corresponds to one execution
3. **Poll** — `GET /api/batches/{batchId}/tasks` to check task status
4. **Complete** — When `status: "synced"`, SyncFactory has written to MongoDB; `txnId` and other details are available

### P3: Definitions Flow Through Kernel

ParamGateway → NATS → gPRM → paramledger → SyncFactory → MongoDB. The frontend never writes to MongoDB. SyncFactory is the canonical writer for `onchain_sm_definitions`, `onchain_schema_definitions`, `offchain_sm_definitions`, `offchain_schema_definitions`.

---

## 5. API Base Configuration

### 5.1 Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://speedtest.param.network:8450` |
| Production | Configure per deployment |

### 5.2 Required Headers

| Header | Required | Description | Example |
|--------|----------|-------------|---------|
| `Content-Type` | Yes (for POST) | Request body type | `application/json` |
| `X-Gateway-Role` | Yes | User role in gateway | `admin` |
| `X-Workspace` | Yes | Exchange/workspace context | `test-exchange` |

### 5.3 Optional Headers (Session Auth)

| Header | Description |
|--------|-------------|
| `Cookie` | Gateway session cookie (e.g. `gateway-theme=light; gateway-role=admin; mongo-express=...`) |
| `Referer` | Origin URL (e.g. `http://speedtest.param.network:8450/`) |

### 5.4 Pipeline ID URL Encoding

Pipeline IDs contain colons. Use URL-encoded form in the path:

| Pipeline ID | URL-Encoded |
|-------------|-------------|
| `pipe:sys:define-sm-v1` | `pipe%3Asys%3Adefine-sm-v1` |
| `pipe:sys:define-schema-v1` | `pipe%3Asys%3Adefine-schema-v1` |
| `pipe:sys:define-offchain-sm-v1` | `pipe%3Asys%3Adefine-offchain-sm-v1` |
| `pipe:sys:define-offchain-schema-v1` | `pipe%3Asys%3Adefine-offchain-schema-v1` |

---

## 6. Pipeline Execute API — Unified Spec

### 6.1 Endpoint

```
POST {baseUrl}/api/pipelines/{pipelineId}/execute?dryRun=false
```

- `{pipelineId}`: URL-encoded pipeline ID (e.g. `pipe%3Asys%3Adefine-sm-v1`)
- `dryRun`: `false` for real execution; `true` for validation only (no write)

### 6.2 Request

- **Method:** POST
- **Headers:** `Content-Type: application/json`, `X-Gateway-Role`, `X-Workspace`
- **Body:** JSON array of definition objects. One or more items per request.

### 6.3 Response (Success)

```json
{
  "status": "accepted",
  "data": {
    "batchCount": 1,
    "batchIds": ["31838ac9-0a46-445b-8f8a-680e7d201d17"],
    "batchSize": 1,
    "dryRun": false,
    "status": "running",
    "totalDocs": 1
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"accepted"` on success |
| `data.batchIds` | string[] | UUIDs for each batch; use to poll task status |
| `data.batchCount` | number | Number of batches |
| `data.batchSize` | number | Documents per batch |
| `data.status` | string | `"running"` — processing started |
| `data.totalDocs` | number | Total documents in the request |

### 6.4 cURL Example (Generic)

```bash
curl -X POST 'http://speedtest.param.network:8450/api/pipelines/pipe%3Asys%3Adefine-sm-v1/execute?dryRun=false' \
  -H 'Content-Type: application/json' \
  -H 'X-Gateway-Role: admin' \
  -H 'X-Workspace: test-exchange' \
  -d '[{ ... definition payload ... }]'
```

---

## 7. Batch Task Status API

### 7.1 Endpoint

```
GET {baseUrl}/api/batches/{batchId}/tasks
```

### 7.2 Request

- **Method:** GET
- **Headers:** `X-Gateway-Role`, `X-Workspace` (and `Cookie` if using session auth)

### 7.3 Response

```json
{
  "items": [
    {
      "_id": "b5bf4409-fbf9-4d6a-8764-c266033d7bdd-0",
      "batchId": "b5bf4409-fbf9-4d6a-8764-c266033d7bdd",
      "pipelineId": "pipe:sys:define-offchain-schema-v1",
      "index": 0,
      "docNumber": "system-offchain-schema-v1",
      "status": "synced",
      "phase": "submit",
      "txnId": "0x693efaf71777d5b684f210fe37836e1575e84e62b63dfa5b48413c67b0f72ebe",
      "latency": {
        "initMs": 0,
        "collectMs": 0,
        "processMs": 0,
        "submitMs": 0,
        "syncMs": 0,
        "totalMs": 0
      },
      "createdAt": "0001-01-01T00:00:00Z",
      "updatedAt": "2026-03-05T11:44:40.341Z"
    }
  ],
  "total": 1,
  "offset": 0,
  "limit": 50
}
```

### 7.4 Task Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Task ID (batchId-index) |
| `batchId` | string | Batch UUID |
| `pipelineId` | string | Pipeline that processed this task |
| `index` | number | Index within batch |
| `docNumber` | string | Document identifier |
| `status` | string | `"running"` = in progress; `"synced"` = completed |
| `phase` | string | Current phase (e.g. `"submit"`) |
| `txnId` | string | Blockchain transaction ID (when `status: "synced"`) |
| `latency` | object | Timing breakdown (initMs, collectMs, processMs, submitMs, syncMs, totalMs) |
| `createdAt` | string | ISO 8601 |
| `updatedAt` | string | ISO 8601 |

### 7.5 Status Semantics

| Status | Meaning |
|--------|---------|
| `running` | Pipeline is still processing; SyncFactory has not yet written |
| `synced` | Completed; SyncFactory has written to MongoDB; `txnId` available |

### 7.6 cURL Example

```bash
curl 'http://speedtest.param.network:8450/api/batches/b5bf4409-fbf9-4d6a-8764-c266033d7bdd/tasks' \
  -H 'X-Gateway-Role: admin' \
  -H 'X-Workspace: test-exchange'
```

---

## 8. Onchain SM Definition — Full Spec

### 8.1 Pipeline

`pipe:sys:define-sm-v1`

### 8.2 Request

**Endpoint:** `POST {baseUrl}/api/pipelines/pipe%3Asys%3Adefine-sm-v1/execute?dryRun=false`

**Body:** JSON array of onchain SM definition objects.

### 8.3 Request Payload Schema

```javascript
[
  {
    "defId": "public:0x0a28b0081c9e250d35239460f5505754b4713882a97b6c9ee023d4576f7da278",
    "smType": "@sm/Commerce",
    "displayName": "HSN Queries",
    "desc": "HSN Workflow for SaaS EXIM",
    "phaseMapping": {
      "Initiation": ["HSN"],
      "Agreement": [],
      "Execution": [],
      "Settlement": [],
      "Completion": []
    },
    "roles": ["Consignee", "FF", "CHA"],
    "startAt": "HSN",
    "states": {
      "HSN": {
        "desc": "HSN WF",
        "phase": "Initiation",
        "schema": "public:0xa59ea6cb61a5167445f8217521aa6caa3659ecb97769774449fbe0b5796b9776",
        "end": true,
        "owner": ["Consignee"],
        "visibility": ["Consignee", "FF", "CHA"],
        "props": { "edit": true, "flip": false, "diff": true },
        "subStates": {
          "Request": {
            "start": true,
            "owner": ["Consignee"],
            "nextState": "Update"
          },
          "Update": {
            "owner": ["Consignee"],
            "nextState": "Approval",
            "microStates": {
              "PlannerRequest": { "desc": "Planner Request", "owner": ["Consignee"], "nextState": "PlannerUpdate" },
              "PlannerUpdate": { "desc": "Planner Update", "owner": ["Consignee"], "nextState": "TaxRequest" },
              "TaxRequest": { "desc": "Tax Request", "owner": ["Consignee"], "nextState": "TaxUpdate" },
              "TaxUpdate": { "end": true, "desc": "Tax Update", "owner": ["Consignee"] },
              "Request": { "start": true, "desc": "HSN Requested", "owner": ["Consignee"], "nextState": "TechRequest" },
              "TechRequest": { "desc": "Tech Request", "owner": ["Consignee"], "nextState": "TechUpdate" },
              "TechUpdate": { "desc": "Tech Update", "owner": ["Consignee"], "nextState": "PlannerRequest" }
            }
          },
          "Approval": { "end": true, "owner": ["Consignee"] }
        }
      }
    }
  }
]
```

### 8.4 Response

Same as Section 6.3 — `status: "accepted"`, `data.batchIds`, `data.status: "running"`.

### 8.5 MongoDB Storage

SyncFactory writes to `param_definitions.onchain_sm_definitions`. Document structure matches request payload; `_id` = `defId`.

```javascript
{
  "_id": "public:0x0a28b0081c9e250d35239460f5505754b4713882a97b6c9ee023d4576f7da278",
  "defId": "public:0x0a28b0081c9e250d35239460f5505754b4713882a97b6c9ee023d4576f7da278",
  "smType": "@sm/Commerce",
  "displayName": "HSN Queries",
  "desc": "HSN Workflow for SaaS EXIM",
  "phaseMapping": { "Initiation": ["HSN"], "Agreement": [], "Execution": [], "Settlement": [], "Completion": [] },
  "roles": ["Consignee", "FF", "CHA"],
  "startAt": "HSN",
  "states": { /* full states object from request */ }
}
```

---

## 9. Onchain Schema Definition — Full Spec

### 9.1 Pipeline

`pipe:sys:define-schema-v1`

### 9.2 Request

**Endpoint:** `POST {baseUrl}/api/pipelines/pipe%3Asys%3Adefine-schema-v1/execute?dryRun=false`

**Body:** JSON array of onchain schema definition objects.

### 9.3 Request Payload Schema

```javascript
[
  {
    "defId": "public:0x07724ce1e8bf3c01ae5a5cd6f1a29d65752940e6cfab59619087fe7276a4b74a",
    "displayName": "Inbound Shipment",
    "desc": "Field schema for Inbound Shipment",
    "version": "1.0",
    "properties": {
      "DocDetails": {
        "type": "object",
        "required": false,
        "properties": {
          "D_Type": { "type": "string", "required": false, "hidden": true },
          "D_OrderStatus": { "type": "string", "required": false, "desc": "Status", "order": 70 },
          "D_MinimumPaymentDueMinPrice": { "type": "number", "required": false, "hidden": true },
          "D_MinimumPaymentDuePriceCurrency": { "type": "string", "required": false, "pattern": "^[a-zA-Z]{3}$", "hidden": true },
          "D_PaymentMethod": { "type": "string", "required": false, "hidden": true },
          "D_TotalPaymentDueMinPrice": { "type": "number", "required": false, "desc": "Amount", "order": 500 },
          "D_TotalPaymentDuePriceCurrency": { "type": "string", "required": false, "pattern": "^[a-zA-Z]{3}$", "order": 0, "desc": "Currency" },
          "D_OffersAddOn": {
            "type": "array",
            "required": false,
            "desc": "Offer Add On",
            "order": 0,
            "items": [ /* array of object schemas with indexes, order, properties */ ]
          },
          "D_ScheduledPaymentDate": { "type": "date", "required": false, "hidden": true },
          "D_OrderedDate": { "type": "date", "required": false, "desc": "Booking Date", "order": 100 },
          "D_PaymentDueDate": { "type": "date", "required": false, "hidden": true },
          "D_ExpiryDate": { "type": "date", "required": false, "hidden": true },
          "D_PaymentTerms": { "type": "string", "required": false, "enum": ["60", "90"], "desc": "Payment Terms (Days)", "order": 210 },
          "D_ItemCount": { "type": "integer", "required": false, "hidden": true },
          "D_ExpectedDeliveryDate": { "type": "date", "required": false, "hidden": true },
          "D_OrderNumber": { "type": "string", "required": false, "link": "_id", "order": 101, "desc": "EXIM ID" },
          "D_DeliveryAddress": { "type": "string", "required": false, "order": 0, "desc": "Delivery Location" },
          "D_Identifier": { "type": "string", "required": false, "hidden": true }
        }
      }
    }
  }
]
```

**Field semantics:** Each leaf field has `order: N` (shown in UI) or `hidden: true` (stored, not rendered). Groups: `contact` (party), `object` (domain data), `array` (repeating rows with `items.properties`).

### 9.4 Response

Same as Section 6.3.

### 9.5 MongoDB Storage

SyncFactory writes to `param_definitions.onchain_schema_definitions`. Document structure matches request; `_id` = `defId`.

---

## 10. Offchain SM Definition — Full Spec

### 10.1 Pipeline

`pipe:sys:define-offchain-sm-v1`

### 10.2 Request

**Endpoint:** `POST {baseUrl}/api/pipelines/pipe%3Asys%3Adefine-offchain-sm-v1/execute?dryRun=false`

**Body:** JSON array of offchain SM definition objects. Payload shape is the same as onchain SM (defId, smType, displayName, desc, phaseMapping, roles, startAt, states). See Section 6.3 for full structure.

### 10.3 Response

Same as Section 6.3.

### 10.4 MongoDB Storage

SyncFactory writes to `param_definitions.offchain_sm_definitions`. Document structure matches request; `_id` = `defId`. Offchain SM states define collections: `shape: "registry"` → `offchain_registry_{Name}`; `shape: "config"` → `offchain_config_{Name}`.

---

## 11. Offchain Schema Definition — Full Spec

### 11.1 Pipeline

`pipe:sys:define-offchain-schema-v1`

### 11.2 Request

**Endpoint:** `POST {baseUrl}/api/pipelines/pipe%3Asys%3Adefine-offchain-schema-v1/execute?dryRun=false`

**Body:** JSON array of offchain schema definition objects.

### 11.3 Request Payload Schema

```javascript
[
  {
    "defId": "public:0xf02dbb306c36a2b32d41e14435fbf03cb32782f26458569ac2ea4ba9974b1f1e",
    "displayName": "Entity-Division-Plant Master",
    "desc": "Off-chain registry schema for Entity-Division-Plant Master",
    "version": "1.0",
    "properties": {
      "EntDivPlant": {
        "type": "object",
        "desc": "Entity division plant details",
        "properties": {
          "Entity": { "type": "string", "required": true, "title": "Entity", "order": 1 },
          "Division": { "type": "string", "required": true, "title": "Divsion/GB", "order": 2 },
          "Plant": { "type": "string", "required": true, "title": "Plant", "order": 3 },
          "Consignee": { "type": "string", "required": true, "title": "Consignee Name", "order": 4 }
        }
      }
    }
  }
]
```

### 11.4 Response

Same as Section 6.3.

### 11.5 MongoDB Storage

SyncFactory writes to `param_definitions.offchain_schema_definitions`. Document structure matches request; `_id` = `defId`.

```javascript
{
  "_id": "public:0xf02dbb306c36a2b32d41e14435fbf03cb32782f26458569ac2ea4ba9974b1f1e",
  "defId": "public:0xf02dbb306c36a2b32d41e14435fbf03cb32782f26458569ac2ea4ba9974b1f1e",
  "displayName": "Entity-Division-Plant Master",
  "desc": "Off-chain registry schema for Entity-Division-Plant Master",
  "version": "1.0",
  "properties": {
    "EntDivPlant": {
      "type": "object",
      "desc": "Entity division plant details",
      "properties": {
        "Entity": { "type": "string", "required": true, "title": "Entity", "order": 1 },
        "Division": { "type": "string", "required": true, "title": "Divsion/GB", "order": 2 },
        "Plant": { "type": "string", "required": true, "title": "Plant", "order": 3 },
        "Consignee": { "type": "string", "required": true, "title": "Consignee Name", "order": 4 }
      }
    }
  }
}
```

---

## 12. MongoDB Storage — Definition Outcomes

| Pipeline | Collection | Writer |
|----------|------------|--------|
| `pipe:sys:define-sm-v1` | `param_definitions.onchain_sm_definitions` | SyncFactory |
| `pipe:sys:define-schema-v1` | `param_definitions.onchain_schema_definitions` | SyncFactory |
| `pipe:sys:define-offchain-sm-v1` | `param_definitions.offchain_sm_definitions` | SyncFactory |
| `pipe:sys:define-offchain-schema-v1` | `param_definitions.offchain_schema_definitions` | SyncFactory |

Document `_id` is always `defId` from the request. The Wallet Backend reads from these collections; the Wallet Frontend never writes directly to MongoDB.

---

## 13. Stub APIs — Not Yet Documented

The following operations do **not** have ParamGateway API documentation. Implement **stub functions** that return success. Replace with real integration when APIs are provided.

| Operation | Stub Response |
|-----------|---------------|
| Onchain document create | `{ success: true }` |
| Onchain document transition | `{ success: true }` |
| Offchain registry create/update | `{ success: true }` |
| Offchain config create/update | `{ success: true }` |

---

## 14. Integration Flow & Implementation Notes

### 14.1 Create/Update Definition Flow

1. User submits definition form in Definitions Hub.
2. Frontend calls `POST /api/pipelines/{pipelineId}/execute?dryRun=false` with payload.
3. Frontend receives `batchIds` from response.
4. For each `batchId`, poll `GET /api/batches/{batchId}/tasks` until all tasks have `status: "synced"`.
5. On completion, show success; Wallet Backend will serve the new definition on next read.

### 14.2 Polling Strategy

- Poll interval: 2–3 seconds.
- Timeout: e.g. 60 seconds to avoid infinite wait.
- Check `items[].status` for each task; when all are `synced`, processing is complete.

### 14.3 Error Handling

- Non-2xx from execute: surface error to user.
- Task `status: "failed"` or error phase: surface error, allow retry.
- Network timeout: retry or show connection error.

### 14.4 API Client Structure

See Section 3 (Monorepo Placement & Folder Structure) for the full folder layout.
