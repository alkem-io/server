# Data Model: Default Callout Template for Flow Steps

**Feature**: 019-default-post-template-flow
**Date**: 2026-01-08
**Purpose**: Define entities, relationships, and validation rules

## Entity Changes

### 1. InnovationFlowState (MODIFIED)

**Location**: `src/domain/collaboration/innovation-flow-state/innovation.flow.state.entity.ts`

**New Field**:

```typescript
@ManyToOne(() => Template, {
  eager: false,
  cascade: false,
  onDelete: 'SET NULL',
})
@JoinColumn({ name: 'defaultCalloutTemplateId' })
defaultCalloutTemplate?: Template;
```

**Complete Entity** (relevant fields):

```typescript
@Entity()
export class InnovationFlowState
  extends NameableEntity
  implements IInnovationFlowState
{
  // Existing fields
  @Column('varchar', { length: SMALL_TEXT_LENGTH })
  displayName!: string;

  @Column('text')
  description!: string;

  @Column('int')
  sortOrder!: number;

  @Column('simple-json')
  settings!: IInnovationFlowStateSettings;

  @ManyToOne(() => InnovationFlow, innovationFlow => innovationFlow.states, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  innovationFlow?: InnovationFlow;

  // NEW FIELD
  @ManyToOne(() => Template, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'defaultCalloutTemplateId' })
  defaultCalloutTemplate?: Template;

  @OneToOne(() => Authorization, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  authorization?: Authorization;
}
```

**Validation Rules**:

1. `defaultCalloutTemplate` must be of type `TemplateType.CALLOUT` (validated in service layer)
2. `defaultCalloutTemplate` can be from space or platform library (no space boundary validation)
3. `defaultCalloutTemplate` is optional (nullable)
4. On template deletion, foreign key constraint sets field to NULL (no cascade delete)

**State Transitions**: None (this is configuration, not workflow state)

**Relationships**:

- **Many-to-One** with `Template`: Multiple flow states can share same template
- **Many-to-One** with `InnovationFlow`: Existing relationship (unchanged)

---

### 2. Template (READ ONLY)

**Location**: `src/domain/template/template/template.entity.ts`

**No changes to entity** — existing structure supports this feature.

**Relevant Fields**:

```typescript
@Column('varchar', { length: 128, nullable: false })
type!: TemplateType;  // Must be 'CALLOUT' for default callout templates

@OneToOne(() => Callout, {
  eager: false,
  cascade: true,
  onDelete: 'SET NULL',
})
@JoinColumn()
callout?: Callout;  // Contains the callout structure including contributionDefaults with postDescription
```

**Usage**: Read-only lookup via `TemplateService.getTemplateOrFail(templateID)`

---

## Database Schema Changes

### Migration: AddDefaultCalloutTemplateToFlowState

**Generated File**: `src/migrations/[timestamp]-AddDefaultCalloutTemplateToFlowState.ts`

**Up Migration**:

```sql
-- Add nullable column
ALTER TABLE "innovation_flow_state"
ADD COLUMN IF NOT EXISTS "defaultCalloutTemplateId" uuid;

-- Add foreign key constraint
ALTER TABLE "innovation_flow_state"
ADD CONSTRAINT "FK_innovation_flow_state_defaultCalloutTemplate"
FOREIGN KEY ("defaultCalloutTemplateId")
REFERENCES "template"("id")
ON DELETE SET NULL;
```

**Down Migration**:

```sql
-- Drop foreign key
ALTER TABLE "innovation_flow_state"
DROP CONSTRAINT IF EXISTS "FK_innovation_flow_state_defaultCalloutTemplate";

-- Drop column
ALTER TABLE "innovation_flow_state"
DROP COLUMN IF EXISTS "defaultCalloutTemplateId";
```

**Idempotency**: Uses `IF NOT EXISTS` / `IF EXISTS` clauses

**Data Migration**: None required (nullable column, no default value)

---

## GraphQL Type Changes

### InnovationFlowState Type (MODIFIED)

**Location**: Auto-generated from entity decorators

**New Field**:

```graphql
type InnovationFlowState {
  id: UUID!
  displayName: String!
  description: String!
  sortOrder: Int!
  settings: InnovationFlowStateSettings!
  # ... existing fields

  # NEW FIELD (nullable, backward compatible)
  defaultCalloutTemplate: Template
}
```

**Backward Compatibility**: ✅ Adding nullable field is non-breaking

---

## Service Layer Changes

### InnovationFlowStateService (MODIFIED)

**Location**: `src/domain/collaboration/innovation-flow-state/innovation.flow.state.service.ts`

**New Methods**:

```typescript
/**
 * Set default CALLOUT template for a flow state
 * @throws EntityNotFoundException if flow state or template not found
 * @throws ValidationException if template is not of type CALLOUT
 */
async setDefaultCalloutTemplate(
  flowStateID: string,
  templateID: string,
): Promise<IInnovationFlowState> {
  // 1. Load entities
  const flowState = await this.getFlowStateOrFail(flowStateID);
  const template = await this.templateService.getTemplateOrFail(templateID);

  // 2. Validate template type
  if (template.type !== TemplateType.CALLOUT) {
    this.logger.warning(
      'Attempt to set non-CALLOUT template as default for flow state',
      LogContext.COLLABORATION,
      { flowStateID, templateID, templateType: template.type }
    );
    throw new ValidationException(
      'Template must be of type CALLOUT',
      LogContext.COLLABORATION,
      { templateID, templateType: template.type }
    );
  }

  // 3. Set relation and save
  // Note: Template can be from space or platform library (no space boundary validation)
  flowState.defaultCalloutTemplate = template;
  await this.innovationFlowStateRepository.save(flowState);

  // 4. Log success
  this.logger.verbose(
    'Set default CALLOUT template on flow state',
    LogContext.COLLABORATION,
    { flowStateID, templateID }
  );

  return flowState;
}

/**
 * Remove default CALLOUT template from a flow state
 * @throws EntityNotFoundException if flow state not found
 */
async removeDefaultCalloutTemplate(
  flowStateID: string,
): Promise<IInnovationFlowState> {
  const flowState = await this.getFlowStateOrFail(flowStateID);

  flowState.defaultCalloutTemplate = undefined;
  await this.innovationFlowStateRepository.save(flowState);

  this.logger.verbose(
    'Removed default CALLOUT template from flow state',
    LogContext.COLLABORATION,
    { flowStateID }
  );

  return flowState;
}
```

---

### Frontend Integration (NO BACKEND CHANGES)

**Location**: Frontend codebase (not in this repository)

**Integration Pattern**:

1. **Query Flow State with Template**:

```graphql
query GetCalloutWithFlowState($calloutId: UUID!) {
  callout(ID: $calloutId) {
    id
    collaboration {
      innovationFlow {
        currentState {
          id
          displayName
          defaultCalloutTemplate {
            id # Frontend uses this to fetch full template
          }
        }
      }
    }
  }
}
```

2. **Load Template Before Dialog Opens**:
   - Frontend checks if `currentState.defaultCalloutTemplate.id` exists
   - If yes, fetches template content using existing template loading mechanism
   - Pre-fills "Add Post" dialog form with template data
   - User edits and submits (backend receives final content, no template logic)

3. **Post Creation** (unchanged):
   - Frontend submits `createContributionOnCallout` mutation with final content
   - No backend changes to post creation logic
   - No template reference stored on created post

---

## Validation Rules Summary

| Rule                            | Layer    | Error Type                | Example                                |
| ------------------------------- | -------- | ------------------------- | -------------------------------------- |
| Template type must be CALLOUT   | Service  | `ValidationException`     | `{ templateID, templateType: 'POST' }` |
| Template must exist             | Service  | `EntityNotFoundException` | `{ templateID }`                       |
| Flow state must exist           | Service  | `EntityNotFoundException` | `{ flowStateID }`                      |
| User must have UPDATE privilege | Resolver | `ForbiddenException`      | `{ requiredPrivilege: 'UPDATE' }`      |

---

## Relationship Diagram

```
Space
  └── Collaboration
        └── InnovationFlow
              └── InnovationFlowState (current)
                    └── defaultCalloutTemplate (Template) ──┐
                                                             │
                                                             │
TemplatesSet                                                 │
  └── Template (type: CALLOUT) <─────────────────────────────┘
        └── callout: Callout
              └── contributionDefaults
                    └── postDescription: string
```

**Key Points**:

- `InnovationFlowState` references `Template` (many-to-one)
- `Template` is shared across multiple flow states (reusable)
- `Template` can be from space or platform library (no space boundary validation)
- On template delete: foreign key sets `defaultCalloutTemplate = NULL`

---

## Data Integrity Constraints

1. **Foreign Key Constraint**: `defaultCalloutTemplateId` references `template.id` with `ON DELETE SET NULL`
2. **Type Constraint**: Enforced in service layer (no database CHECK constraint needed)
3. **Template Source**: No space boundary constraint - templates can be from space or platform library
4. **Nullability**: Column is nullable (flow states can exist without default template)

---

## Indexing Considerations

**No new indexes required**:

- `defaultCalloutTemplateId` foreign key automatically creates an index (PostgreSQL standard)
- Low cardinality (few flow states per space, ~5-10 typical)
- Low query frequency (only when admins configure or frontend queries flow state)

---

## Backward Compatibility

**Existing Data**:

- Migration adds nullable column with no default value
- All existing `innovation_flow_state` rows will have `defaultCalloutTemplateId = NULL`
- Frontend continues to work (queries field, gets null if not set)

**GraphQL Schema**:

- New field `InnovationFlowState.defaultCalloutTemplate` is nullable (non-breaking)
- New mutations are additive (non-breaking)
- No deprecated fields

**API Behavior**:

- Clients not querying `defaultCalloutTemplate` see no change
- Frontend "Add Post" dialog works exactly as before when template not set

---

## Next Steps

1. Generate GraphQL schema contracts (mutations, inputs, queries)
2. Generate quickstart guide for local development
3. Update agent context with data model patterns
