# Quickstart: Enable Memo as Valid Collection Contribution Type

**Feature**: 016-memo-collection-contribution
**Date**: 2025-11-06
**Audience**: Developers implementing this feature

## Overview

This quickstart provides a step-by-step guide to enable memo contributions in collection callouts. The implementation involves minimal changes to existing services following established patterns.

**Estimated Time**: 4-6 hours development + 2-3 hours testing

## Prerequisites

- [x] Node.js 20.15.1 (Volta managed)
- [x] pnpm 10.17.1
- [x] Running MySQL 8 instance
- [x] Existing Alkemio server codebase checked out on branch `016-memo-collection-contribution`
- [x] Understanding of NestJS dependency injection and TypeORM patterns

## Implementation Steps

### Step 1: Add Module Dependency (5 minutes)

**File**: `src/domain/collaboration/callout-contribution/callout.contribution.module.ts`

**Action**: Import MemoModule to enable dependency injection of MemoService

```typescript
// Add to imports array
import { MemoModule } from '@domain/common/memo';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    WhiteboardModule,
    PostModule,
    NamingModule,
    LinkModule,
    UserLookupModule,
    RoleSetModule,
    PlatformRolesAccessModule,
    MemoModule,  // ← ADD THIS LINE
    TypeOrmModule.forFeature([CalloutContribution]),
  ],
  // ... rest unchanged
})
```

**Verification**:

```bash
pnpm run build
# Should compile without circular dependency errors
```

---

### Step 2: Inject MemoService (5 minutes)

**File**: `src/domain/collaboration/callout-contribution/callout.contribution.service.ts`

**Action**: Add MemoService to constructor dependencies

```typescript
import { MemoService } from '@domain/common/memo';

@Injectable()
export class CalloutContributionService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private postService: PostService,
    private whiteboardService: WhiteboardService,
    private linkService: LinkService,
    private memoService: MemoService, // ← ADD THIS LINE
    @InjectRepository(CalloutContribution)
    private contributionRepository: Repository<CalloutContribution>
  ) {}

  // ... rest of class
}
```

**Verification**:

```bash
pnpm run build
# Should compile successfully
```

---

### Step 3: Add Memo Creation Logic (15 minutes)

**File**: `src/domain/collaboration/callout-contribution/callout.contribution.service.ts`

**Location**: In `createCalloutContribution()` method, after existing post/whiteboard/link creation blocks

**Action**: Add memo creation following existing pattern

```typescript
public async createCalloutContribution(
  calloutContributionData: CreateCalloutContributionInput,
  storageAggregator: IStorageAggregator,
  contributionSettings: ICalloutSettingsContribution,
  userID: string
): Promise<ICalloutContribution> {
  this.validateContributionType(
    calloutContributionData,
    contributionSettings
  );
  const contribution: ICalloutContribution = CalloutContribution.create(
    calloutContributionData
  );

  contribution.authorization = new AuthorizationPolicy(
    AuthorizationPolicyType.CALLOUT_CONTRIBUTION
  );
  contribution.createdBy = userID;
  contribution.sortOrder = calloutContributionData.sortOrder ?? 0;

  const { post, whiteboard, link, memo } = calloutContributionData;  // ← ADD memo destructure

  if (whiteboard) {
    contribution.whiteboard = await this.whiteboardService.createWhiteboard(
      whiteboard,
      storageAggregator,
      userID
    );
  }

  if (post) {
    contribution.post = await this.postService.createPost(
      post,
      storageAggregator,
      userID
    );
  }

  if (link) {
    contribution.link = await this.linkService.createLink(
      link,
      storageAggregator
    );
  }

  // ↓ ADD THIS BLOCK
  if (memo) {
    contribution.memo = await this.memoService.createMemo(
      memo,
      storageAggregator,
      userID
    );
  }
  // ↑ END ADD

  return contribution;
}
```

**Verification**:

```bash
pnpm run build
pnpm run lint
# Both should pass
```

---

### Step 4: Implement getMemo() Method (10 minutes)

**File**: `src/domain/collaboration/callout-contribution/callout.contribution.service.ts`

**Location**: After existing `getPost()`, `getWhiteboard()`, `getLink()` methods

**Action**: Add getMemo() method following existing pattern

```typescript
public async getMemo(
  calloutContributionInput: ICalloutContribution,
  relations?: FindOptionsRelations<ICalloutContribution>
): Promise<IMemo | null> {
  const contribution = await this.getCalloutContributionOrFail(
    calloutContributionInput.id,
    {
      relations: {
        memo: true,
        ...relations,
      },
    }
  );

  if (!contribution.memo) return null;

  return contribution.memo;
}
```

