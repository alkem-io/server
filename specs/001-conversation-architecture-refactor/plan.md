# Implementation Plan: Conversation Architecture Refactor

**Branch**: `001-conversation-architecture-refactor` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-conversation-architecture-refactor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Refactor conversation architecture to eliminate per-user conversation sets and duplicate conversation records by centralizing all conversations into a single platform-owned conversation set. Replace direct foreign key relationships (userID, virtualContributorID) with a normalized pivot table (ConversationMembership) that links conversations to agent participants. Infer conversation type dynamically from member agent types instead of storing explicitly. Move wellKnownVirtualContributor metadata from Conversation to VirtualContributor entity. This is a schema-only refactor; data migration (if needed) will be handled separately.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 20.15.1 (Volta-pinned)
**Primary Dependencies**: NestJS 10.3.10, TypeORM 10.0.2, Apollo Server 4.10.4, GraphQL 16.9.0
**Storage**: MySQL 8.0 with TypeORM entities and migrations
**Testing**: Jest (config in `test/config/jest.config.ci.js`), test suites in `test/functional/` and `test/unit/`
**Target Platform**: Linux server (containerized via Docker, deployed to Kubernetes on Hetzner)
**Project Type**: NestJS GraphQL API server
**Performance Goals**: No regression - conversation queries maintain current p95 latency (<200ms observed baseline). DataLoader pattern REQUIRED for agent/user/VC field resolvers to prevent N+1 queries (infrastructure already exists in codebase).
**Constraints**: GraphQL schema backward compatibility required; authorization policy updates must not break existing permission checks
**Scale/Scope**: Affects `src/domain/communication/conversation/`, `src/domain/communication/conversations-set/`, `src/domain/community/user/`, `src/domain/community/virtual-contributor/`, plus all conversation resolvers and services

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**✅ Principle 1 - Domain-Centric Design First**
- All conversation business logic (type inference, membership validation, authorization derivation) remains in `src/domain/communication/conversation/` domain services
- ConversationService and ConversationsSetService orchestrate domain operations; GraphQL resolvers only handle API layer mapping
- No business rules added to controllers or resolvers

**✅ Principle 2 - Modular NestJS Boundaries**
- ConversationMembership pivot table lives in conversation domain module (`src/domain/communication/conversation/`)
- No new circular dependencies introduced; ConversationModule already depends on AgentModule for agent resolution
- User and VirtualContributor modules remain independent; conversation module references them via lookup services

**✅ Principle 3 - GraphQL Schema as Stable Contract**
- GraphQL schema maintains backward compatibility per FR-018 and SC-004
- `Conversation` type fields (user, virtualContributor) resolved through new pivot table relationships transparently
- No breaking field removals; type inference handled internally without exposing type field removal to API consumers

**✅ Principle 4 - Explicit Data & Event Flow**
- Conversation creation continues to emit domain events (if already present in codebase)
- Repository writes remain within domain services, never in resolvers
- Authorization checks occur before conversation operations (per clarification: membership = privileges)

**✅ Principle 5 - Observability & Operational Readiness**
- Structured logging with conversation ID, agent IDs in LogContext.COMMUNICATION
- Performance-sensitive queries (conversation membership joins) include inline optimization comments
- No new Prometheus metrics required; existing conversation query latency metrics suffice
- Exception details payload used for dynamic data (agent IDs, conversation IDs) per constitution requirement

**✅ Principle 6 - Code Quality with Pragmatic Testing**
- Unit tests for type inference logic (USER_USER vs USER_VC based on agent types)
- Integration tests for pivot table membership queries and uniqueness constraint enforcement
- Skip trivial pass-through coverage for simple getters/setters
- Test migration scripts in `test/functional/migration/` using snapshot validation pattern (`.scripts/migrations/run_validate_migration.sh`)

**✅ Principle 7 - API Consistency & Evolution Discipline**
- Existing mutation/query naming conventions preserved
- No changes to shared enums or pagination patterns
- Error codes remain unchanged (EntityNotFoundException for missing conversations/agents)

**✅ Principle 8 - Secure-by-Design Integration**
- Authorization policy updates maintain existing validation layers
- Membership-based authorization (per clarification) enforced at domain service layer before any conversation operations
- No new external integrations introduced

