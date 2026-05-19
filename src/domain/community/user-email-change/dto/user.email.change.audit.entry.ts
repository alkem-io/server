import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { UserEmailChangeAuditOutcome } from '../enums/user.email.change.audit.outcome';
import { UserEmailChangeInitiatorRole } from '../enums/user.email.change.initiator.role';

/**
 * Minimal user-profile summary used by the audit-entry surface to identify a
 * user without exposing PII beyond id and displayName. The project does not
 * have an existing structurally-equivalent type, so this one is introduced
 * here (per contracts/graphql.md §2 schema-bootstrap note).
 */
@ObjectType('UserProfileSummary', {
  description:
    'Minimal user-profile summary identifying a user without exposing PII beyond id + displayName.',
})
export class UserProfileSummary {
  @Field(() => UUID, { nullable: false })
  id!: string;

  @Field(() => String, { nullable: false })
  displayName!: string;
}

/**
 * PageInfo specifically for the email-change audit query. Mirrors the
 * project's relay-style pagination shape but is feature-scoped so it can be
 * referenced without depending on the private `PageInfo` class in
 * `src/core/pagination/paginated.type.ts`.
 */
@ObjectType('UserEmailChangeAuditEntriesPageInfo')
export class UserEmailChangeAuditEntriesPageInfo {
  @Field(() => String, { nullable: true })
  startCursor?: string;

  @Field(() => String, { nullable: true })
  endCursor?: string;

  @Field(() => Boolean, { nullable: false })
  hasNextPage!: boolean;

  @Field(() => Boolean, { nullable: false })
  hasPreviousPage!: boolean;
}

@ObjectType('UserEmailChangeAuditEntry', {
  description:
    'A single email-change audit-trail entry. Append-only and retained indefinitely (FR-014a).',
})
export class UserEmailChangeAuditEntry {
  @Field(() => UUID, { nullable: false })
  id!: string;

  @Field(() => UserProfileSummary, {
    nullable: false,
    description: 'The user whose email is being changed.',
  })
  subject!: UserProfileSummary;

  @Field(() => UserProfileSummary, {
    nullable: true,
    description:
      'The user who initiated the change. Null for entries whose initiator could not be resolved (early validation rejects); initiatorRole is still present.',
  })
  initiator?: UserProfileSummary;

  @Field(() => UserEmailChangeInitiatorRole, { nullable: false })
  initiatorRole!: UserEmailChangeInitiatorRole;

  @Field(() => String, {
    nullable: true,
    description:
      'Old email at the time of this audit entry. Null only for entries with no old-email context.',
  })
  oldEmail?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'For commit/rollback entries: the proposed/applied new address. For drift_detected entries: the value observed on the Kratos side at the moment of drift.',
  })
  newEmail?: string;

  @Field(() => UserEmailChangeAuditOutcome, { nullable: false })
  outcome!: UserEmailChangeAuditOutcome;

  @Field(() => String, {
    nullable: true,
    description:
      'Short non-leaky failure reason. Set on failure outcomes only.',
  })
  failureReason?: string;

  @Field(() => Date, { nullable: false })
  timestamp!: Date;
}

@ObjectType('UserEmailChangeAuditEntries', {
  description:
    'Cursor-paginated list of email-change audit entries (per docs/Pagination.md).',
})
export class UserEmailChangeAuditEntries {
  @Field(() => [UserEmailChangeAuditEntry], { nullable: false })
  auditEntries!: UserEmailChangeAuditEntry[];

  @Field(() => UserEmailChangeAuditEntriesPageInfo, { nullable: false })
  pageInfo!: UserEmailChangeAuditEntriesPageInfo;

  @Field(() => Number, { nullable: false })
  total!: number;
}
