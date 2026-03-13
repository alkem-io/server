# Research: src/apm Code Analysis

**Created**: 2026-03-12

## Module Structure

```
src/apm/
  apm.ts                           - APM agent initialization (env-var driven config)
  index.ts                         - Re-exports apm.ts
  decorators/
    index.ts                       - Re-exports decorators
    instrument.resolver.decorator.ts - Factory for resolver class decorator
    instrument.service.decorator.ts  - Factory for service class decorator
    util/
      index.ts                     - Re-exports utilities
      copy.metadata.ts             - Reflect metadata copy utility
      createInstrumentedClassDecorator.ts - Core decorator factory
      instrument.method.ts         - Method proxy for APM span creation
  plugins/
    index.ts                       - Re-exports plugin
    apm.apollo.plugin.ts           - Apollo Server plugin for operation tracing
```

## Key Findings

### apm.ts
- Reads `APM_ENDPOINT`, `APM_ACTIVE`, `APM_TRANSACTION_PERCENTAGE`, etc. from env
- Exports `apmAgent` which is either an initialized agent or `undefined`
- Testing this directly is low-value (config-only); it's better tested indirectly

### copy.metadata.ts
- Pure function using `Reflect.getMetadataKeys` and `Reflect.defineMetadata`
- Easily unit-testable with reflect-metadata

### createInstrumentedClassDecorator.ts
- Core logic: iterates prototype descriptors, wraps eligible methods via `instrumentMethod`
- Skips: constructors, non-functions, methods in `skipMethods`, methods lacking metadata key
- Returns early if `enabled === false`

### instrument.method.ts
- Uses `Proxy` to wrap method calls
- Checks `apmAgent?.currentTransaction` before creating spans
- Handles three return types: Promise (ends span after resolve), Function (ends span, calls function), other (ends span, returns value)

### apm.apollo.plugin.ts
- Implements `ApolloServerPlugin` with `requestDidStart` hook
- `didResolveOperation`: sets transaction type and name based on operation
- `executionDidStart` / `willResolveField`: creates spans per field (disabled by default via `ENABLE_GLOBAL_INSTRUMENTATION = false`)
- Helper functions: `assignOperationName`, `assignOperationType`

### Dependencies
- `elastic-apm-node` (external, must be mocked)
- `@nestjs/graphql` for `RESOLVER_NAME_METADATA` constant
- `@apollo/server` types (type-only, no runtime dependency)
- `graphql/type` for `GraphQLObjectType`
- `reflect-metadata`
