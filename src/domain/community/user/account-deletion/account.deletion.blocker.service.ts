import { AccountDeletionBlockerKind } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CredentialService } from '@domain/actor/credential/credential.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

export const ACCOUNT_DELETION_BLOCKER_LIST_CAP = 25;

export interface AccountDeletionBlocker {
  kind: AccountDeletionBlockerKind;
  resourceID: string;
  displayName: string;
  selfResolvable: boolean;
}

export interface AccountDeletionBlockerTotal {
  kind: AccountDeletionBlockerKind;
  total: number;
}

export interface AccountDeletionBlockersResult {
  canDelete: boolean;
  blockers: AccountDeletionBlocker[];
  totals: AccountDeletionBlockerTotal[];
  truncated: boolean;
}

export type AccountDeletionInitiatorBranch = 'self' | 'admin';

const SELF_RESOLVABLE_KINDS = new Set<AccountDeletionBlockerKind>([
  AccountDeletionBlockerKind.ACCOUNT_SPACE,
  AccountDeletionBlockerKind.ACCOUNT_VIRTUAL_CONTRIBUTOR,
  AccountDeletionBlockerKind.ACCOUNT_INNOVATION_PACK,
  AccountDeletionBlockerKind.ACCOUNT_INNOVATION_HUB,
]);

/**
 * The single implementation behind both the `me.accountDeletion` pre-flight
 * read and the `deleteUser` mutation's blocked-refusal guard, so the two can
 * never drift apart. `branch` controls the one behavioral difference between
 * initiators: an account that is the sole owner of an organization blocks
 * self-deletion (the platform's own "an organization always has an owner"
 * invariant), but must never block an admin acting on someone else's
 * account — the admin path is precisely how a sole owner otherwise gets
 * unblocked (with support's help) when the user themselves cannot resolve
 * it alone.
 */
@Injectable()
export class AccountDeletionBlockerService {
  constructor(
    private accountLookupService: AccountLookupService,
    private organizationLookupService: OrganizationLookupService,
    private credentialService: CredentialService
  ) {}

  public async getBlockers(
    userID: string,
    accountID: string,
    branch: AccountDeletionInitiatorBranch,
    em?: EntityManager
  ): Promise<AccountDeletionBlockersResult> {
    const resourceResult =
      await this.accountLookupService.getAccountResourceBlockers(
        accountID,
        { cap: ACCOUNT_DELETION_BLOCKER_LIST_CAP },
        em
      );

    const blockers: AccountDeletionBlocker[] = resourceResult.blockers.map(
      blocker => ({
        ...blocker,
        selfResolvable: SELF_RESOLVABLE_KINDS.has(blocker.kind),
      })
    );
    const totals: AccountDeletionBlockerTotal[] = [...resourceResult.totals];
    let truncated = resourceResult.truncated;

    if (branch === 'self') {
      const soleOwnerships = await this.getSoleOrganizationOwnerships(
        userID,
        em
      );
      totals.push({
        kind: AccountDeletionBlockerKind.SOLE_ORGANIZATION_OWNER,
        total: soleOwnerships.length,
      });

      const remainingCapacity =
        ACCOUNT_DELETION_BLOCKER_LIST_CAP - blockers.length;
      if (remainingCapacity > 0) {
        blockers.push(
          ...soleOwnerships.slice(0, remainingCapacity).map(org => ({
            kind: AccountDeletionBlockerKind.SOLE_ORGANIZATION_OWNER,
            resourceID: org.id,
            displayName: org.displayName,
            selfResolvable: false,
          }))
        );
      }
      if (soleOwnerships.length > remainingCapacity) {
        truncated = true;
      }
    }

    const canDelete = totals.every(total => total.total === 0);

    return { canDelete, blockers, totals, truncated };
  }

  /**
   * Organizations where the user holds the OWNER credential and is
   * currently the ONLY holder of it — i.e. the organization would be left
   * with zero owners if this account were deleted. Deletion strips
   * credentials via the actor's FK cascade, which bypasses the role set's
   * own "minimum one owner" policy guard, so this check is what actually
   * enforces that invariant on the deletion path.
   */
  private async getSoleOrganizationOwnerships(
    userID: string,
    em?: EntityManager
  ): Promise<{ id: string; displayName: string }[]> {
    // Read through the deletion transaction when there is one: this is a
    // re-assertion made inside it, so it must observe that transaction's
    // snapshot rather than a second connection's.
    const credentials = await this.credentialService.findCredentialsByActorID(
      userID,
      em
    );
    const ownedOrganizationIDs = credentials
      .filter(
        credential =>
          credential.type === AuthorizationCredential.ORGANIZATION_OWNER
      )
      .map(credential => credential.resourceID);

    const soleOwnerships: { id: string; displayName: string }[] = [];
    for (const organizationID of ownedOrganizationIDs) {
      const ownerCount = await this.credentialService.countMatchingCredentials(
        {
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: organizationID,
        },
        em
      );
      if (ownerCount !== 1) {
        continue;
      }
      const organization =
        await this.organizationLookupService.getOrganizationById(
          organizationID,
          { relations: { profile: true } },
          em
        );
      if (!organization) {
        continue;
      }
      soleOwnerships.push({
        id: organization.id,
        displayName: organization.profile?.displayName ?? organization.nameID,
      });
    }
    return soleOwnerships;
  }
}
