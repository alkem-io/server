# Data Model: src/apm Classes and Types

**Created**: 2026-03-12

## Types

### ClassDecoratorParams
```typescript
type ClassDecoratorParams = {
  enabled?: boolean;                    // Default: true
  matchMethodsOnMetadataKey?: string;   // Filter methods by metadata key
  skipMethods?: string[];               // Methods to exclude from instrumentation
};
```

### PlainContext (plugin-internal)
```typescript
type PlainContext = { req: IncomingMessage };
```

## Exported Functions/Constants

| Export | File | Type | Description |
|---|---|---|---|
| `apmAgent` | `apm.ts` | `Agent \| undefined` | Elastic APM agent instance |
| `copyMetadata` | `copy.metadata.ts` | `(src, dest) => void` | Copies reflect metadata |
| `instrumentMethod` | `instrument.method.ts` | `(method, name, type) => Proxy` | Wraps method with APM span |
| `createInstrumentedClassDecorator` | `createInstrumentedClassDecorator.ts` | `(spanType, options?) => ClassDecorator` | Core decorator factory |
| `InstrumentResolver` | `instrument.resolver.decorator.ts` | `(options?) => ClassDecorator` | Resolver-specific decorator |
| `InstrumentService` | `instrument.service.decorator.ts` | `(options?) => ClassDecorator` | Service-specific decorator |
| `ApmApolloPlugin` | `apm.apollo.plugin.ts` | `ApolloServerPlugin` | Apollo plugin for APM |

## Entity Relationships

No database entities. This module is purely infrastructure/observability code.
