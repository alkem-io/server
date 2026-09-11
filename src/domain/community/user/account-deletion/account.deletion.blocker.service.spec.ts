import { AccountDeletionBlockerKind } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CredentialService } from '@domain/actor/credential/credential.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDeletionBlockerService } from './account.deletion.blocker.service';

describe('AccountDeletionBlockerService', () => {
  let service: AccountDeletionBlockerService;
  let accountLookupService: AccountLookupService;
  let organizationLookupService: OrganizationLookupService;
  let credentialService: CredentialService;

  const emptyResourceResult = {
    blockers: [],
    totals: [
      { kind: AccountDeletionBlockerKind.ACCOUNT_SPACE, total: 0 },
      {
        kind: AccountDeletionBlockerKind.ACCOUNT_VIRTUAL_CONTRIBUTOR,
        total: 0,
      },
      { kind: AccountDeletionBlockerKind.ACCOUNT_INNOVATION_PACK, total: 0 },
      { kind: AccountDeletionBlockerKind.ACCOUNT_INNOVATION_HUB, total: 0 },
    ],
    truncated: false,
  };

  beforeEach(() => {
    accountLookupService = {
      getAccountResourceBlockers: vi
        .fn()
        .mockResolvedValue(emptyResourceResult),
    } as unknown as AccountLookupService;
    organizationLookupService = {
      getOrganizationById: vi.fn(),
    } as unknown as OrganizationLookupService;
    credentialService = {
      findCredentialsByActorID: vi.fn().mockResolvedValue([]),
      countMatchingCredentials: vi.fn(),
    } as unknown as CredentialService;

    service = new AccountDeletionBlockerService(
      accountLookupService,
      organizationLookupService,
      credentialService
    );
  });

  it('reports canDelete true when there are no resources and no sole ownerships (self)', async () => {
    const result = await service.getBlockers('user-1', 'account-1', 'self');

    expect(result.canDelete).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(
      result.totals.find(
        t => t.kind === AccountDeletionBlockerKind.SOLE_ORGANIZATION_OWNER
      )
    ).toEqual({
      kind: AccountDeletionBlockerKind.SOLE_ORGANIZATION_OWNER,
      total: 0,
    });
  });

  it('does not evaluate SOLE_ORGANIZATION_OWNER on the admin branch', async () => {
    const result = await service.getBlockers('user-1', 'account-1', 'admin');

    expect(credentialService.findCredentialsByActorID).not.toHaveBeenCalled();
    expect(
      result.totals.some(
        t => t.kind === AccountDeletionBlockerKind.SOLE_ORGANIZATION_OWNER
      )
    ).toBe(false);
  });

  it('flags a sole-owned organization as a blocker on the self branch', async () => {
    vi.spyOn(credentialService, 'findCredentialsByActorID').mockResolvedValue([
      {
        type: AuthorizationCredential.ORGANIZATION_OWNER,
        resourceID: 'org-1',
      } as any,
    ]);
    vi.spyOn(credentialService, 'countMatchingCredentials').mockResolvedValue(
      1
    );
    vi.spyOn(
      organizationLookupService,
      'getOrganizationById'
    ).mockResolvedValue({
      id: 'org-1',
      nameID: 'solo-org',
      profile: { displayName: 'Solo Org' },
    } as any);

    const result = await service.getBlockers('user-1', 'account-1', 'self');

    expect(result.canDelete).toBe(false);
    expect(result.blockers).toEqual([
      {
        kind: AccountDeletionBlockerKind.SOLE_ORGANIZATION_OWNER,
        resourceID: 'org-1',
        displayName: 'Solo Org',
        selfResolvable: false,
      },
    ]);
  });

  it('does NOT flag an organization with two owners', async () => {
    vi.spyOn(credentialService, 'findCredentialsByActorID').mockResolvedValue([
      {
        type: AuthorizationCredential.ORGANIZATION_OWNER,
        resourceID: 'org-1',
      } as any,
    ]);
    vi.spyOn(credentialService, 'countMatchingCredentials').mockResolvedValue(
      2
    );

    const result = await service.getBlockers('user-1', 'account-1', 'self');

    expect(result.canDelete).toBe(true);
    expect(
      organizationLookupService.getOrganizationById
    ).not.toHaveBeenCalled();
  });

  it('marks the four resource kinds self-resolvable and sole-ownership not', async () => {
    vi.spyOn(
      accountLookupService,
      'getAccountResourceBlockers'
    ).mockResolvedValue({
      blockers: [
        {
          kind: AccountDeletionBlockerKind.ACCOUNT_SPACE,
          resourceID: 'space-1',
          displayName: 'Space One',
        },
      ],
      totals: [
        { kind: AccountDeletionBlockerKind.ACCOUNT_SPACE, total: 1 },
        {
          kind: AccountDeletionBlockerKind.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          total: 0,
        },
        { kind: AccountDeletionBlockerKind.ACCOUNT_INNOVATION_PACK, total: 0 },
        { kind: AccountDeletionBlockerKind.ACCOUNT_INNOVATION_HUB, total: 0 },
      ],
      truncated: false,
    });

    const result = await service.getBlockers('user-1', 'account-1', 'admin');

    expect(result.blockers[0].selfResolvable).toBe(true);
  });
});