**✅ Principle 9 - Container & Deployment Determinism**
- No runtime configuration changes required
- Migration scripts idempotent and deterministic per constitution requirement
- No new environment variables needed

**✅ Principle 10 - Simplicity & Incremental Hardening**
- Pivot table is simplest solution for many-to-many relationship (standard relational pattern)
- Unique constraint on sorted agent pair prevents race conditions at database level (simpler than distributed locks)
- Type inference eliminates redundant stored state (simpler than maintaining consistency between type field and membership)

**Re-check after Phase 1 design**: ✅ Pending (will validate after data-model.md and contracts generated)

## Project Structure

### Documentation (this feature)

```text
specs/001-conversation-architecture-refactor/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (GraphQL schema changes)
│   └── conversation.graphql
├── checklists/          # Quality validation
│   └── requirements.md  # Completed during /speckit.specify
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── communication/
│   │   ├── conversation/
│   │   │   ├── conversation.entity.ts              # Remove userID, virtualContributorID, wellKnownVirtualContributor, type columns
│   │   │   ├── conversation.interface.ts           # Update interface to remove deprecated fields
│   │   │   ├── conversation.service.ts             # Update creation/query logic for pivot table
│   │   │   ├── conversation.service.authorization.ts # Update authorization to use membership
│   │   │   ├── conversation.resolver.fields.ts     # Update resolvers for user/VC fields
│   │   │   ├── conversation.resolver.mutations.ts  # Update mutations for pivot table
│   │   │   ├── conversation-membership.entity.ts   # NEW: Pivot table entity
│   │   │   └── conversation-membership.interface.ts # NEW: Pivot table interface
│   │   └── conversations-set/
│   │       ├── conversations.set.entity.ts         # Update relationships if needed
│   │       ├── conversations.set.service.ts        # Update query logic for pivot table
│   │       └── conversations.set.resolver.mutations.ts # Update to use platform set
│   ├── community/
│   │   ├── user/
│   │   │   └── user.entity.ts                      # Remove conversationsSet relationship
│   │   └── virtual-contributor/
│   │       └── virtual.contributor.entity.ts       # Add wellKnownVirtualContributor column
│   └── agent/
│       └── agent/
│           └── agent.entity.ts                     # Reference for agent type resolution
├── services/
│   └── api/
│       └── me/
│           └── me.conversations.resolver.fields.ts # Update to query via platform set
├── platform/
│   └── platform.well.known.virtual.contributors/  # May need updates for VC metadata
└── migrations/
    └── [TIMESTAMP]-conversation-architecture-refactor.ts # NEW: Schema migration

test/
├── functional/
│   ├── integration/
│   │   ├── conversation/
│   │   │   ├── conversation-membership.int-spec.ts # NEW: Pivot table tests
│   │   │   ├── conversation-creation.int-spec.ts   # Update for concurrent creation
│   │   │   └── conversation-authorization.int-spec.ts # Update for membership-based auth
│   │   └── migration/
│   │       └── conversation-refactor-migration.spec.ts # NEW: Migration validation
│   └── unit/
│       └── conversation/
│           ├── conversation-type-inference.spec.ts  # NEW: Type inference unit tests
│           └── conversation-membership-validation.spec.ts # NEW: Cardinality validation
```

**Structure Decision**: This is a single NestJS server project following the existing Alkemio architecture. All changes are within the established domain/services/platform structure. The conversation domain module is extended with a new ConversationMembership entity, and existing entities (User, Conversation, VirtualContributor) are updated via a TypeORM migration. GraphQL resolvers adapt transparently to maintain API compatibility.

## Complexity Tracking

> No violations of the Constitution identified. This refactor follows established patterns:
> - Uses standard TypeORM many-to-many relationship via pivot table (ConversationMembership)
> - Maintains domain-centric design with business logic in domain services
> - Follows existing GraphQL resolver patterns for transparent API compatibility
> - Applies pragmatic testing (unit tests for inference logic, integration tests for database operations)
> - Simplifies architecture by eliminating redundant stored state (type field, duplicate conversations)