**Verification**:

```bash
pnpm run build
# Should compile successfully
```

---

### Step 5: Add Memo Resolver Field (15 minutes)

**File**: `src/domain/collaboration/callout-contribution/callout.contribution.resolver.fields.ts`

**Location**: After existing `post()`, `whiteboard()`, `link()` resolver fields

**Action**: Add memo resolver field

```typescript
import { IMemo } from '@domain/common/memo/memo.interface';

@Resolver(() => ICalloutContribution)
export class CalloutContributionResolverFields {
  // ... existing constructor and fields

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

  // ... rest of fields
}
```

**Verification**:

```bash
pnpm run build
# Schema should compile
```

---

### Step 6: Verify Interface Definition (5 minutes)

**File**: `src/domain/collaboration/callout-contribution/callout.contribution.interface.ts`

**Action**: Ensure IMemo field is present (should already exist)

```typescript
import { IMemo } from '@domain/common/memo/memo.interface';

@ObjectType('CalloutContribution')
export abstract class ICalloutContribution extends IAuthorizable {
  link?: ILink;
  whiteboard?: IWhiteboard;
  post?: IPost;
  memo?: IMemo; // ← VERIFY THIS EXISTS

  createdBy?: string;
  callout?: ICallout;

  @Field(() => Number, {
    nullable: false,
    description: 'The sorting order for this Contribution.',
  })
  sortOrder!: number;
}
```

**If missing**: Add the `memo?: IMemo;` field and import statement.

---

### Step 7: Wire Contribution Reporter (Optional but Recommended - 10 minutes)

**File**: `src/domain/collaboration/callout/callout.resolver.mutations.ts`

**Location**: In `createContributionOnCallout()` method, after contribution creation

**Action**: Add activity reporting for memo contributions

```typescript
// Find existing processActivity methods like processActivityPostCreated
// Add similar method:

private async processActivityMemoCreated(
  callout: ICallout,
  contribution: ICalloutContribution,
  memo: IMemo,
  levelZeroSpaceID: string,
  agentInfo: AgentInfo
) {
  this.contributionReporter.memoContribution(
    {
      id: memo.id,
      name: memo.profile?.displayName || memo.nameID,
      space: levelZeroSpaceID,
    },
    {
      id: agentInfo.userID,
      email: agentInfo.email,
    }
  );
}

// Then in createContributionOnCallout, after contribution creation:
if (contribution.memo) {
  await this.processActivityMemoCreated(
    callout,
    contribution,
    contribution.memo,
    levelZeroSpaceID,
    agentInfo
  );
}
```

**Note**: The `ContributionReporterService.memoContribution()` method already exists.

---

### Step 8: Handle NameID for Memos (10 minutes)

**File**: `src/domain/collaboration/callout/callout.service.ts`

**Location**: In `createContributionOnCallout()` method

**Action**: Add nameID handling for memos (if not already present)

```typescript
public async createContributionOnCallout(
  contributionData: CreateContributionOnCalloutInput,
  userID: string
): Promise<ICalloutContribution> {
  const calloutID = contributionData.calloutID;
  const callout = await this.getCalloutOrFail(calloutID, {
    relations: {
      contributions: true,
    },
  });

  // ... existing validation

  const reservedNameIDs =
    await this.namingService.getReservedNameIDsInCalloutContributions(
      calloutID
    );

  if (contributionData.whiteboard) {
    await this.setNameIdOnWhiteboardData(
      contributionData.whiteboard,
      reservedNameIDs
    );
  }

  if (contributionData.post) {
    await this.setNameIdOnPostData(
      contributionData.post,
      reservedNameIDs
    );
  }

  // ↓ ADD THIS BLOCK
  if (contributionData.memo) {
    await this.setNameIdOnMemoData(
      contributionData.memo,
      reservedNameIDs
    );
  }
  // ↑ END ADD

  // ... rest of method
}

// ↓ ADD THIS METHOD (if it doesn't exist)
private async setNameIdOnMemoData(
  memoData: CreateMemoInput,
  reservedNameIDs: string[]
): Promise<void> {
  if (!memoData.nameID) {
    if (!memoData.profileData?.displayName) {
      throw new ValidationException(
        'Memo must have either nameID or profile displayName',
        LogContext.COLLABORATION
      );
    }
    memoData.nameID = await this.namingService.createNameIdAvoidingReservedNameIDs(
      memoData.profileData.displayName,
      reservedNameIDs
    );
  } else {
    if (reservedNameIDs.includes(memoData.nameID)) {
      throw new ValidationException(
        `The provided nameID is already taken: ${memoData.nameID}`,
        LogContext.COLLABORATION
      );
    }
  }
}
// ↑ END ADD
```

