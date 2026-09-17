import { registerEnumType } from '@nestjs/graphql';

/**
 * The kinds of resource that can block a user from deleting their own
 * account. The first four mirror the account-resource set the platform
 * already refuses deletion for; `SOLE_ORGANIZATION_OWNER` only ever applies
 * on the self branch (an admin deleting someone else must stay able to
 * remove a sole owner so support can hand ownership over on their behalf).
 */
export enum AccountDeletionBlockerKind {
  ACCOUNT_SPACE = 'ACCOUNT_SPACE',
  ACCOUNT_VIRTUAL_CONTRIBUTOR = 'ACCOUNT_VIRTUAL_CONTRIBUTOR',
  ACCOUNT_INNOVATION_PACK = 'ACCOUNT_INNOVATION_PACK',
  ACCOUNT_INNOVATION_HUB = 'ACCOUNT_INNOVATION_HUB',
  SOLE_ORGANIZATION_OWNER = 'SOLE_ORGANIZATION_OWNER',
}

registerEnumType(AccountDeletionBlockerKind, {
  name: 'AccountDeletionBlockerKind',
  description:
    'The kind of resource blocking a user from deleting their own account.',
});
