# Quickstart Guide: Default Callout Template for Flow Steps

**Feature**: 019-default-post-template-flow
**Date**: 2026-01-08
**Audience**: Developers implementing this feature

## Prerequisites

- Node.js 20 LTS installed (Volta will auto-switch)
- pnpm 10.17.1 installed
- PostgreSQL 17.5 running (via Docker or local)
- Access to Alkemio server repository
- Branch `019-default-post-template-flow` checked out

## Local Development Setup

### 1. Install Dependencies

```bash
cd /path/to/alkemio/server
pnpm install
```

### 2. Start Services

Start PostgreSQL, RabbitMQ, and other dependencies:

```bash
pnpm run start:services
```

Wait for services to be ready (check Docker logs):

```bash
docker-compose -f docker-compose.yml logs -f postgres
```

### 3. Run Database Migration

Generate the migration:

```bash
pnpm run migration:generate -n AddDefaultCalloutTemplateToFlowState
```

Review the generated migration file in `src/migrations/[timestamp]-AddDefaultCalloutTemplateToFlowState.ts`

Apply the migration:

```bash
pnpm run migration:run
```

Verify migration status:

```bash
pnpm run migration:show
```

### 4. Start Development Server

```bash
pnpm run start:dev
```

The server will start with hot-reload enabled. GraphQL Playground available at:

```
http://localhost:3000/graphql
```

## Implementation Checklist

### Phase 1: Entity and Migration

- [ ] Modify `InnovationFlowState` entity
  - [ ] Add `defaultCalloutTemplate` field (`@ManyToOne` relation)
  - [ ] Add `@JoinColumn({ name: 'defaultCalloutTemplateId' })`
  - [ ] Import `Template` entity
- [ ] Generate migration
  - [ ] Run `pnpm run migration:generate -n AddDefaultCalloutTemplateToFlowState`
  - [ ] Review generated SQL
  - [ ] Add `IF NOT EXISTS` clauses for idempotency
  - [ ] Test migration locally (`pnpm run migration:run`)
  - [ ] Test rollback (`pnpm run migration:revert`)

### Phase 2: Service Layer

- [ ] Modify `InnovationFlowStateService`
  - [ ] Add `setDefaultCalloutTemplate(flowStateID, templateID)` method
  - [ ] Add `removeDefaultCalloutTemplate(flowStateID)` method
  - [ ] Add `getSpaceForFlowState(flowStateID)` helper method
  - [ ] Add validation: template type must be CALLOUT
  - [ ] Add validation: template space must match flow state space
  - [ ] Add structured logging (verbose, warning)
  - [ ] Inject `TemplateService` dependency

### Phase 3: GraphQL Layer

- [ ] Create DTOs
  - [ ] `SetDefaultCalloutTemplateOnInnovationFlowStateInput` (in `dto/` folder)
  - [ ] `RemoveDefaultCalloutTemplateOnInnovationFlowStateInput` (in `dto/` folder)
- [ ] Modify `InnovationFlowResolver` mutations
  - [ ] Add `setDefaultCalloutTemplateOnInnovationFlowState` mutation
  - [ ] Add `removeDefaultCalloutTemplateOnInnovationFlowState` mutation
  - [ ] Add `@UseGuards(GraphqlGuard)` decorator
  - [ ] Add `@Profiling.api` decorator
  - [ ] Add authorization check (`grantAccessOrFail`)
  - [ ] Add descriptions for both mutations

### Phase 4: Testing

- [ ] Unit tests (`innovation.flow.state.service.spec.ts`)
  - [ ] Test setting default CALLOUT template (success)
  - [ ] Test setting non-CALLOUT template (validation error)
  - [ ] Test setting template from different Space (validation error)
  - [ ] Test removing default template
- [ ] Integration tests (`innovation-flow-state.it-spec.ts`)
  - [ ] Test querying flow state with default template
  - [ ] Test template deletion sets defaultCalloutTemplate to null
  - [ ] Test Space template creation does not preserve defaultCalloutTemplate

### Phase 5: Schema Contract

