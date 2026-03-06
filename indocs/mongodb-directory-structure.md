# MongoDB Directory Structure — Wallet Backend 5.0

```
MongoDB Instance
│
├── param_definitions
│   ├── onchain_sm_definitions
│   ├── onchain_schema_definitions
│   ├── offchain_sm_definitions
│   ├── offchain_schema_definitions
│   ├── superapp_definitions
│   └── team_rbac_matrix
│
├── param_saas
│   ├── subdomains
│   └── subdomain_users
│
├── param_auth
│   └── sessions
│
├── {subdomain}
│   ├── installed_superapps
│   ├── plants
│   ├── tax_master
│   ├── delegates
│   ├── holiday_calendars
│   ├── email_config
│   ├── notification_templates
│   ├── notification_preferences
│   ├── notification_logs
│   └── notification_inbox
│
├── {subdomain}_{superappId[0:8]}
│   ├── organizations
│   ├── team_rbac_matrix
│   ├── app_users
│   ├── offchain_registry_{Name}
│   ├── offchain_config_{Name}
│   ├── notification_templates
│   ├── notification_preferences
│   ├── notification_logs
│   └── notification_inbox
│
└── {subdomain}_{superappId[0:8]}_{org[2:22]}_{portal}
    ├── drafts
    ├── sm_{state}_{smId[0:6]}
    ├── txn_history
    └── chain_head
```