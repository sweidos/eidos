# Release Actions write — Validation

## Before

```json
{ "can_approve_pull_request_reviews": false, "default_workflow_permissions": "read" }
```

## Agent attempt

`PUT …/actions/permissions/workflow` with `write` → **409** org-disabled.

## Org API

`GET orgs/sweidos/actions/permissions/workflow` → **403** (token cannot manage org Actions).
