import { AccountDeletionBlockerKind } from '@common/enums';
import { UUID } from '@domain/common/scalars';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('AccountDeletionBlocker', {
  description:
    'One item blocking a user from deleting their own account — a space, virtual contributor, innovation pack, innovation hub, or an organization the user is the sole owner of.',
})
export class AccountDeletionBlocker {
  @Field(() => AccountDeletionBlockerKind, { nullable: false })
  kind!: AccountDeletionBlockerKind;

  @Field(() => UUID, { nullable: false })
  resourceID!: string;

  @Field(() => String, { nullable: false })
  displayName!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Client-navigable URL of the blocking resource, when one exists.',
  })
  url?: string;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'True when the user can resolve the blocker alone, via the existing account-resources page. False for a sole-owned organization — ownership must be handed over, or support contacted.',
  })
  selfResolvable!: boolean;
}

@ObjectType('AccountDeletionBlockerTotal', {
  description:
    'Accurate per-kind total, independent of whether the itemized blocker list was truncated.',
})
export class AccountDeletionBlockerTotal {
  @Field(() => AccountDeletionBlockerKind, { nullable: false })
  kind!: AccountDeletionBlockerKind;

  @Field(() => Int, { nullable: false })
  total!: number;
}

@ObjectType('MeAccountDeletionStatus', {
  description:
    "Self-scoped pre-flight read for account deletion: whether the calling user can delete their own account right now, and if not, exactly what blocks them. Computed by the same predicate the deleteUser mutation's self-branch guard uses, so the two can never drift. Not gated on session freshness — see sessionFresh.",
})
export class MeAccountDeletionStatus {
  @Field(() => Boolean, {
    nullable: false,
    description: 'True iff no blockers exist for the self branch.',
  })
  canDelete!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'True iff the calling session currently satisfies the privileged freshness window. Advisory for client routing; the deleteUser mutation re-enforces this authoritatively at mutation time.',
  })
  sessionFresh!: boolean;

  @Field(() => [AccountDeletionBlocker], {
    nullable: false,
    description: 'Itemized blockers, capped at 25.',
  })
  blockers!: AccountDeletionBlocker[];

  @Field(() => Boolean, {
    nullable: false,
    description: 'True when the blocker list above was truncated at the cap.',
  })
  truncated!: boolean;

  @Field(() => [AccountDeletionBlockerTotal], {
    nullable: false,
    description: 'Accurate per-kind totals, independent of truncation.',
  })
  totals!: AccountDeletionBlockerTotal[];

  @Field(() => Boolean, {
    nullable: false,
    description:
      'True when the account carries a stored external billing linkage. Surfaced for transparency and captured in the audit record on deletion — never a blocker.',
  })
  externalSubscriptionLinked!: boolean;
}
