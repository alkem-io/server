<!-- Implements constitution & agents.md. Does not introduce new governance. -->

# Domain Module Scaffold

This guide captures how we organize files inside `src/domain`. It highlights the core artifact types that appear in each module and why they are separated. Use it when shaping new domain capabilities or extending existing ones.

## Module Layout

- **Top-level folders** (`access/`, `community/`, `space/`, …) map to business capabilities. Each folder bundles every artifact needed to express that capability: aggregates, authorization, resolvers, DTOs, and supporting utilities.
- **Nested capability folders** (for example `space/space/`) host the actual module. Sibling folders such as `space.lookup/` or `space.settings/` capture narrower concerns that the parent module depends on but keeps isolated.
- **`index.ts` barrels** re-export module symbols to keep import paths short and give a single entry point per capability.
- **`*.module.ts`** wires the NestJS providers, imports, and exports that make the capability available to other layers.

```
space/
	space/
		dto/
		space.entity.ts
		space.interface.ts
		space.module.ts
		space.resolver.{queries|mutations|fields|subscriptions}.ts
		space.service.ts
		space.service.authorization.ts
		space.service.spec.ts
		...
```

The example above is representative: other modules follow the same pattern even if specific files differ.

## Core Artifact Types

### Entities & Aggregates

- `*.entity.ts` files declare TypeORM entities and embed domain invariants that must persist to storage.
- Some modules introduce helpers such as `sort.*.ts` or dedicated aggregate factories alongside entities; keep them co-located so tests and consumers stay close to the data shape they exercise.

### Interfaces & Contracts

- `*.interface.ts` files define TypeScript contracts for domain objects or collaboration points with other modules. They shield resolvers and services from storage-specific concerns and help coordinate changes across modules.
- When an interface underpins a DTO or resolver response, expose it via the module barrel (`index.ts`) so API layers can depend on the contract without reaching into implementation files.

### Services

- `*.service.ts` files encapsulate the business operations for the capability. They orchestrate aggregates, repositories, and cross-module collaborations.
- Domain services never perform authorization directly; instead they take already-authorized inputs or rely on dedicated authorization services (see below).
- For complex flows, break functionality into multiple services (e.g. `space.service`, `space.service.license`) to keep responsibilities narrow.

### Authorization

- `*.service.authorization.ts` files centralize policy enforcement for the capability. They receive domain objects, contextual actors, and optional feature flags, returning explicit allow/deny decisions.
- Authorization services often consume shared policies from `@domain/common/authorization-policy` or platform licensing modules. Keep decision logic declarative so resolvers can compose it clearly.
- A module exports its authorization service when other capabilities must check permissions before delegating to the core service.

### Resolvers & Field Resolvers

- GraphQL surface area lives in files named `*.resolver.queries.ts`, `*.resolver.mutations.ts`, `*.resolver.fields.ts`, and `*.resolver.subscriptions.ts`. Each file groups a single GraphQL operation type for readability and to simplify targeted testing.
- Resolvers maintain a thin layer: validate inputs, call authorization services, forward to the domain service, and map results back to DTOs or interfaces.
- Field resolver files expose computed properties or nested lookups required by the schema; keep domain access centralized through services or repositories rather than inlining data calls.

### DTOs

- The `dto/` directory hosts GraphQL input/output shapes and supporting mappers. Keep DTOs free of persistence decorators—they represent API contracts, not storage.
- DTOs may depend on shared scalars or enums from `@core` or `@services/api`; re-export them through the module barrel when other layers need reuse.
- Where transformation is non-trivial, pair DTOs with helper functions (`*.mapper.ts`) in the same directory so conversions are visible and testable.

### Specifications & Tests

- `*.spec.ts` files sit beside the code they exercise. Services typically own behavior-heavy tests (`space.service.spec.ts`), while pure functions (e.g. sorting helpers) use dedicated spec files.
- Resolver specs focus on ensuring authorization and service delegation occur as expected. When resolver logic branches heavily, consider targeted unit specs plus end-to-end coverage within `test/schema` to defend the contract.
- Use domain-specific fixtures from `test/` directories where possible, but prefer local test data builders when they clarify the behavior under test.

## Working With Other Layers

- **Controllers / API Services**: Although most HTTP or GraphQL orchestration sits under `src/services`, domain resolvers occasionally bridge straight to the schema for historical reasons. When creating new capabilities, evaluate whether resolver code belongs in `services` or `domain`; default to the domain folder only when the resolver is tightly coupled to domain entities and authorization assets.
- **Authorization Policies**: Share common rules via `@domain/common/authorization-policy` modules. Module-specific services should compose those primitives instead of re-implementing policies.
- **Integration Adapters**: Modules import adapters from `@services/adapters` or `@services/infrastructure` when side effects are required (notifications, indexing, etc.). Keep the interaction encapsulated inside services so resolvers remain declarative.

By keeping these artifact types consistent across modules, we make it easier to navigate a capability, add related behavior, and ensure downstream layers can rely on stable contracts.
