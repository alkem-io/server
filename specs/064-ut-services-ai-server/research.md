# Research: Unit Tests for src/services/ai-server

## Existing Test Patterns

The codebase follows a consistent Vitest + NestJS testing pattern:

### Module Setup
```typescript
const module = await Test.createTestingModule({
  providers: [ServiceUnderTest, repositoryProviderMockFactory(Entity), MockWinstonProvider],
})
  .useMocker(defaultMockerFactory)
  .compile();
```

### Mock Access
```typescript
const repo = module.get(getRepositoryToken(Entity));
const dep = module.get(DependencyService) as unknown as Record<string, Mock>;
```

### Assertions
- `EntityNotFoundException` for missing entities
- `RelationshipNotFoundException` for missing relations
- `EntityNotInitializedException` for uninitialized auth

## Dependencies Map

| File | Key Dependencies |
|------|-----------------|
| AiPersonaEngineAdapter | EventBus |
| AiPersonaAuthorizationService | AuthorizationPolicyService (x2 - same class, different roles) |
| AiServerAuthorizationService | AuthorizationPolicyService, AiServerService, AiPersonaAuthorizationService |
| AiPersonaResolverFields | AuthorizationService, AiPersonaService |
| AiPersonaResolverMutations | AiPersonaService, AuthorizationService |
| AiPersonaExternalConfigResolverFields | AiPersonaService |
| AiServerResolverFields | AiServerService |
| AiServerResolverQueries | AiServerService |
| PromptGraphTransformer | None (pure functions) |
