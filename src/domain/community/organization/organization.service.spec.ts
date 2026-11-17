import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ForbiddenException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { SecondFactorAuditService } from '@core/auth/second-factor/second-factor.audit.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ActorService } from '@domain/actor/actor/actor.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock, vi } from 'vitest';
import { OrganizationSettingsService } from '../organization-settings/organization.settings.service';
import { OrganizationVerificationService } from '../organization-verification/organization.verification.service';
import { Organization } from './organization.entity';
import { IOrganization } from './organization.interface';
import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let repository: {
    findOne: Mock;
    save: Mock;
    count: Mock;
    countBy: Mock;
    find: Mock;
    createQueryBuilder: Mock;
  };
  let accountLookupService: {
    getAccountOrFail: Mock;
    areResourcesInAccount: Mock;
  };
  let profileService: { updateProfile: Mock; deleteProfile: Mock };
  let userGroupService: { removeUserGroup: Mock };
  let authorizationPolicyService: { delete: Mock };
  let storageAggregatorService: { delete: Mock };
  let roleSetService: {
    removeRoleSetOrFail: Mock;
    countActorsWithRole: Mock;
  };
  let organizationVerificationService: { delete: Mock };
  let actorService: { deleteActorById: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        repositoryProviderMockFactory(Organization),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<OrganizationService>(OrganizationService);
    repository = module.get(getRepositoryToken(Organization));
    accountLookupService = module.get(AccountLookupService) as any;
    profileService = module.get(ProfileService) as any;
    userGroupService = module.get(UserGroupService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    storageAggregatorService = module.get(StorageAggregatorService) as any;
    roleSetService = module.get(RoleSetService) as any;
    organizationVerificationService = module.get(
      OrganizationVerificationService
    ) as any;
    actorService = module.get(ActorService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrganizationOrFail', () => {
    it('should return organization when found', async () => {
      const org = { id: 'org-1', nameID: 'test-org' } as IOrganization;
      repository.findOne.mockResolvedValue(org);
      const result = await service.getOrganizationOrFail('org-1');
      expect(result).toBe(org);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(
        service.getOrganizationOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getOrganization', () => {
    it('should return organization when found', async () => {
      const org = { id: 'org-1' } as IOrganization;
      repository.findOne.mockResolvedValue(org);
      const result = await service.getOrganization('org-1');
      expect(result).toBe(org);
    });

    it('should return null when not found', async () => {
      repository.findOne.mockResolvedValue(null);
      const result = await service.getOrganization('nonexistent');
      expect(result).toBeNull();
    });

    it('should merge options with where clause', async () => {
      repository.findOne.mockResolvedValue(null);
      await service.getOrganization('org-1', {
        relations: { profile: true },
      } as any);
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'org-1' }),
          relations: { profile: true },
        })
      );
    });
  });

  describe('checkNameIdOrFail', () => {
    it('should not throw when nameID is available', async () => {
      repository.count.mockResolvedValue(0);
      await expect(
        service.checkNameIdOrFail('available')
      ).resolves.not.toThrow();
    });

    it('should throw ValidationException when nameID is taken', async () => {
      repository.count.mockResolvedValue(1);
      await expect(service.checkNameIdOrFail('taken')).rejects.toThrow(
        ValidationException
      );
    });
  });

  describe('checkDisplayNameOrFail', () => {
    it('should not throw when displayName is undefined', async () => {
      await expect(
        service.checkDisplayNameOrFail(undefined)
      ).resolves.not.toThrow();
    });

    it('should not throw when displayName matches existing', async () => {
      await expect(
        service.checkDisplayNameOrFail('Same Name', 'Same Name')
      ).resolves.not.toThrow();
      expect(repository.countBy).not.toHaveBeenCalled();
    });

    it('should not throw when displayName is available', async () => {
      repository.countBy.mockResolvedValue(0);
      await expect(
        service.checkDisplayNameOrFail('New Name')
      ).resolves.not.toThrow();
    });

    it('should throw ValidationException when displayName is taken', async () => {
      repository.countBy.mockResolvedValue(1);
      await expect(
        service.checkDisplayNameOrFail('Taken Name')
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('save', () => {
    it('should delegate to repository save', async () => {
      const org = { id: 'org-1' } as IOrganization;
      repository.save.mockResolvedValue(org);
      const result = await service.save(org);
      expect(result).toBe(org);
    });
  });

  describe('getRoleSet', () => {
    it('should return roleSet when found', async () => {
      const roleSet = { id: 'rs-1' };
      const org = { id: 'org-1', roleSet } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      const result = await service.getRoleSet(org);
      expect(result).toBe(roleSet);
    });

    it('should throw EntityNotInitializedException when roleSet missing', async () => {
      const org = {
        id: 'org-1',
        roleSet: undefined,
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      await expect(service.getRoleSet(org)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getAccount', () => {
    it('should delegate to accountLookupService', async () => {
      const mockAccount = { id: 'account-1' };
      accountLookupService.getAccountOrFail.mockResolvedValue(mockAccount);
      const org = { accountID: 'account-1' } as IOrganization;
      const result = await service.getAccount(org);
      expect(result).toBe(mockAccount);
    });
  });

  describe('updateOrganization', () => {
    it('should update legalEntityName when provided', async () => {
      const org = {
        id: 'org-1',
        profile: { displayName: 'Org' },
        legalEntityName: 'Old',
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      repository.save.mockImplementation((e: any) => Promise.resolve(e));

      await service.updateOrganization({
        ID: 'org-1',
        legalEntityName: 'New Legal',
      } as any);
      expect(org.legalEntityName).toBe('New Legal');
    });

    it('should update domain when provided', async () => {
      const org = {
        id: 'org-1',
        profile: { displayName: 'Org' },
        domain: 'old.com',
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      repository.save.mockImplementation((e: any) => Promise.resolve(e));

      await service.updateOrganization({
        ID: 'org-1',
        domain: 'new.com',
      } as any);
      expect(org.domain).toBe('new.com');
    });

    it('should update website when provided', async () => {
      const org = {
        id: 'org-1',
        profile: { displayName: 'Org' },
        website: 'http://old.com',
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      repository.save.mockImplementation((e: any) => Promise.resolve(e));

      await service.updateOrganization({
        ID: 'org-1',
        website: 'http://new.com',
      } as any);
      expect(org.website).toBe('http://new.com');
    });

    it('should update contactEmail when provided', async () => {
      const org = {
        id: 'org-1',
        profile: { displayName: 'Org' },
        contactEmail: 'old@org.com',
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      repository.save.mockImplementation((e: any) => Promise.resolve(e));

      await service.updateOrganization({
        ID: 'org-1',
        contactEmail: 'new@org.com',
      } as any);
      expect(org.contactEmail).toBe('new@org.com');
    });

    it('should update profile when profileData is provided', async () => {
      const org = {
        id: 'org-1',
        profile: { displayName: 'Old Name' },
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      repository.countBy.mockResolvedValue(0);
      profileService.updateProfile.mockResolvedValue({
        displayName: 'New Name',
      });
      repository.save.mockImplementation((e: any) => Promise.resolve(e));

      await service.updateOrganization({
        ID: 'org-1',
        profileData: { displayName: 'New Name' },
      } as any);
      expect(profileService.updateProfile).toHaveBeenCalled();
    });
  });

  describe('deleteOrganization', () => {
    it('should throw RelationshipNotFoundException when required relations missing', async () => {
      const org = {
        id: 'org-1',
        roleSet: null,
        profile: null,
        verification: null,
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);

      await expect(service.deleteOrganization({ ID: 'org-1' })).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw ForbiddenException when account has resources', async () => {
      const org = {
        id: 'org-1',
        accountID: 'account-1',
        roleSet: { id: 'rs-1' },
        profile: { id: 'profile-1' },
        verification: { id: 'ver-1' },
        groups: [],
        storageAggregator: { id: 'sa-1' },
        authorization: { id: 'auth-1' },
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      accountLookupService.areResourcesInAccount.mockResolvedValue(true);

      await expect(service.deleteOrganization({ ID: 'org-1' })).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should delete all child entities and return organization', async () => {
      const org = {
        id: 'org-1',
        accountID: 'account-1',
        roleSet: { id: 'rs-1' },
        profile: { id: 'profile-1' },
        verification: { id: 'ver-1' },
        groups: [{ id: 'group-1' }],
        storageAggregator: { id: 'sa-1' },
        authorization: { id: 'auth-1' },
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      accountLookupService.areResourcesInAccount.mockResolvedValue(false);
      profileService.deleteProfile.mockResolvedValue(undefined);
      storageAggregatorService.delete.mockResolvedValue(undefined);
      userGroupService.removeUserGroup.mockResolvedValue(undefined);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      organizationVerificationService.delete.mockResolvedValue(undefined);
      roleSetService.removeRoleSetOrFail.mockResolvedValue(undefined);
      actorService.deleteActorById.mockResolvedValue(undefined);

      const result = await service.deleteOrganization({ ID: 'org-1' });

      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(storageAggregatorService.delete).toHaveBeenCalledWith('sa-1');
      expect(userGroupService.removeUserGroup).toHaveBeenCalledWith({
        ID: 'group-1',
      });
      expect(authorizationPolicyService.delete).toHaveBeenCalled();
      expect(organizationVerificationService.delete).toHaveBeenCalledWith(
        'ver-1'
      );
      expect(roleSetService.removeRoleSetOrFail).toHaveBeenCalledWith('rs-1');
      expect(actorService.deleteActorById).toHaveBeenCalledWith('org-1');
      expect(result.id).toBe('org-1');
    });
  });

  describe('getUserGroups', () => {
    it('should return groups when loaded', async () => {
      const groups = [{ id: 'g1' }, { id: 'g2' }];
      const org = { id: 'org-1', groups } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      const result = await service.getUserGroups(org);
      expect(result).toBe(groups);
    });

    it('should throw ValidationException when groups are not loaded', async () => {
      const org = {
        id: 'org-1',
        groups: undefined,
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      await expect(service.getUserGroups(org)).rejects.toThrow(
        ValidationException
      );
    });
  });

  describe('getStorageAggregatorOrFail', () => {
    it('should return storageAggregator when found', async () => {
      const sa = { id: 'sa-1' };
      const org = {
        id: 'org-1',
        storageAggregator: sa,
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      const result = await service.getStorageAggregatorOrFail('org-1');
      expect(result).toBe(sa);
    });

    it('should throw EntityNotFoundException when storageAggregator is missing', async () => {
      const org = {
        id: 'org-1',
        storageAggregator: undefined,
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      await expect(service.getStorageAggregatorOrFail('org-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getVerification', () => {
    it('should return verification when loaded', async () => {
      const verification = { id: 'ver-1', status: 'not_verified' };
      const org = {
        id: 'org-1',
        verification,
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      const result = await service.getVerification(org);
      expect(result).toBe(verification);
    });

    it('should throw EntityNotFoundException when verification is missing', async () => {
      const org = {
        id: 'org-1',
        verification: undefined,
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      await expect(service.getVerification(org)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getOrganizations', () => {
    it('should return all organizations when no filter', async () => {
      const orgs = [{ id: 'org-1' }, { id: 'org-2' }];
      repository.find.mockResolvedValue(orgs);
      const result = await service.getOrganizations({} as any);
      expect(result).toHaveLength(2);
    });

    it('should filter by credentials when provided', async () => {
      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getOrganizations({
        filter: { credentials: ['cred-type'] },
      } as any);
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      const orgs = Array.from({ length: 10 }, (_, i) => ({
        id: `org-${i}`,
      }));
      repository.find.mockResolvedValue(orgs);
      const result = await service.getOrganizations({ limit: 3 } as any);
      expect(result).toHaveLength(3);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics with associates count', async () => {
      const roleSet = { id: 'rs-1' };
      const org = { id: 'org-1', roleSet } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      roleSetService.countActorsWithRole.mockResolvedValue(5);

      const result = await service.getMetrics(org);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('associates');
      expect(result[0].value).toBe('5');
    });

    it('should set metric id to associates-{orgId}', async () => {
      const roleSet = { id: 'rs-1' };
      const org = { id: 'org-42', roleSet } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      roleSetService.countActorsWithRole.mockResolvedValue(0);

      const result = await service.getMetrics(org);
      expect(result[0].id).toBe('associates-org-42');
    });
  });

  describe('createGroup', () => {
    it('should throw EntityNotInitializedException when storageAggregator is not initialized', async () => {
      const org = {
        id: 'org-1',
        groups: [],
        storageAggregator: undefined,
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);

      await expect(
        service.createGroup({
          parentID: 'org-1',
          profile: { displayName: 'New Group' },
        } as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('getPaginatedOrganizations', () => {
    const createPaginationQb = () => {
      const qb: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(0),
        take: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
        clone: vi.fn(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        expressionMap: { orderBys: {} },
      };
      qb.clone.mockReturnValue(qb);
      return qb;
    };

    it('should create query builder and return paginated results', async () => {
      const mockQb = createPaginationQb();
      repository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getPaginatedOrganizations({
        first: 10,
      } as any);
      expect(repository.createQueryBuilder).toHaveBeenCalledWith(
        'organization'
      );
      expect(result).toBeDefined();
    });

    it('should add status filter when provided', async () => {
      const mockQb = createPaginationQb();
      repository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getPaginatedOrganizations(
        { first: 10 } as any,
        undefined,
        'not_verified' as any
      );
      expect(mockQb.leftJoin).toHaveBeenCalled();
      expect(mockQb.where).toHaveBeenCalled();
    });
  });

  describe('deleteOrganization edge cases', () => {
    it('should skip storageAggregator deletion when not loaded', async () => {
      const org = {
        id: 'org-1',
        accountID: 'account-1',
        roleSet: { id: 'rs-1' },
        profile: { id: 'profile-1' },
        verification: { id: 'ver-1' },
        groups: [],
        storageAggregator: undefined,
        authorization: { id: 'auth-1' },
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      accountLookupService.areResourcesInAccount.mockResolvedValue(false);
      profileService.deleteProfile.mockResolvedValue(undefined);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      organizationVerificationService.delete.mockResolvedValue(undefined);
      roleSetService.removeRoleSetOrFail.mockResolvedValue(undefined);
      actorService.deleteActorById.mockResolvedValue(undefined);

      await service.deleteOrganization({ ID: 'org-1' });

      expect(storageAggregatorService.delete).not.toHaveBeenCalled();
    });

    it('should skip authorization deletion when not set', async () => {
      const org = {
        id: 'org-1',
        accountID: 'account-1',
        roleSet: { id: 'rs-1' },
        profile: { id: 'profile-1' },
        verification: { id: 'ver-1' },
        groups: [],
        storageAggregator: undefined,
        authorization: undefined,
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      accountLookupService.areResourcesInAccount.mockResolvedValue(false);
      profileService.deleteProfile.mockResolvedValue(undefined);
      organizationVerificationService.delete.mockResolvedValue(undefined);
      roleSetService.removeRoleSetOrFail.mockResolvedValue(undefined);
      actorService.deleteActorById.mockResolvedValue(undefined);

      await service.deleteOrganization({ ID: 'org-1' });

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateOrganization edge cases', () => {
    it('should not update profile when profileData is not provided', async () => {
      const org = {
        id: 'org-1',
        profile: { displayName: 'Org' },
      } as unknown as IOrganization;
      repository.findOne.mockResolvedValue(org);
      repository.save.mockImplementation((e: any) => Promise.resolve(e));

      await service.updateOrganization({
        ID: 'org-1',
      } as any);
      expect(profileService.updateProfile).not.toHaveBeenCalled();
    });
  });
});

describe('OrganizationService.updateOrganizationSettings — the second-factor rule', () => {
  const organizationId = 'org-1';

  function makeTx() {
    const saved: any[] = [];
    return {
      saved,
      create: vi.fn((_entity: unknown, row: any) => ({ ...row })),
      save: vi.fn(async (entityOrRow: any, maybeRow?: any) => {
        const row = maybeRow ?? entityOrRow;
        saved.push(row);
        return row;
      }),
    };
  }

  async function build(opts: { auditFails?: boolean } = {}) {
    const tx = makeTx();
    const log: string[] = [];
    const repository = {
      save: vi.fn(),
      manager: {
        transaction: vi.fn(async (work: (m: unknown) => Promise<unknown>) => {
          log.push('begin');
          try {
            const result = await work(tx);
            log.push('commit');
            return result;
          } catch (error) {
            log.push('rollback');
            throw error;
          }
        }),
      },
    };
    if (opts.auditFails) {
      tx.save.mockImplementation(async (entityOrRow: any, maybeRow?: any) => {
        if (!maybeRow && entityOrRow.category) throw new Error('db down');
        return maybeRow ?? entityOrRow;
      });
    }
    const module = await Test.createTestingModule({
      providers: [
        OrganizationService,
        MockCacheManager,
        MockWinstonProvider,
        { provide: getRepositoryToken(Organization), useValue: repository },
        // The real writer, so the row's attribution is the one shipped.
        {
          provide: SecondFactorAuditService,
          useValue: new SecondFactorAuditService({} as never),
        },
        OrganizationSettingsService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    return { service: module.get(OrganizationService), tx, log, repository };
  }

  const organization = (on: boolean) =>
    ({
      id: organizationId,
      settings: {
        privacy: { contributionRolesPubliclyVisible: false },
        membership: {
          allowUsersMatchingDomainToJoin: false,
          allowSpaceInvitations: true,
          allowApplications: true,
        },
        security: {
          secondFactorRequired: on,
          secondFactorRequiredSince: on ? '2026-10-01T08:00:00Z' : null,
        },
      },
    }) as unknown as IOrganization;

  const actorWith = (type: string, resourceID = '') =>
    ({ actorID: 'actor-1', credentials: [{ type, resourceID }] }) as any;

  const auditRows = (tx: ReturnType<typeof makeTx>) =>
    tx.saved.filter(row => row.category === 'authentication');

  it.each([
    [
      "the organisation's own admin, attributed self",
      actorWith('organization-admin', organizationId),
      'self',
    ],
    [
      'a Platform Content Full Access holder, attributed that role',
      actorWith('platform-content-full-access'),
      'platform_content_full_access',
    ],
  ])('records an off→on by %s in the save transaction', async (_label, actor, role) => {
    const { service, tx, log } = await build();

    await service.updateOrganizationSettings(
      organization(false),
      { security: { secondFactorRequired: true } },
      actor
    );

    expect(log).toEqual(['begin', 'commit']);
    const rows = auditRows(tx);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      outcome: 'configuration_changed',
      initiatorUserId: 'actor-1',
      initiatorRole: role,
      subjectOrganizationId: organizationId,
      details: {
        scope: 'organization',
        organizationId,
        from: false,
        to: true,
      },
    });
    expect(tx.saved[0].id).toBe(organizationId);
  });

  it('records an on→off', async () => {
    const { service, tx } = await build();

    await service.updateOrganizationSettings(
      organization(true),
      { security: { secondFactorRequired: false } },
      actorWith('organization-owner', organizationId)
    );

    expect(auditRows(tx)[0].details).toMatchObject({
      from: true,
      to: false,
      since: '2026-10-01T08:00:00Z',
    });
  });

  it.each([
    [
      'a privacy-only save',
      { privacy: { contributionRolesPubliclyVisible: true } },
    ],
    ['an on→on save', { security: { secondFactorRequired: true } }],
  ])('writes no row for %s', async (_label, update) => {
    const { service, tx } = await build();

    await service.updateOrganizationSettings(
      organization(true),
      update,
      actorWith('organization-admin', organizationId)
    );

    expect(auditRows(tx)).toEqual([]);
  });

  it('rolls the save back and throws when the row cannot be written', async () => {
    const { service, log } = await build({ auditFails: true });

    await expect(
      service.updateOrganizationSettings(
        organization(false),
        { security: { secondFactorRequired: true } },
        actorWith('organization-admin', organizationId)
      )
    ).rejects.toThrow('db down');
    expect(log).toEqual(['begin', 'rollback']);
  });
});
