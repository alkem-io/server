# Implementation Plan: Timeline Event Comment Notification

**Branch**: `013-timeline-comment-notification` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-timeline-comment-notification/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a new notification system for timeline event comments that alerts community members when comments are posted on calendar events. The feature extends the existing notification infrastructure (following the pattern of `SPACE_COMMUNITY_CALENDAR_EVENT_CREATED`) to support comment-based notifications, respecting user preferences for both in-app and email channels while excluding the comment author from receiving notifications.

**Technical Approach**: Add new notification event type `SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT`, create corresponding DTOs and payloads, integrate with `RoomServiceEvents` to trigger on CALENDAR_EVENT room messages, implement notification adapter method following existing Space notification patterns.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 20.15.1 (Volta-pinned), executed via ts-node
**Primary Dependencies**: NestJS 10.x, TypeORM 0.3.x, Apollo Server 4.x, GraphQL 16.x, class-validator, class-transformer
**Storage**: MySQL 8.0 with `mysql_native_password` authentication
**Testing**: Jest 29.x with CI configuration, integration tests via GraphQL queries, contract tests for schema stability
**Target Platform**: Linux containers (Docker), deployed to Kubernetes (Hetzner clusters)
**Project Type**: Single NestJS monolith with domain-driven structure
**Performance Goals**: <5 seconds notification delivery, <200ms p95 for GraphQL mutations
**Constraints**: No breaking schema changes without deprecation; must pass schema-contract gate;
**Scale/Scope**: ~3000 TypeScript files, notification system handles 10k+ users across multiple communities

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Core Principles Compliance

**1. Domain-Centric Design First**: ✅ PASS

- Notification logic resides in domain services (`RoomServiceEvents`, `NotificationSpaceAdapter`)
- No business rules embedded in resolvers/controllers

**2. Modular NestJS Boundaries**: ✅ PASS

- Extends existing notification modules without introducing new module
- No circular dependencies introduced
- Follows established pattern from `SPACE_COMMUNITY_CALENDAR_EVENT_CREATED`

**3. GraphQL Schema as Stable Contract**: ✅ PASS

- Adds new enum value to existing `NotificationEvent` enum (non-breaking)
- Adds optional user preference field (non-breaking)
- New payload type extends existing interface pattern
- No deprecation required

**4. Explicit Data & Event Flow**: ✅ PASS

- Follows established Room message → event processing → notification emission pattern
- Integrates with existing `RoomServiceEvents` infrastructure
- No inline side effects

**5. Observability & Operational Readiness**: ✅ PASS

- Inherits existing notification logging from `NotificationSpaceAdapter`
- Uses standard LogContext.NOTIFICATIONS for error tracking
- Follows existing structured log patterns

**6. API Consistency & Evolution Discipline**: ✅ PASS

- Naming follows pattern: `SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT`
- Input DTO suffix: `Input`, payload suffix: `Payload`
- Consistent with existing notification naming conventions

**7. Secure-by-Design Integration**: ✅ PASS

- Authorization checks via existing `NotificationRecipientsService`
- Respects existing community membership and privilege checks
- No new external integrations

**8. Container & Deployment Determinism**: ✅ PASS

- No deployment-specific changes
- Feature relies on database config (user preferences)

**9. Simplicity & Incremental Hardening**: ✅ PASS

- Leverages existing notification infrastructure
- Minimal new code paths
- No architectural escalation required

**Summary**: All gates PASS except testing coverage (requires implementation). No constitutional violations. Re-validation after Phase 1 design confirms: no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/013-timeline-comment-notification/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── notification-event.graphql  # Updated enum with new event
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── common/
│   └── enums/
│       └── notification.event.ts                         # [MODIFY] Add SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT
├── domain/
│   ├── communication/
│   │   └── room/
│   │       ├── room.resolver.mutations.ts                # [MODIFY] Add notification call in CALENDAR_EVENT case
│   │       └── room.service.events.ts                    # [ADD]
│   └── timeline/
│       └── event/
│           └── event.service.ts                          # [REFERENCE] Existing CalendarEvent entity usage
├── platform/
│   └── in-app-notification-payload/
│       ├── dto/
│       │   └── space/
│       │       └── notification.in.app.payload.space.community.calendar.event.comment.ts  # [ADD] New payload type
│       ├── field-resolvers/
│       │   └── space/
│       │       └── in.app.notification.payload.space.community.calendar.event.comment.resolver.fields.ts  # [ADD] GraphQL resolver
│       ├── in.app.notification.payload.interface.ts     # [MODIFY] Add payload to resolveType switch
│       └── in.app.notification.payload.module.ts        # [MODIFY] Register new resolver
├── services/
│   ├── adapters/
│   │   └── notification-adapter/
│   │       ├── dto/
│   │       │   └── space/
│   │       │       └── notification.dto.input.space.community.calendar.event.comment.ts  # [ADD] Input DTO
│   │       └── notification.space.adapter.ts            # [ADD] spaceCommunityCalendarEventComment method
│   ├── api/
│   │   └── notification-recipients/
│   │       └── notification.recipients.service.ts       # [MODIFY] Add event to channel settings, privileges, auth policy switches
│   └── infrastructure/
│       └── entity-resolver/
│           └── room.resolver.service.ts                 # [REFERENCE] Existing getCalendarEventForRoom method

schema-baseline.graphql                                   # [AUTO-UPDATE] Via post-merge automation
```

**Structure Decision**: Single NestJS project structure. All changes integrate into existing domain modules (`domain/communication/room`, `domain/community/user-settings`) and service adapters (`services/adapters/notification-adapter`). No new modules created; follows established notification pattern precedent from `SPACE_COMMUNITY_CALENDAR_EVENT_CREATED` (event creation) and `SPACE_COLLABORATION_CALLOUT_COMMENT` (comment notifications). Timeline/CalendarEvent domain remains unchanged as it already has Room relationship established. Reuse existing user setting under `user_settings.space.communityCalendarEvents`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations requiring justification. All changes follow existing patterns and architectural boundaries.
