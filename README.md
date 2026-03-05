# Param Wallet 5.0

Param Platform v2

## Building the Application

When building (manually or with AI assistance), **follow the implementation plans and their required specs**:

- **Frontend:** `FRONTEND_IMPLEMENTATION_PLAN.md` — see §0 (Required Documentation) and spec references in each phase
- **Backend:** `BACKEND_IMPLEMENTATION_PLAN.md` — see §0 (Required Documentation) and spec references in each phase

**Required specs:** `indocs/frontend-control-tower-specs.html`, `indocs/param-ui-design-specification.html`, `indocs/wallet-backend-architecture.md`, `indocs/paramgateway-api-integration.md`

---

## AI-Assisted Build: Standard Prompt Template

Copy and use this prompt when asking an AI (e.g. Claude, Cursor) to build the Wallet application. Attach or reference the listed files so the AI has full context.

```
Build the Param Wallet 5.0 application (frontend + backend) according to the implementation plans and their required specifications.

**Mandatory: You must follow these documents. The implementation plans are build guides; the specs are the source of truth.**

1. **Implementation plans** (primary build order):
   - FRONTEND_IMPLEMENTATION_PLAN.md — follow phases 1–8 in order
   - BACKEND_IMPLEMENTATION_PLAN.md — follow phases 1–5 in order

2. **Required specs** (read and apply for each phase):
   - indocs/frontend-control-tower-specs.html — UX flows, user journey, screen mockups, shell layout, navigation
   - indocs/param-ui-design-specification.html — design tokens (colors, spacing, typography), component specs, layout constants (e.g. 220px left nav, 260px right panel)
   - indocs/wallet-backend-architecture.md — API contracts, endpoint schemas, data model, RBAC, DB topology
   - indocs/paramgateway-api-integration.md — pipeline execute flow, payload schemas, headers (X-Gateway-Role, X-Workspace)

3. **Rules:**
   - For each phase, read the spec sections referenced in that phase before implementing
   - Use design tokens from param-ui-design-specification.html; do not use arbitrary colors or spacing
   - Backend never calls ParamGateway; frontend calls ParamGateway for definitions (execute → poll until synced)
   - Match the UX flows and screens in frontend-control-tower-specs.html

Start with the backend foundation, then frontend foundation, then proceed phase by phase. Do not deviate from the specs.
```
