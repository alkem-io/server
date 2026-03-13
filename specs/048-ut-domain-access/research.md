# Research: Unit Tests for src/domain/access

## Existing Test Patterns

### Test Infrastructure
- **Vitest 4.x** with globals (describe, it, expect, vi)
- **NestJS Test module** via `Test.createTestingModule()`
- **defaultMockerFactory** auto-mocks all unresolved providers
- **repositoryProviderMockFactory** creates mock TypeORM repository providers
- **MockWinstonProvider** mocks the Winston logger
- **MockCacheManager** mocks NestJS cache manager

### Common Patterns
1. Entity static `.create()` methods are mocked with `vi.spyOn(Entity, 'create')`
2. Services retrieved via `module.get<ServiceType>(ServiceType)`
3. Repository methods mocked with `vi.spyOn(repo, 'findOne').mockResolvedValue(...)`
4. Injected services cast as `Mock` for assertions: `(service.method as Mock).mockResolvedValue(...)`
5. Test data uses minimal object shapes cast as `any`

## File Analysis

### Coverage Gaps by Impact
| File | Current % | Lines | Priority |
|------|-----------|-------|----------|
| role.set.service.ts | 8.19% | ~1890 | HIGH |
| role.set.resolver.mutations.ts | 7.33% | ~672 | MEDIUM |
| role.set.resolver.fields.ts | 2.56% | ~386 | MEDIUM |
| role.set.resolver.mutations.membership.ts | 0% | ~903 | MEDIUM |
| role.set.resolver.fields.public.ts | 8.33% | ~107 | LOW |
| role.set.service.authorization.ts | 0% | ~266 | MEDIUM |
| invitation.service.authorization.ts | 0% | ~120 | MEDIUM |
| application.service.authorization.ts | 0% | ~59 | LOW |
| platform.invitation.service.authorization.ts | 0% | ~20 | LOW |
| role.set.service.events.ts | 0% | ~101 | MEDIUM |
| role.set.service.license.ts | 0% | ~81 | LOW |
| Various lifecycle services | 0-33% | ~50 each | LOW |

### Dependencies
- `ActorService`, `ActorLookupService` - core dependency for role management
- `AuthorizationPolicyService` - used in all authorization services
- `LifecycleService` - used in lifecycle services
- `FormService`, `LicenseService` - secondary dependencies
- Various lookup services (User, Organization, VirtualContributor, Space)
