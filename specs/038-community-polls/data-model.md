# Data Model: Community Polls & Voting

**Branch**: `038-community-polls` | **Date**: 2026-03-02

## Entity Relationship Diagram (text)

```
CalloutFraming (existing)
  └── poll?: Poll [OneToOne, cascade, nullable]

Poll (NEW)
  ├── id: UUID (PK)
  ├── title: string (MID_TEXT_LENGTH = 512)
  ├── status: PollStatus (enum column)
  ├── settings: JSONB {
  │     minResponses: int (≥ 1),
  │     maxResponses: int (≥ 0, 0 = unlimited),
  │     resultsVisibility: PollResultsVisibility (enum),
  │     resultsDetail: PollResultsDetail (enum)
  │   }
  ├── deadline?: DateTime                    [future-compat]
  ├── options: PollOption[] [OneToMany]
  ├── votes: PollVote[] [OneToMany]
  ├── framing?: CalloutFraming [OneToOne back-ref]
  └── authorization: AuthorizationPolicy [eager]

PollOption (NEW)
  ├── id: UUID (PK)
  ├── text: string (MID_TEXT_LENGTH = 512)
  ├── sortOrder: int
  ├── poll: Poll [ManyToOne back-ref]
  └── updatedDate (from BaseAlkemioEntity)

PollVote (NEW)
  ├── id: UUID (PK)
  ├── createdBy: UUID (voter's user ID; FK → user.id, ON DELETE CASCADE)
  ├── selectedOptionIds: string[] (JSONB)   ← UUIDs referencing poll_option.id
  ├── poll: Poll [ManyToOne back-ref]
  └── updatedDate (from BaseAlkemioEntity)
```

**Three new tables**: `poll`, `poll_option`, `poll_vote`.

## New Enums

```typescript
// src/common/enums/poll.status.ts
export enum PollStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}
```

```typescript
// src/common/enums/poll.results.visibility.ts
export enum PollResultsVisibility {
  HIDDEN = 'hidden',         // results hidden until user has voted
  TOTAL_ONLY = 'total-only', // only total vote count shown before voting
  VISIBLE = 'visible',       // full results always visible (default)
}
```

```typescript
// src/common/enums/poll.results.detail.ts
export enum PollResultsDetail {
  PERCENTAGE = 'percentage', // only percentage per option, no counts or voters
  COUNT = 'count',           // vote count per option, no voter identities
  FULL = 'full',             // counts + voter list per option (default)
}
```

> All `minResponses`, `maxResponses`, `resultsVisibility` and `resultsDetail` and in general anything under `Poll`.`settings` are **immutable after creation** — they cannot be changed once the poll exists.

## PollOption Row Shape

Each option is stored as a dedicated row in `poll_option`:

```typescript
@Entity()
export class PollOption extends BaseAlkemioEntity {
  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  text!: string;

  @Column('int', { nullable: false })
  sortOrder!: number;

  @ManyToOne(() => Poll, poll => poll.options, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  poll?: Poll;
}
```

## Entity Definitions

### Poll Entity

```typescript
// src/domain/collaboration/poll/poll.entity.ts
@Entity()
export class Poll extends AuthorizableEntity implements IPoll {
  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  title!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  status!: PollStatus;  // future-compat: always OPEN in this iteration

  @Column('jsonb', { nullable: false })
  settings!: IPollSettings;  // { minResponses, maxResponses, resultsVisibility, resultsDetail }; immutable after creation

  @Column('timestamp', { nullable: true })
  deadline?: Date;  // future-compat: always null in this iteration

  @OneToMany(() => PollOption, option => option.poll, {
    eager: false,
    cascade: true,
  })
  options?: PollOption[];

  @OneToMany(() => PollVote, vote => vote.poll, {
    eager: false,
    cascade: true,
  })
  votes?: PollVote[];

  @OneToOne(() => CalloutFraming, framing => framing.poll)
  framing?: CalloutFraming;
}
```

### PollOption Entity

