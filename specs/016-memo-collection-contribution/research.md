# Research: Enable Memo as Valid Collection Contribution Type

**Feature**: 016-memo-collection-contribution
**Date**: 2025-11-06
**Status**: Complete

## Executive Summary

Research confirms that the majority of infrastructure for memo contributions already exists. The implementation requires enabling memo handling in the CalloutContributionService following the established patterns for post, whiteboard, and link contributions. No architectural changes, database migrations, or new patterns are required.

## Research Questions & Findings

### Q1: Does the database schema support memo contributions?

**Decision**: YES - Full schema support exists
**Rationale**:

- `CalloutContribution` entity has `memo` relationship field (OneToOne with Memo entity)
- `memoId` column exists with proper foreign key constraints
- Entity relationship includes cascade and onDelete rules
- Migration `CleanUpContributions1758116200183` shows memo field was added alongside post/whiteboard/link

**Evidence**:

```typescript
// From callout.contribution.entity.ts
@OneToOne(() => Memo, {
  eager: false,
  cascade: true,
  onDelete: 'SET NULL',
})
@JoinColumn()
memo?: Memo;
```

**Alternatives Considered**: N/A - schema support confirmed

---

### Q2: Are domain events emitted for contribution lifecycle?

**Decision**: NO explicit domain events - Activity reporting pattern used instead
**Rationale**:

- Current codebase uses ElasticSearch `ContributionReporterService` for activity tracking
- Method `memoContribution()` already exists for reporting memo activities
- Post contributions use subscription events (`CalloutPostCreated`) but whiteboards do not
- Memo contributions should follow the whiteboard pattern (reporter service without GraphQL subscriptions)

**Evidence**:

```typescript
// From contribution.reporter.service.ts
public memoContribution(
  contribution: ContributionDetails,
  details: AuthorDetails
): void {
  this.createDocument(
    {
      type: 'MEMO_CONTRIBUTION',
      id: contribution.id,
      name: contribution.name,
      author: details.id,
      space: contribution.space,
    },
    details
  );
}
```

**Alternatives Considered**:

- Domain Event Bus pattern - Rejected because existing contribution types don't use it
- GraphQL Subscriptions - Rejected because only posts have subscription support, not whiteboards

**Action Required**: Wire memo contribution creation to call `ContributionReporterService.memoContribution()`

---

### Q3: How should memo contributions be resolved in GraphQL queries?

**Decision**: Add resolver field following existing pattern
**Rationale**:

- `CalloutContributionResolverFields` has individual resolver fields for `whiteboard`, `post`, `link`
- Each calls corresponding service method (`getWhiteboard()`, `getPost()`, `getLink()`)
- `CalloutContributionService` needs `getMemo()` method added
- Resolver field should use `@Profiling.api` decorator for performance tracking

**Pattern**:

```typescript
@ResolveField('memo', () => IMemo, {
  nullable: true,
  description: 'The Memo that was contributed.',
})
@Profiling.api
async memo(
  @Parent() calloutContribution: ICalloutContribution
): Promise<IMemo | null> {
  return await this.calloutContributionService.getMemo(calloutContribution);
}
```

**Alternatives Considered**: N/A - established pattern must be followed

---

### Q4: What authorization pattern should memo contributions use?

**Decision**: Reuse existing `AuthorizationPolicyType.CALLOUT_CONTRIBUTION`
**Rationale**:

- All contribution types (post, whiteboard, link) use the same authorization policy type
- MemoAuthorizationService already exists for memo-specific auth logic
- Contribution-level auth is separate from memo-level auth (cascaded)

**Evidence**:

```typescript
// From callout.contribution.service.ts
contribution.authorization = new AuthorizationPolicy(
  AuthorizationPolicyType.CALLOUT_CONTRIBUTION
);
```

**Alternatives Considered**: N/A - uniform auth policy required for all contributions

---

### Q5: How should memo contributions be created?

**Decision**: Follow service orchestration pattern - delegate to MemoService
**Rationale**:

- Existing pattern: `PostService.createPost()`, `WhiteboardService.createWhiteboard()`, `LinkService.createLink()`
- `MemoService.createMemo()` already exists with full implementation
- Takes `CreateMemoInput`, `storageAggregator`, and `userID` parameters
- Returns `IMemo` that gets assigned to contribution

**Code Addition Required**:

```typescript
const { post, whiteboard, link, memo } = calloutContributionData;

// Add after existing if blocks:
if (memo) {
  contribution.memo = await this.memoService.createMemo(
    memo,
    storageAggregator,
    userID
  );
}
```

**Alternatives Considered**: N/A - service delegation is established pattern

---

### Q6: What module dependencies are required?

**Decision**: Import existing MemoModule into CalloutContributionModule
**Rationale**:

- MemoModule already exports MemoService
- Follows pattern of WhiteboardModule, PostModule, LinkModule imports
- No circular dependencies introduced

**Change Required**:

```typescript
// In callout.contribution.module.ts
imports: [
  // ... existing imports
  MemoModule, // ADD THIS
  // ... rest of imports
];
```

**Injection in Service**:

```typescript
constructor(
  // ... existing dependencies
  private memoService: MemoService,  // ADD THIS
  // ... rest of dependencies
)
```

**Alternatives Considered**: N/A - standard NestJS dependency injection pattern

---

### Q7: Does GraphQL schema require changes?

**Decision**: NO changes required - schema already complete
**Rationale**:

- `CalloutContributionType.MEMO` enum value exists
- `CreateCalloutContributionInput` has `memo: CreateMemoInput` field
- `CalloutContribution` type has `memo: Memo` field (implicitly via entity)
- `CalloutContributionsCountOutput` has `memo: Float!` field
- Schema contract won't break - only enabling existing definitions

**Evidence**: Schema baseline already shows all memo types registered

**Alternatives Considered**: N/A - no changes needed

---

### Q8: What testing strategy should be used?

**Decision**: Integration tests for GraphQL mutations/queries + Service unit tests
**Rationale**:

- Follow existing test pattern in `test/functional/integration/callout-contribution/`
- Test memo contribution creation via `createContributionOnCallout` mutation
- Test memo contribution querying via callout contributions query
- Unit test `CalloutContributionService.getMemo()` method
- Verify contribution counting includes memos

**Test Cases Required**:

1. Create memo contribution with valid data → SUCCESS
2. Create memo contribution when memo not in allowedTypes → VALIDATION ERROR
3. Query contributions returns memos with metadata
4. Filter contributions by memo type returns only memos
5. Contribution count includes memo contributions

**Alternatives Considered**: N/A - standard test coverage for new functionality

---

### Q9: Are there any performance considerations?

**Decision**: No special optimization needed - follow existing patterns
**Rationale**:

- Memo entity uses same lazy loading as post/whiteboard (eager: false)
- Profile and authorization loaded on demand via GraphQL resolvers
- Target <200ms for 100 contributions is achievable with existing N+1 query prevention patterns
- DataLoader pattern already used in memo resolver fields

**Evidence**: Existing contribution queries meet performance targets without special optimization

**Alternatives Considered**: N/A - premature optimization not needed

---

### Q10: How should nameID be handled for memo contributions?

**Decision**: Follow existing naming service pattern used for posts and whiteboards
**Rationale**:

- `CalloutService.createContributionOnCallout()` already handles nameID reservation
- Calls `setNameIdOnWhiteboardData()` and `setNameIdOnPostData()` for respective types
- Should add `setNameIdOnMemoData()` following same pattern
- MemoService likely uses Profile which requires nameID

**Action Required**: Verify if `setNameIdOnMemoData()` method exists or needs to be added

**Alternatives Considered**: N/A - nameID collision prevention is mandatory

---

## Technology Stack Summary

| Component      | Technology    | Version    | Purpose                  |
| -------------- | ------------- | ---------- | ------------------------ |
| Language       | TypeScript    | 5.3.3      | Application code         |
| Runtime        | Node.js       | 20.15.1    | Server execution         |
| Framework      | NestJS        | 10.3.10    | Application architecture |
| ORM            | TypeORM       | 0.3.13     | Database access          |
| Database       | MySQL         | 8.x        | Data persistence         |
| API            | GraphQL       | 16.9.0     | API interface            |
| GraphQL Server | Apollo Server | 4.10.4     | GraphQL execution        |
| Testing        | Jest          | 29.7.0     | Test framework           |
| Search         | Elasticsearch | Via client | Activity indexing        |

## Best Practices Applied

### NestJS Module Patterns

- Dependency injection via constructor parameters
- Module imports/exports for cross-module dependencies
- Service layer encapsulation of business logic
- Repository pattern for data access

### TypeORM Entity Patterns

- OneToOne relationships with cascade and onDelete rules
- Lazy loading (eager: false) for related entities
- UUID primary keys with foreign key constraints

### GraphQL Resolver Patterns

- Field resolvers for related entities
- Parent decorator for accessing parent entity data
- DataLoader pattern for N+1 query prevention
- Profiling decorator for performance monitoring

### Authorization Patterns

- Authorization policies cascaded from parent entities
- Privilege-based access control
- Service-layer authorization checks

### Testing Patterns

- Integration tests for GraphQL operations
- Unit tests for service orchestration
- Mock data for test fixtures
- Functional test organization by domain

## Risk Assessment

| Risk                              | Likelihood | Impact | Mitigation                                       |
| --------------------------------- | ---------- | ------ | ------------------------------------------------ |
| Missing nameID handling for memos | Medium     | High   | Verify and add `setNameIdOnMemoData()` if needed |
| Contribution reporter not called  | Low        | Medium | Add explicit call in contribution creation flow  |
| Missing getMemo() method          | High       | High   | Implement following getWhiteboard pattern        |
| Authorization policy gaps         | Low        | Medium | Reuse existing CALLOUT_CONTRIBUTION policy       |
| Test coverage insufficient        | Medium     | Medium | Follow existing test patterns comprehensively    |

## Implementation Checklist

Based on research findings, implementation requires:

- [ ] Add MemoModule import to CalloutContributionModule
- [ ] Inject MemoService into CalloutContributionService constructor
- [ ] Add memo creation logic in createCalloutContribution method
- [ ] Implement getMemo() method in CalloutContributionService
- [ ] Add memo resolver field in CalloutContributionResolverFields
- [ ] Wire contribution reporter call for memo contributions
- [ ] Verify/add nameID handling for memo contributions
- [ ] Create integration tests for memo contribution lifecycle
- [ ] Verify contribution counting includes memos (likely already works)
- [ ] Update any TypeScript interface definitions if IMemo missing from ICalloutContribution

## Conclusion

Research confirms this is a straightforward enablement task with minimal risk. All required infrastructure exists; implementation is primarily wiring existing components following established patterns. Estimated effort: 4-6 hours of development + 2-3 hours of testing.

**Ready to proceed to Phase 1: Design & Contracts**
