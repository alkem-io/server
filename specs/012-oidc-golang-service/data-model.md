# Data Model Overview

## HydraChallenge

| Field | Type | Source | Validation | Notes |
| ----- | ---- | ------ | ---------- | ----- |
| id | string | Hydra login/consent challenge ID | Required, non-empty | Propagated to logs and redirects |
| type | enum(`login`,`consent`) | Parsed from inbound request path | Required | Determines Kratos trait mapping |
| subject | string | Hydra payload | Required for consent, optional for login pre-auth | Maps to Kratos identity lookup |
| requestURL | string | Hydra payload | Must be valid URL | Used for redirect replay |
| skip | bool | Hydra payload | Defaults false | True when Hydra indicates no UI required |
| clientID | string | Hydra payload | Required | Included in audit logs |
| sessionData | map[string]any | Hydra payload | Optional | Stored for building acceptance request |

## IdentityProfile

| Field | Type | Source | Validation | Notes |
| ----- | ---- | ------ | ---------- | ----- |
| identityID | string | Kratos identity record | Required | Primary key for trait lookup |
| email | string | Kratos traits.email | Required, RFC5322 | Missing values trigger 400 error |
| displayName | string | Kratos traits.display_name | Required | Used for Synapse mapping |
| matrixUserID | string | Kratos metadata_public.matrix_user_id | Optional | Logged when present |
| traits | map[string]any | Kratos traits | Optional | Serialized for consent payload |

## ServiceConfig

| Field | Type | Source | Validation | Notes |
| ----- | ---- | ------ | ---------- | ----- |
| hydraAdminURL | string | ENV `OIDC_HYDRA_ADMIN_URL` | Required, HTTPS only | Used for admin client |
| kratosAdminURL | string | ENV `OIDC_KRATOS_ADMIN_URL` | Required, HTTPS only | Identity lookup endpoint |
| kratosPublicURL | string | ENV `OIDC_KRATOS_PUBLIC_URL` | Required, HTTPS only unless insecure toggle | Resolves Kratos sessions |
| authToken | string | ENV `OIDC_ADMIN_TOKEN` | Optional | Added to Hydra/Kratos requests when set |
| maintenanceMode | bool | ENV `OIDC_MAINTENANCE_MODE` | Defaults false | Toggles global 503 response |
| retryAfterSeconds | int | ENV `OIDC_MAINTENANCE_RETRY` | Optional, >=0 | Adds Retry-After header |
| readinessTimeout | duration | ENV `OIDC_READINESS_TIMEOUT` | Defaults 5s | Timeout for warm-up checks |
| logLevel | enum(`debug`,`info`,`warn`,`error`) | ENV `OIDC_LOG_LEVEL` | Defaults info | Controls zap level |

## MaintenanceState

| Field | Type | Source | Validation | Notes |
| ----- | ---- | ------ | ---------- | ----- |
| enabled | bool | Derived from ServiceConfig | Required | Short-circuits handlers |
| message | string | Config or default | Optional | Returned in 503 payload |
| retryAfter | *time.Duration | Config | Optional | Added to HTTP headers |

## TelemetryEvent

| Field | Type | Source | Validation | Notes |
| ----- | ---- | ------ | ---------- | ----- |
| correlationID | string | Generated per request | Required, UUIDv4 | Propagated to logs/metrics |
| timestamp | time.Time | Generated per event | Required | UTC enforced |
| hydraLatencyMs | float64 | Measured per request | Required | Used to enforce p95 goal |
| kratosLatencyMs | float64 | Measured per request | Optional | Aggregated in Prometheus |
| outcome | enum(`success`,`client_error`,`server_error`,`maintenance`) | Derived | Required | Tag for metrics |
| errorCode | string | Derived from errors | Optional | Mirrors Hydra failure semantics |

## Relationships

- `HydraChallenge` references `IdentityProfile` when `subject` is present; missing traits prevent acceptance and generate `client_error` telemetry.
- `ServiceConfig` materialises `MaintenanceState` on each request; when enabled, `HydraChallenge` handlers bypass external calls.
- `TelemetryEvent` captures outcomes for every handled challenge, emitting Prometheus metrics keyed by challenge ID and client ID.