```typescript
// src/domain/collaboration/poll-option/poll.option.entity.ts
@Entity()
export class PollOption extends BaseAlkemioEntity implements IPollOption {
  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  text!: string;

  @Column('int', { nullable: false })
  sortOrder!: number;

  @ManyToOne(() => Poll, poll => poll.options, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  poll?: Poll;
}
```

### PollVote Entity

```typescript
// src/domain/collaboration/poll-vote/poll.vote.entity.ts
@Entity()
export class PollVote extends BaseAlkemioEntity implements IPollVote {
  @Column('uuid', { nullable: false })
  createdBy!: string;  // voter's user ID

  @Column('jsonb', { nullable: false })
  selectedOptionIds!: string[];  // UUIDs from poll_option.id

  @ManyToOne(() => Poll, poll => poll.votes, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  poll?: Poll;
}
```

### CalloutFraming Entity Changes

```typescript
// Addition to callout.framing.entity.ts:

@OneToOne(() => Poll, poll => poll.framing, {
  eager: false,
  cascade: true,
  onDelete: 'SET NULL',
})
@JoinColumn()
poll?: Poll;
```

---

## Database Tables

### `poll`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | NOT NULL | PK |
| createdDate | timestamp | NOT NULL | auto |
| updatedDate | timestamp | NOT NULL | auto |
| version | int | NOT NULL | optimistic lock |
| title | varchar(512) | NOT NULL | poll title |
| status | varchar(128) | NOT NULL | 'open' \| 'closed' (always 'open' in v1) |
| settings | jsonb | NOT NULL | `{ minResponses, maxResponses, resultsVisibility, resultsDetail }` — immutable after creation |
| deadline | timestamp | NULL | always NULL in v1 |
| authorizationId | uuid | NULL | FK → authorization_policy(id) ON DELETE SET NULL |

### `poll_option`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | NOT NULL | PK |
| createdDate | timestamp | NOT NULL | auto |
| updatedDate | timestamp | NOT NULL | auto |
| version | int | NOT NULL | optimistic lock |
| text | varchar(512) | NOT NULL | option display text |
| sortOrder | int | NOT NULL | ordering within poll |
| pollId | uuid | NOT NULL | FK → poll(id) ON DELETE CASCADE |
| UNIQUE | | | `(pollId, sortOrder)` |

### `poll_vote`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | NOT NULL | PK |
| createdDate | timestamp | NOT NULL | auto |
| updatedDate | timestamp | NOT NULL | auto |
| version | int | NOT NULL | optimistic lock |
| createdBy | uuid | NOT NULL | voter's user ID; FK → user(id) ON DELETE CASCADE |
| selectedOptionIds | jsonb | NOT NULL | `["option-uuid-1", "option-uuid-2"]` |
| pollId | uuid | NOT NULL | FK → poll(id) ON DELETE CASCADE |
| UNIQUE | | | `(createdBy, pollId)` — one vote per user per poll |

