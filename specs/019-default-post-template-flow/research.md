# Research: Default Post Template for Flow Steps

**Feature**: 019-default-post-template-flow
**Date**: 2026-01-08
**Purpose**: Resolve unknowns from Technical Context and establish implementation patterns

## Research Areas

### 1. TypeORM Optional Relations Pattern

**Decision**: Use `@ManyToOne` with `nullable: true` and `eager: false` for `InnovationFlowState.defaultPostTemplate`

**Rationale**:

- TypeORM best practice for optional relations: mark column as nullable in entity decorator
- `eager: false` prevents automatic loading (reduces query overhead)
- `ManyToOne` is appropriate (many flow states can share same template)
- Column name: `defaultPostTemplateId` (UUID, foreign key to `template.id`)

**Pattern Example** (from existing codebase):

```typescript
// From callout.entity.ts
@ManyToOne(() => Template, {
  eager: false,
  cascade: false,
  onDelete: 'SET NULL',
})
template?: Template;
```

**Alternatives Considered**:

- `@OneToOne`: Rejected—would prevent template reuse across flow states
- `eager: true`: Rejected—unnecessary query overhead for all flow state fetches
- `cascade: true`: Rejected—deleting flow state should not delete template

**Migration Pattern**:

```sql
ALTER TABLE innovation_flow_state
ADD COLUMN IF NOT EXISTS "defaultPostTemplateId" uuid;

ALTER TABLE innovation_flow_state
ADD CONSTRAINT "FK_innovation_flow_state_defaultPostTemplate"
FOREIGN KEY ("defaultPostTemplateId")
REFERENCES template(id)
ON DELETE SET NULL;
```

---

### 2. GraphQL Mutation Authorization Pattern

**Decision**: Use existing `@Profiling` and authorization decorators with `AuthorizationPrivilege.UPDATE_INNOVATION_FLOW`

**Rationale**:

- Alkemio uses decorator-based authorization (NestJS guards)
- `UPDATE_INNOVATION_FLOW` privilege already exists for flow state mutations
- Follows existing pattern from `innovation.flow.resolver.mutations.ts`

**Pattern Example** (from existing mutations):

```typescript
@UseGuards(GraphqlGuard)
@Mutation(() => InnovationFlowState, {
  description: 'Set the default post template for an innovation flow state.',
})
@Profiling.api
async setDefaultPostTemplateOnInnovationFlowState(
  @Args('setData') setData: SetDefaultPostTemplateOnInnovationFlowStateInput,
  @CurrentUser() agentInfo: AgentInfo,
): Promise<IInnovationFlowState> {
  const flowState = await this.innovationFlowStateService.getFlowStateOrFail(
    setData.flowStateID
  );

  // Authorization check happens here via service method
  await this.authorizationService.grantAccessOrFail(
    agentInfo,
    flowState.authorization,
    AuthorizationPrivilege.UPDATE,
    `set default post template on flow state: ${flowState.id}`
  );

  return await this.innovationFlowStateService.setDefaultPostTemplate(
    setData.flowStateID,
    setData.templateID,
  );
}
```

**Alternatives Considered**:

- New privilege `SET_DEFAULT_TEMPLATE`: Rejected—too granular, UPDATE covers this
- Public mutation: Rejected—violates Principle 8 (admin-only configuration)

---

### 3. Template Type Validation Pattern

**Decision**: Validate `template.type === TemplateType.CALLOUT` in service layer before setting

**Rationale**:

- Domain validation belongs in service layer (Principle 1)
- Prevents invalid state (flow state with non-CALLOUT template)
- Returns clear error message via GraphQL error codes

**Pattern Example**:

```typescript
// In innovation.flow.state.service.ts
async setDefaultPostTemplate(
  flowStateID: string,
  templateID: string,
): Promise<IInnovationFlowState> {
  const flowState = await this.getFlowStateOrFail(flowStateID);
  const template = await this.templateService.getTemplateOrFail(templateID);

  // Validation
  if (template.type !== TemplateType.CALLOUT) {
    this.logger.warning(
      `Attempt to set non-CALLOUT template as default for flow state`,
      LogContext.COLLABORATION,
      { flowStateID, templateID, templateType: template.type }
    );
    throw new ValidationException(
      'Template must be of type CALLOUT',
      LogContext.COLLABORATION,
      { templateID, templateType: template.type }
    );
  }

  flowState.defaultPostTemplate = template;
  await this.innovationFlowStateRepository.save(flowState);

  this.logger.verbose(
    `Set default post template on flow state`,
    LogContext.COLLABORATION,
    { flowStateID, templateID }
  );

  return flowState;
}
```