---

### Step 9: Generate and Validate GraphQL Schema (5 minutes)

```bash
# Regenerate schema
pnpm run schema:print

# Sort schema
pnpm run schema:sort

# Validate schema (no differences expected since MEMO already in baseline)
pnpm run schema:diff
```

**Expected**: No schema changes detected since CalloutContributionType.MEMO already exists.

---

### Step 10: Run Tests (30 minutes)

**Create Integration Test**:

**File**: `test/functional/integration/callout-contribution/memo-contribution.it.spec.ts` (new file)

```typescript
import { TestUser } from '@test/utils';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';

const uniqueId = UniqueIDGenerator.getID();

describe('Memo Contributions', () => {
  beforeAll(async () => {
    // Setup test space, callout with MEMO in allowedTypes
  });

  test('should create memo contribution when type is allowed', async () => {
    const contributionData = {
      calloutID: testCalloutId,
      type: CalloutContributionType.MEMO,
      memo: {
        profileData: {
          displayName: `Test Memo ${uniqueId}`,
        },
        markdown: '# Test Content',
        contentUpdatePolicy: 'CONTRIBUTORS',
      },
    };

    const response = await createContributionOnCallout(
      contributionData,
      TestUser.SPACE_MEMBER
    );

    expect(response.data?.createContributionOnCallout).toBeDefined();
    expect(response.data?.createContributionOnCallout.type).toBe('MEMO');
    expect(response.data?.createContributionOnCallout.memo).toBeDefined();
  });

  test('should reject memo contribution when type not allowed', async () => {
    // Test with callout that has allowedTypes: [POST, WHITEBOARD]
    const response = await createContributionOnCallout(
      { calloutID: restrictedCalloutId, type: 'MEMO', memo: {...} },
      TestUser.SPACE_MEMBER
    );

    expect(response.errors).toBeDefined();
    expect(response.errors[0].message).toContain('not in the allowed types');
  });

  test('should query memo contributions', async () => {
    const response = await getCalloutContributions(testCalloutId, {
      filter: { types: [CalloutContributionType.MEMO] },
    });

    expect(response.data?.lookup.callout.contributions).toBeDefined();
    expect(response.data?.lookup.callout.contributions.length).toBeGreaterThan(0);
    expect(response.data?.lookup.callout.contributions[0].type).toBe('MEMO');
  });

  test('should include memo in contribution count', async () => {
    const response = await getCalloutContributionCount(testCalloutId);

    expect(response.data?.lookup.callout.contributionsCount.memo).toBeGreaterThan(0);
  });
});
```

**Run Tests**:

```bash
# Run all tests
pnpm run test:ci

# Run specific test file
pnpm run test:ci test/functional/integration/callout-contribution/memo-contribution.it.spec.ts

# Check for failures
echo $?  # Should be 0
```

---

### Step 11: Manual Testing via GraphQL Playground (15 minutes)

**1. Start Server**:

```bash
pnpm run start:services  # Start dependencies
pnpm run migration:run   # Ensure DB schema up to date
pnpm run start:dev       # Start server with hot reload
```

**2. Navigate to GraphQL Playground**:

```
http://localhost:3000/graphiql
```

**3. Create Test Callout with Memo Allowed**:

```graphql
mutation {
  createCallout(
    calloutData: {
      framing: { profile: { displayName: "Test Memo Collection" } }
      type: COLLECTION
      settings: { contribution: { enabled: true, allowedTypes: [MEMO, POST] } }
    }
  ) {
    id
    nameID
  }
}
```

**4. Create Memo Contribution**:

```graphql
mutation {
  createContributionOnCallout(
    contributionData: {
      calloutID: "CALLOUT_ID_FROM_ABOVE"
      type: MEMO
      memo: {
        profileData: {
          displayName: "My First Memo"
          description: "Testing memo contributions"
        }
        markdown: "# Hello\n\nThis is a test memo!"
        contentUpdatePolicy: CONTRIBUTORS
      }
    }
  ) {
    id
    type
    memo {
      id
      nameID
      profile {
        displayName
      }
      markdown
      createdBy {
        profile {
          displayName
        }
      }
    }
  }
}
```

