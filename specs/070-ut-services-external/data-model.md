# Data Model: Unit Tests for src/services/external

## No Data Model Changes
This is a test-only feature. No entities, migrations, or schema changes are required.

## Key Types Referenced in Tests

### Elasticsearch Types
- `ElasticResponseError` - Custom type with `meta.statusCode`, `name`, `message`, `stack`
- `ErrorResponseBase` (from `@elastic/elasticsearch`) - Has `status`, `error.type`
- `HandledElasticError` - Output of `handleElasticError`: `{ message, uuid, name?, status? }`

### Wingback Types
- `WingbackContract` - Contract response with `contract_summary.customer_id`
- `CreateWingbackCustomer` - Input for customer creation
- `WingbackFeature` - Feature from entitlement response
- `WingbackEntitlement` - Entitlement with `plan.name` and `plan.features`
- `WingbackException` - Custom exception with `status`, `statusText`, `details`

### Geo Types
- `GeoLocationCacheMetadata` - `{ start: number, calls: number }`
