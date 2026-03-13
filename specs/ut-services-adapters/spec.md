# Unit Tests for src/services/adapters

## Objective
Achieve >=80% test coverage for the `src/services/adapters/` area by writing co-located unit tests for all service and adapter files containing business logic.

## Scope
### In Scope
- `activity-adapter/activity.adapter.ts` - Activity event processing with DB lookups
- `ai-server-adapter/ai.server.adapter.ts` - AI server delegation adapter
- `communication-adapter/communication.adapter.event.service.ts` - RabbitMQ event translation layer
- `notification-adapter/notification.adapter.ts` - Base notification recipient resolution
- `notification-adapter/notification.organization.adapter.ts` - Organization notification routing
- `notification-adapter/notification.platform.adapter.ts` - Platform notification routing
- `notification-adapter/notification.space.adapter.ts` - Space notification routing
- `notification-adapter/notification.user.adapter.ts` - User notification routing
- `notification-adapter/notification.virtual.contributor.adapter.ts` - VC notification routing
- `notification-external-adapter/notification.external.adapter.ts` - External notification payload builder
- `notification-in-app-adapter/notification.in.app.adapter.ts` - In-app notification persistence
- `storage/local-storage/local.storage.adapter.ts` - Local file storage operations

### Out of Scope
- Entity files, interfaces, modules, DTOs, enums, constants, index files
- Existing tests that already provide adequate coverage (communication.adapter.spec.ts)

## Success Criteria
- >=80% line coverage across `src/services/adapters/`
- All tests pass with `pnpm vitest run`
- No TypeScript compilation errors
- No lint errors
