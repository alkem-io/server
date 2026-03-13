# Research: Unit Tests for `src/services/whiteboard-integration`

## Source File Analysis

### Testable Files (2)

| File | Lines | Methods | Existing Coverage |
|------|-------|---------|-------------------|
| `whiteboard.integration.service.ts` | 286 | 7 public + 3 private | Partial (guest handling only) |
| `whiteboard.integration.controller.ts` | 103 | 7 handlers | None |

### Excluded Files (21)

All input/output data classes, types, enums, interfaces, module, and index files are excluded per convention. These are either trivial constructors or type declarations.

## Dependencies to Mock

### Service Dependencies
- `LoggerService` (WINSTON_MODULE_NEST_PROVIDER)
- `AuthorizationService.isAccessGranted()`
- `AuthenticationService.getActorContext()`
- `WhiteboardService.getWhiteboardOrFail()`, `.updateWhiteboardContent()`, `.isMultiUser()`, `.getProfile()`
- `ContributionReporterService.whiteboardContribution()`
- `CommunityResolverService.getCommunityFromWhiteboardOrFail()`, `.getLevelZeroSpaceIdForCommunity()`
- `ActivityAdapter.calloutWhiteboardContentModified()`
- `ActorContextService.buildForUser()`, `.createGuest()`
- `ConfigService.get()`

### Controller Dependencies
- `WhiteboardIntegrationService` (all 7 public methods)
- `RmqContext` (mock `getChannelRef()` and `getMessage()`)

## Test Patterns

The existing spec uses manual mock construction with `vi.fn()` and `as unknown as Mocked<T>` casting. We follow the same pattern for consistency.