**Alternatives Considered**:

- GraphQL enum constraint: Rejected—type validation happens at runtime, not schema level
- Client-side filtering: Rejected—backend must enforce business rules

---

### 4. Template Loading Pattern for Dialog Pre-fill

**Decision**: Expose `defaultPostTemplate.id` via GraphQL query on flow state, frontend fetches template content before opening dialog

**Rationale**:

- Template content must be loaded BEFORE the "Add Post" dialog opens (to pre-fill the form)
- Backend provides the default template reference via the flow state query
- Frontend uses the template ID to fetch full template content (via existing `fetchTemplateContent` mechanism)
- This follows the same pattern used by admins in settings (both admin and user need the default template, just in different contexts)

**Query Pattern**:

```graphql
query GetCalloutWithFlowState($calloutId: UUID!) {
  callout(ID: $calloutId) {
    id
    collaboration {
      innovationFlow {
        currentState {
          id
          displayName
          defaultPostTemplate {
            id # Frontend uses this to fetch full template content
          }
        }
      }
    }
  }
}
```

**Frontend Flow**:

1. User navigates to a flow step (callout grouped by flow state)
2. Frontend already has the `currentState.defaultPostTemplate.id` from the callout query
3. When user clicks "Add Post":
   - If `defaultPostTemplate.id` exists, fetch template content: `fetchTemplateContent(templateId)`
   - Pre-fill dialog form with `template.postDefaultDescription` and other template data
   - User edits the pre-filled content as needed
4. When user submits, create post with the final content (no template reference on the post itself)

**Key Differences from Original Approach**:

- ❌ **NOT** loading template during post creation in `CalloutService.createContributionOnCallout()`
- ✅ Loading template ID from flow state query (same query used by admin settings)
- ✅ Frontend fetches template content when dialog opens (pre-fill happens client-side)
- ✅ Post creation receives final user content (no template logic in mutation)

**Alternatives Considered**:

- Backend applies template during mutation: Rejected—template needs to be loaded before dialog opens, not after submission
- Separate query for template ID: Rejected—can piggyback on existing callout query that includes flow state

---

### 5. GraphQL Schema Field Resolver Pattern

**Decision**: Add `defaultPostTemplate` field to `InnovationFlowState` GraphQL type, use TypeORM relation (no custom field resolver needed)

**Rationale**:

- TypeORM relation fields automatically resolve in GraphQL (NestJS generates resolver)
- No manual field resolver needed unless custom logic required
- Nullable field (`Template` or `null`) matches database schema

**Schema Change**:

```graphql
type InnovationFlowState {
  id: UUID!
  displayName: String!
  description: String!
  # ... existing fields
  defaultPostTemplate: Template # NEW: nullable
}
```

**Alternatives Considered**:

- Custom field resolver with loader: Rejected—overkill for simple relation
- Separate query: Rejected—increases client complexity

---

### 6. Database Migration Best Practices (PostgreSQL 17.5)

**Decision**: Use TypeORM migration generator, then manually review and add idempotent guards

**Rationale**:

- TypeORM generates migration from entity diff
- Manually add `IF NOT EXISTS` clauses for idempotency (Principle 9)
- Test migration on dev database before committing

**Migration Generation Command**:

```bash
pnpm run migration:generate -n AddDefaultPostTemplateToFlowState
```

**Expected Migration**:

```typescript
export class AddDefaultPostTemplateToFlowState1704700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column
    await queryRunner.query(`
      ALTER TABLE "innovation_flow_state"
      ADD COLUMN IF NOT EXISTS "defaultPostTemplateId" uuid
    `);

    // Add foreign key constraint
    const table = await queryRunner.getTable('innovation_flow_state');
    const foreignKey = new TableForeignKey({
      columnNames: ['defaultPostTemplateId'],
      referencedTableName: 'template',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
    });

    // Check if FK already exists before adding
    const existingFK = table?.foreignKeys.find(fk =>
      fk.columnNames.includes('defaultPostTemplateId')
    );
    if (!existingFK) {
      await queryRunner.createForeignKey('innovation_flow_state', foreignKey);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('innovation_flow_state');
    const foreignKey = table?.foreignKeys.find(fk =>
      fk.columnNames.includes('defaultPostTemplateId')
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('innovation_flow_state', foreignKey);
    }

    // Drop column
    await queryRunner.query(`
      ALTER TABLE "innovation_flow_state"
      DROP COLUMN IF EXISTS "defaultPostTemplateId"
    `);
  }
}
```

**Alternatives Considered**:

- Raw SQL migration: Rejected—TypeORM migrations are project standard
- Non-idempotent migration: Rejected—violates Architecture Standard #3

---

### 7. Logging Context and Exception Details Pattern

**Decision**: Use `LogContext.COLLABORATION` with structured exception details (no dynamic data in messages)

**Rationale**:

- Principle 5: Exception messages are immutable identifiers
- Dynamic data (IDs, types) go in `details` property
- Queryable logs without leaking runtime specifics

**Pattern Example**:

```typescript
// CORRECT
throw new ValidationException(
  'Template must be of type CALLOUT',
  LogContext.COLLABORATION,
  { templateID, templateType: template.type } // details object
);

// INCORRECT (violates Principle 5)
throw new ValidationException(
  `Template ${templateID} must be of type CALLOUT, but is ${template.type}`,
  LogContext.COLLABORATION
);
```

**Log Levels**:

- `verbose`: Successful operations (set/remove template)
- `warning`: Invalid operations (wrong template type)
- `error`: Unexpected failures (database errors, service crashes)

---

## Technology Choices Summary

| Technology       | Choice                                     | Rationale                                   |
| ---------------- | ------------------------------------------ | ------------------------------------------- |
| Entity Relation  | `@ManyToOne` nullable                      | Allows template reuse, optional             |
| Authorization    | `UPDATE_INNOVATION_FLOW` privilege         | Existing privilege covers flow state config |
| Validation       | Service layer type check                   | Domain logic in domain layer                |
| Template Loading | Traverse Callout → Flow → State → Template | Existing relation graph                     |
| GraphQL Field    | Auto-resolved TypeORM relation             | Simple, no custom resolver needed           |
| Migration        | TypeORM generator + manual idempotency     | Project standard + best practice            |
| Logging          | Structured details, immutable messages     | Constitution Principle 5                    |

---

## Open Questions Resolved

**Q1: Should we support multiple default templates per flow state?**
**A1**: No. Single template keeps UX simple. Feature spec states "a default post template" (singular).

**Q2: Should we validate template belongs to same Space as flow?**
**A2**: Yes. Add validation to ensure `template.templatesSet.space === flowState.innovationFlow.collaboration.space`. This prevents cross-space template references.

**Q3: Should removing a template from the library also remove it from flow states?**
**A3**: No. Database constraint uses `ON DELETE SET NULL`. Flow state keeps functioning (no template pre-fill).

**Q4: Should we emit a domain event when default template is set?**
**A4**: No. Configuration change, not a business event. No subscribers need to react.

**Q5: How to handle concurrent updates (two admins setting different templates)?**
**A5**: Database ACID guarantees handle this. Last write wins. No locking needed for low-frequency config changes.

---

## Implementation Risks

| Risk                                                     | Mitigation                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| N+1 query problem (loading template for each flow state) | Use `eager: false`, load only when needed. Frontend fetches explicitly.         |
| Breaking existing post creation                          | Comprehensive integration tests, backward compatibility (template is optional). |
| Migration failure on production                          | Test on snapshot database, use idempotent SQL, include rollback strategy.       |
| Authorization bypass                                     | Reuse existing guards, integration tests verify admin-only access.              |

---

## Next Steps (Phase 1)

1. Generate `data-model.md` with entity definitions
2. Generate GraphQL schema contracts in `contracts/`
3. Generate `quickstart.md` for local development
4. Update agent context with new patterns

**Phase 0 Complete** ✅