**Mitigation (Risk #6: Vote consistency on account deletion):**
The `createdBy` column now has a database foreign key to the user table with `ON DELETE CASCADE`.

When a user account is deleted, all that user's `PollVote` rows are automatically deleted by the database.
This prevents orphaned votes and keeps poll aggregates consistent without requiring an application-level cleanup job.

### `callout_framing` table changes

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| pollId | uuid | NULL | FK → poll(id) ON DELETE SET NULL |

---

## Validation Rules

### Poll Creation
- Minimum 2 options required — enforced in `PollService.createPoll()`.
- `title` must not be empty; max `MID_TEXT_LENGTH` (512 chars).
- `settings.minResponses` must be ≥ 1. Defaults to 1.
- `settings.maxResponses` must be ≥ 0. Defaults to 1.
- When `settings.maxResponses > 0`, `settings.maxResponses` must be ≥ `settings.minResponses`.
- `settings.resultsVisibility` must be a valid `PollResultsVisibility` value; defaults to `VISIBLE`.
- `settings.resultsDetail` must be a valid `PollResultsDetail` value; defaults to `FULL`.
- The entire `settings` object is **immutable after creation** — any attempt to change any field within it is rejected.
- Option texts must not be empty; max `MID_TEXT_LENGTH` (512 chars).
- Duplicate option texts: warn but allow (per spec edge cases).
- Each new option is persisted as a `poll_option` row with UUID v4 `id` and sequential `sortOrder`.

### Casting or Updating a Vote
- Caller must have `CONTRIBUTE` privilege on the Poll (authorization guard).
- All `selectedOptionIds` must be present in `poll_option.id` for the same `pollId` — any unknown or cross-poll ID is rejected.
- No duplicate IDs within a single submission.
- `selectedOptionIds.length` must be ≥ `poll.settings.minResponses`.
- `selectedOptionIds.length` must be ≤ `poll.settings.maxResponses` when `settings.maxResponses > 0`.
- Zero selections always rejected (covered by `minResponses ≥ 1` constraint).
- When updating an existing vote, the entire `selectedOptionIds` array MUST be provided — partial modifications (adding/removing individual options) are not supported. The system replaces the previous vote entirely.

### Editing a Poll Option's Text
- Caller must have `UPDATE` privilege on the parent Callout.
- All `PollVote` rows containing the target option ID are identified and deleted entirely.
- Each voter whose vote is deleted receives a notification (`SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE`) stating their vote has been removed due to the option text change and inviting them to re-vote.
- The `poll_option` row's `text` field is updated to the new value and `updatedDate` is set to the current timestamp.

### Removing a Poll Option
- Caller must have `UPDATE` privilege on the parent Callout.
- **Minimum options guard (Gap #7)**: The poll must have at least 3 options at the time of removal — removal is rejected if it would leave fewer than 2 options (the minimum required for a valid poll). The system returns a validation error identifying the minimum options constraint.
- All `PollVote` rows containing the target option ID are identified and deleted entirely.
- Each voter whose vote is deleted receives a notification (`SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE`) stating their vote has been removed and inviting them to re-vote.
- The `poll_option` row is deleted and remaining options are re-sequenced (`sortOrder` contiguous).

### Option Reordering
- The provided list must contain exactly all existing option IDs (no additions, no removals).
- `sortOrder` values on `poll_option` rows are reassigned sequentially based on the new list order.

**Mitigation (Risk #4: UNIQUE sortOrder constraint):**
The UNIQUE constraint on `(pollId, sortOrder)` requires a two-pass update strategy:
1. **Pass 1**: Assign temporary `sortOrder` values (e.g. `-1, -2, -3, …`) to all options to break the constraint.
2. **Pass 2**: Assign final sequential `sortOrder` values (`1, 2, 3, …`) in the desired order.

The `PollService.reorderOptions()` method must wrap both passes in a transaction to ensure atomicity. If the operation is interrupted, the temporary negative values ensure no constraint violation occurs during recovery.

---

## Results Computation

Vote counts and voter lists are computed in `PollService` by:

1. Loading `poll_option` rows and all `PollVote` rows for the poll.
2. Building a `Map<optionId, PollVote[]>` in memory.
3. Computing `totalVotes` (count of distinct `PollVote` rows) and per-option `voteCount`.
4. Computing `votePercentage` per option: `(optionVoteCount / totalVotes) * 100`, rounded to 0 decimal places (integer percentage), or `null` when `totalVotes === 0`.
5. Options are always returned in `sortOrder ASC` (configured option order), regardless of visibility gate state (FR-015).
6. Returning enriched `IPollOption` objects (with `voteCount`, `votePercentage`, and `voterIds`).

Field resolvers on `IPollOption.voters` resolve `voterIds` to `IUser` objects via the user lookup service.

**Mitigation (Risk #5: N+1 voters resolver query):**
The `IPollOption.voters` field resolver must use **DataLoader** to batch-load user objects:
1. Collect all distinct `createdBy` UUIDs from all options' `PollVote` rows.
2. Batch-load users from the identity service in a single query (e.g., via a GraphQL DataLoader instance scoped to the request).
3. Cache results in the DataLoader for the request lifetime to avoid duplicate lookups.

This converts N independent user queries into a single batch query, eliminating the N+1 problem. The DataLoader instance is registered in the request context (e.g., via `@Context()` in NestJS resolvers).

### Server-Side Visibility Filtering

Field resolvers apply the `resultsVisibility` and `resultsDetail` settings to control what data is returned:

| `resultsVisibility` | User has voted? | `totalVotes` | `voteCount` | `votePercentage` | `voters` |
|---|---|---|---|---|---|
| `HIDDEN` | No | `null` | `null` | `null` | `null` |
| `HIDDEN` | Yes | value | per detail | per detail | per detail |
| `TOTAL_ONLY` | No | value | `null` | `null` | `null` |
| `TOTAL_ONLY` | Yes | value | per detail | per detail | per detail |
| `VISIBLE` | Either | value | per detail | per detail | per detail |

| `resultsDetail` | `voteCount` | `votePercentage` | `voters` |
|---|---|---|---|
| `PERCENTAGE` | `null` | value | `null` |
| `COUNT` | value | `null` | `null` |
| `FULL` | value | value | resolved |

The derived field `canSeeDetailedResults` is `true` when the visibility gate is passed (i.e., the user has voted or `resultsVisibility` is `VISIBLE`).

---

## State Transitions

### Poll Status (future-compat)

```
OPEN → CLOSED (via future "closePoll" mutation)
```

In this iteration polls are always `OPEN` and cannot be closed via the API.

### Vote Lifecycle

```
(no vote) → CAST    via castPollVote — inserts PollVote row with selectedOptionIds
CAST      → UPDATED via castPollVote — replaces selectedOptionIds entirely (full replacement, not partial)
CAST      → DELETED via option removal — any option the voter selected was removed
```

---

## Interface Definitions

### IPollSettings (GraphQL ObjectType)

```typescript
// src/domain/collaboration/poll/poll.settings.ts
@ObjectType('PollSettings')
export abstract class IPollSettings {
  @Field(() => Int, { nullable: false, description: 'Minimum number of options a voter must select (≥ 1).' })
  minResponses!: number;

  @Field(() => Int, { nullable: false, description: 'Maximum number of options a voter may select (0 = unlimited).' })
  maxResponses!: number;

  @Field(() => PollResultsVisibility, { nullable: false, description: 'Controls when results become visible to voters.' })
  resultsVisibility!: PollResultsVisibility;

  @Field(() => PollResultsDetail, { nullable: false, description: 'Controls how much detail is shown in results.' })
  resultsDetail!: PollResultsDetail;
}
```

### PollSettingsInput (GraphQL InputType)

```typescript
// src/domain/collaboration/poll/dto/poll.dto.create.ts
@InputType('PollSettingsInput')
export class PollSettingsInput {
  @Field(() => Int, { nullable: true, description: 'Minimum selections required. Defaults to 1.' })
  minResponses?: number;

  @Field(() => Int, { nullable: true, description: 'Maximum selections allowed. Defaults to 1. Set to 0 for unlimited.' })
  maxResponses?: number;

  @Field(() => PollResultsVisibility, { nullable: true, description: 'When results become visible. Defaults to VISIBLE.' })
  resultsVisibility?: PollResultsVisibility;

  @Field(() => PollResultsDetail, { nullable: true, description: 'How much detail is shown. Defaults to FULL.' })
  resultsDetail?: PollResultsDetail;
}
```

### IPoll (GraphQL ObjectType)

```typescript
@ObjectType('Poll')
export abstract class IPoll extends IAuthorizable {
  @Field(() => String, { nullable: false, description: 'Poll title.' })
  title!: string;

  @Field(() => PollStatus, { nullable: false })
  status!: PollStatus;

  @Field(() => IPollSettings, { nullable: false, description: 'Poll configuration settings (immutable after creation).' })
  settings!: IPollSettings;

  @Field(() => Date, { nullable: true })
  deadline?: Date;

  @Field(() => Int, { nullable: true, description: 'Total number of votes cast. Null only when resultsVisibility = HIDDEN and the current user has not voted.' })
  totalVotes?: number;  // resolved by field resolver; null when HIDDEN+not-voted only; value in all other visibility states (including TOTAL_ONLY+not-voted)

  @Field(() => Boolean, { nullable: false, description: 'Whether the current user can see detailed results (visibility gate passed).' })
  canSeeDetailedResults!: boolean;  // derived: true when user has voted or settings.resultsVisibility = VISIBLE

  // Resolved by field resolver — enriched with voteCount + voters from PollVote data
  @Field(() => [IPollOption], { nullable: false })
  options!: IPollOption[];

  // Resolved by field resolver — returns current user's vote if they have voted
  @Field(() => IPollVote, { nullable: true, description: 'The current user\'s vote on this poll, if they have voted.' })
  myVote?: IPollVote;

  // Internal — not exposed directly
  votes?: IPollVote[];
  framing?: ICalloutFraming;
}
```

### IPollOption (GraphQL ObjectType)

```typescript
@ObjectType('PollOption')
export abstract class IPollOption {
  @Field(() => UUID, { nullable: false })
  id!: string;

  @Field(() => Date, { nullable: false })
  createdDate!: Date;

  @Field(() => Date, { nullable: false })
  updatedDate!: Date;

  @Field(() => String, { nullable: false })
  text!: string;

  @Field(() => Number, { nullable: false })
  sortOrder!: number;

  @Field(() => Int, { nullable: true, description: 'Number of votes. Null when hidden by resultsVisibility or resultsDetail = PERCENTAGE.' })
  voteCount?: number;  // computed; nullable per visibility rules

  @Field(() => Float, { nullable: true, description: 'Percentage of total votes. Null when hidden by resultsVisibility or resultsDetail = COUNT.' })
  votePercentage?: number;  // computed; nullable per visibility rules; precision = 0 decimals (rounded integer percentage)

  @Field(() => [IUser], { nullable: true, description: 'Voters for this option. Null when hidden by resultsVisibility or resultsDetail != FULL.' })
  voters?: IUser[];  // resolved via field resolver; nullable per visibility rules
}
```

### IPollVote (GraphQL ObjectType)

```typescript
@ObjectType('PollVote')
export abstract class IPollVote extends IBaseAlkemio {
  @Field(() => UUID, { nullable: false })
  createdBy!: string;

  @Field(() => [IPollOption], { nullable: false })
  selectedOptions!: IPollOption[];  // resolved from selectedOptionIds cross-ref with poll_option rows

  poll?: IPoll;
}
```

---

## Authorization Policy Design

| Operation | Required Privilege | Policy Source |
|-----------|-------------------|---------------|
| View poll + options + results | `READ` on Poll | Inherited from CalloutFraming → Callout |
| View voter lists | `READ` on Poll | Same |
| Cast / update vote | `CONTRIBUTE` on Poll | Space member credential |
| Create poll (via createCallout) | `CREATE` on CalloutsSet | Callout create/edit permission |
| Add / edit / remove / reorder options | `UPDATE` on Callout | Callout edit permission |

---

## Migration Strategy

**File**: `src/migrations/{TIMESTAMP}-CommunityPolls.ts`

**Up**:
1. Create `poll` table with columns: `id`, `createdDate`, `updatedDate`, `version`, `title` (`varchar(512)`), `status` (default `'open'`), `settings` (`jsonb` with default `'{"minResponses": 1, "maxResponses": 1, "resultsVisibility": "visible", "resultsDetail": "full"}'`), `deadline`, and `authorizationId`.
2. Create `poll_option` table with FK `pollId` → `poll(id)` ON DELETE CASCADE and UNIQUE `(pollId, sortOrder)`.
3. Create `poll_vote` table with FK `createdBy` → `user(id)` ON DELETE CASCADE, FK `pollId` → `poll(id)` ON DELETE CASCADE, and UNIQUE constraint on `(createdBy, pollId)`.
4. Add `pollId` column to `callout_framing` with FK → `poll(id)` ON DELETE SET NULL.

**Down**: Drop FK from `callout_framing`, drop `poll_vote`, drop `poll_option`, drop `poll`.

Three tables. Clean rollback.