- [ ] Generate GraphQL schema
  - [ ] Run `pnpm run schema:print`
  - [ ] Run `pnpm run schema:sort`
- [ ] Schema diff
  - [ ] Copy current schema to `tmp/prev.schema.graphql`
  - [ ] Run `pnpm run schema:diff`
  - [ ] Review `change-report.json`
  - [ ] Confirm no BREAKING changes
  - [ ] Document new fields/mutations in PR description

## Testing the Feature

### Manual Testing via GraphQL Playground

1. **Get available CALLOUT templates**:

```graphql
query {
  library {
    templates(filter: { types: [CALLOUT] }) {
      template {
        id
        type
        profile {
          displayName
        }
        callout {
          contributionDefaults {
            postDescription
          }
        }
      }
    }
  }
}
```

2. **Set default template on flow state**:

```graphql
mutation {
  setDefaultCalloutTemplateOnInnovationFlowState(
    setData: {
      flowStateID: "your-flow-state-id"
      templateID: "your-template-id"
    }
  ) {
    id
    displayName
    defaultCalloutTemplate {
      id
      profile {
        displayName
      }
      callout {
        contributionDefaults {
          postDescription
        }
      }
    }
  }
}
```

3. **Query callout with flow state template** (frontend integration):

```graphql
query {
  callout(ID: "your-callout-id") {
    id
    collaboration {
      innovationFlow {
        currentState {
          id
          defaultCalloutTemplate {
            id # Frontend uses this to fetch template
          }
        }
      }
    }
  }
}
```

4. **Remove default template**:

```graphql
mutation {
  removeDefaultCalloutTemplateOnInnovationFlowState(
    removeData: { flowStateID: "your-flow-state-id" }
  ) {
    id
    defaultCalloutTemplate {
      id
    }
  }
}
```

**Note**: Post creation is unchanged. Frontend pre-fills the dialog before user submits.

### Running Automated Tests

**Unit tests only**:

```bash
pnpm test -- innovation.flow.state.service.spec.ts
```

**Integration tests**:

```bash
pnpm test -- innovation-flow-state.it-spec.ts
```

**All tests**:

```bash
pnpm test
```

**With coverage**:

```bash
pnpm test:ci
```

## Database Inspection

### Connect to PostgreSQL

```bash
docker exec -it alkemio_postgres psql -U alkemio -d alkemio
```

### Verify Schema

```sql
-- Check column exists
\d innovation_flow_state

-- Expected output includes:
-- defaultCalloutTemplateId | uuid | | |
```

### Query Data

```sql
-- Find flow states with default templates
SELECT
  ifs.id,
  ifs."displayName",
  ifs."defaultCalloutTemplateId",
  t.type AS template_type
FROM innovation_flow_state ifs
LEFT JOIN template t ON ifs."defaultCalloutTemplateId" = t.id;
```

### Manual Data Setup (for testing)

```sql
-- Find a flow state
SELECT id, "displayName" FROM innovation_flow_state LIMIT 1;

-- Find a CALLOUT template
SELECT id, type FROM template WHERE type = 'CALLOUT' LIMIT 1;

-- Set default template (manual)
UPDATE innovation_flow_state
SET "defaultCalloutTemplateId" = '<template-id>'
WHERE id = '<flow-state-id>';
```

## Troubleshooting

### Migration Fails

**Error**: Column already exists
**Fix**: Check if migration was partially applied. Either revert or skip.

```bash
pnpm run migration:revert
```

**Error**: Foreign key constraint violation
**Fix**: Ensure template ID exists in `template` table.

### GraphQL Errors

**Error**: `Template must be of type CALLOUT`
**Fix**: Ensure you're selecting a template with `type: 'CALLOUT'`, not `'POST'` or other types.

**Error**: `Authorization failed`
**Fix**: Ensure you're authenticated as a Space admin with `UPDATE_INNOVATION_FLOW` privilege.

**Note**: Templates can be from the space OR platform library - no space boundary restriction.

### Service Layer Issues