**5. Query Memo Contributions**:

```graphql
query {
  lookup {
    callout(ID: "CALLOUT_ID") {
      contributions(filter: { types: [MEMO] }) {
        id
        type
        memo {
          id
          profile {
            displayName
          }
          markdown
          updatedDate
        }
      }
    }
  }
}
```

**6. Check Contribution Count**:

```graphql
query {
  lookup {
    callout(ID: "CALLOUT_ID") {
      contributionsCount {
        post
        whiteboard
        link
        memo
      }
    }
  }
}
```

---

## Validation Checklist

After implementation, verify:

- [ ] `pnpm run build` succeeds
- [ ] `pnpm run lint` passes with no errors
- [ ] `pnpm run test:ci` all tests pass
- [ ] Schema diff shows no breaking changes
- [ ] Memo contributions can be created via GraphQL
- [ ] Memo contributions appear in queries
- [ ] Contribution filtering by MEMO type works
- [ ] Contribution count includes memos
- [ ] Authorization checks work correctly
- [ ] Validation errors are thrown for invalid inputs
- [ ] ElasticSearch indexing works (check logs)
- [ ] NameID collision prevention works

---

## Troubleshooting

### Issue: Circular dependency error during build

**Cause**: Incorrect import order or missing module export

**Solution**:

1. Check that MemoModule exports MemoService
2. Verify import paths use `@domain/*` aliases
3. Run `pnpm run circular-dependencies` to identify cycles

---

### Issue: "Cannot read property 'memo' of undefined"

**Cause**: Memo relation not loaded from database

**Solution**:

1. Check `getMemo()` method includes `memo: true` in relations
2. Verify entity relationship is configured with `@OneToOne` decorator
3. Ensure CalloutContribution entity has `memo` field

---

### Issue: Validation error "type is 'memo' but no memo data provided"

**Cause**: Contribution type is MEMO but memo field is null/undefined

**Solution**:

1. Verify GraphQL mutation includes `memo` input object
2. Check that `contributionData.memo` is destructured in service
3. Confirm `if (memo)` block is present in createCalloutContribution

---

### Issue: NameID collision errors

**Cause**: NameID already exists in callout contributions

**Solution**:

1. Implement `setNameIdOnMemoData()` method following post/whiteboard pattern
2. Ensure method is called before contribution creation
3. Use `NamingService.createNameIdAvoidingReservedNameIDs()`

---

### Issue: Tests fail with "Cannot find module '@domain/common/memo'"

**Cause**: Test environment import path resolution issue

**Solution**:

1. Check `tsconfig.json` includes proper path mappings
2. Verify `jest.config.js` has moduleNameMapper for `@domain/*`
3. Restart Jest with `--clearCache` flag

---

## Performance Validation

After implementation, measure:

```bash
# Query 100 contributions including memos
# Should complete in <200ms
time curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { lookup { callout(ID: \"...\") { contributions { memo { id } } } } }"}'

# Check contribution count query
# Should complete in <20ms
time curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { lookup { callout(ID: \"...\") { contributionsCount { memo } } } }"}'
```

---

## Rollout Strategy

1. **Merge to develop**: After all tests pass
2. **Deploy to dev environment**: Validate with real data
3. **Monitor ElasticSearch indexes**: Ensure memo contributions indexed
4. **Deploy to staging**: Full integration testing
5. **Deploy to production**: Gradual rollout with monitoring

---

## Success Criteria

- ✅ Users can create memo contributions in collections where enabled
- ✅ Memo contributions query with complete metadata in <200ms
- ✅ Contribution counts include memos with 100% accuracy
- ✅ All existing tests continue to pass
- ✅ No GraphQL schema breaking changes
- ✅ Authorization checks complete in <50ms per contribution

---

## Next Steps

After implementing this feature:

1. Update API documentation with memo contribution examples
2. Notify front-end team that memo contributions are available
3. Create user-facing documentation for enabling memo collections
4. Monitor production metrics for memo contribution usage

---

## Support

**Questions?** Check:

- Research findings: [research.md](./research.md)
- Data model: [data-model.md](./data-model.md)
- API contracts: [contracts/memo-contribution.graphql.md](./contracts/memo-contribution.graphql.md)
- Constitution check: [plan.md](./plan.md#constitution-check)

**Issues?** File under:

- Feature spec: `specs/016-memo-collection-contribution`
- GitHub issue label: `feature:memo-contributions`