**Issue**: Frontend not detecting template
**Debug**:

```typescript
// Add debug logging in InnovationFlowStateService
this.logger.verbose(
  'Flow state template configuration',
  LogContext.COLLABORATION,
  {
    flowStateID,
    hasDefaultTemplate: !!flowState.defaultCalloutTemplate,
    templateID: flowState.defaultCalloutTemplate?.id,
  }
);
```

**Issue**: Tests fail with "Cannot read property 'defaultCalloutTemplate' of undefined"
**Fix**: Mock the InnovationFlow, currentState, and defaultCalloutTemplate in test setup:

```typescript
const mockFlowState = {
  id: 'flow-state-1',
  defaultCalloutTemplate: {
    id: 'template-1',
    type: TemplateType.CALLOUT,
    callout: {
      contributionDefaults: {
        postDescription: 'Test template content',
      },
    },
  },
};
```

## Linting and Build

**Run TypeScript compiler**:

```bash
pnpm lint
```

**Fix ESLint issues**:

```bash
pnpm lint:fix
```

**Build**:

```bash
pnpm build
```

## Git Workflow

**Commit changes**:

```bash
git add .
git commit -m "feat: add default callout template for flow steps

- Add defaultCalloutTemplate relation to InnovationFlowState entity
- Implement setDefaultCalloutTemplateOnInnovationFlowState mutation
- Implement removeDefaultCalloutTemplateOnInnovationFlowState mutation
- Expose template ID via GraphQL for frontend pre-fill integration
- Add database migration for defaultCalloutTemplateId column
- Add unit and integration tests

Refs: #019-default-post-template-flow"
```

**Push branch**:

```bash
git push -u origin 019-default-post-template-flow
```

## Next Steps

After completing implementation:

1. Run full test suite: `pnpm test`
2. Run schema diff: `pnpm run schema:diff`
3. Build project: `pnpm build`
4. Create Pull Request
5. Reference spec in PR description: `specs/019-default-post-template-flow/spec.md`
6. Request CODEOWNER review if schema changes are breaking (none expected)

## Useful Commands Reference

| Command                               | Purpose                             |
| ------------------------------------- | ----------------------------------- |
| `pnpm install`                        | Install dependencies                |
| `pnpm run start:services`             | Start Docker services               |
| `pnpm run start:dev`                  | Start dev server (hot reload)       |
| `pnpm run migration:generate -n Name` | Generate migration from entity diff |
| `pnpm run migration:run`              | Apply pending migrations            |
| `pnpm run migration:revert`           | Rollback last migration             |
| `pnpm run migration:show`             | Show migration status               |
| `pnpm test`                           | Run all tests                       |
| `pnpm test -- file.spec.ts`           | Run specific test file              |
| `pnpm lint`                           | Run TypeScript + ESLint checks      |
| `pnpm lint:fix`                       | Auto-fix ESLint issues              |
| `pnpm build`                          | Build production bundle             |
| `pnpm run schema:print`               | Generate schema.graphql             |
| `pnpm run schema:sort`                | Sort schema alphabetically          |
| `pnpm run schema:diff`                | Diff schema vs previous             |

## File Locations Reference

| File                                                                              | Purpose               |
| --------------------------------------------------------------------------------- | --------------------- |
| `src/domain/collaboration/innovation-flow-state/innovation.flow.state.entity.ts`  | Entity definition     |
| `src/domain/collaboration/innovation-flow-state/innovation.flow.state.service.ts` | Service layer logic   |
| `src/domain/collaboration/innovation-flow/innovation.flow.resolver.mutations.ts`  | GraphQL mutations     |
| `src/migrations/[timestamp]-AddDefaultCalloutTemplateToFlowState.ts`              | Database migration    |
| `specs/019-default-post-template-flow/`                                           | Feature documentation |

## Support

For questions or issues:

- Check `CLAUDE.md` for coding standards
- Review `constitution.md` for architectural principles
- Inspect existing similar features (e.g., `CalloutContributionDefaults`)
- Run tests with `--verbose` flag for detailed output
