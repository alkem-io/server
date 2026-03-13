import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleName } from '@common/enums/role.name';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { RoleSetMembershipStatusDataLoader } from './role.set.data.loader.membership.status';
import { RoleSetActorRolesDataLoader } from './role.set.data.loaders.actor.roles';
import { RoleSetResolverFieldsPublic } from './role.set.resolver.fields.public';
import { RoleSetService } from './role.set.service';

describe('RoleSetResolverFieldsPublic', () => {
  let resolver: RoleSetResolverFieldsPublic;
  let roleSetService: RoleSetService;
  let actorRolesLoader: RoleSetActorRolesDataLoader;
  let membershipStatusLoader: RoleSetMembershipStatusDataLoader;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const mockActorRolesLoader = {
      loader: { load: vi.fn() },
    };
    const mockMembershipStatusLoader = {
      loader: { load: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetResolverFieldsPublic,
        {
          provide: RoleSetActorRolesDataLoader,
          useValue: mockActorRolesLoader,
        },
        {
          provide: RoleSetMembershipStatusDataLoader,
          useValue: mockMembershipStatusLoader,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<RoleSetResolverFieldsPublic>(
      RoleSetResolverFieldsPublic
    );
    roleSetService = module.get<RoleSetService>(RoleSetService);
    actorRolesLoader = module.get<RoleSetActorRolesDataLoader>(
      RoleSetActorRolesDataLoader
    );
    membershipStatusLoader = module.get<RoleSetMembershipStatusDataLoader>(
      RoleSetMembershipStatusDataLoader
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('applicationForm', () => {
    it('should delegate to roleSetService.getApplicationForm', async () => {
      const mockForm = { id: 'form-1' } as any;
      const mockRoleSet = { id: 'rs-1' } as any;
      (roleSetService.getApplicationForm as Mock).mockResolvedValue(mockForm);

      const result = await resolver.applicationForm(mockRoleSet);

      expect(result).toBe(mockForm);
    });
  });

  describe('roleDefinitions', () => {
    it('should delegate to roleSetService.getRoleDefinitions', async () => {
      const mockRoles = [{ id: 'role-1', name: RoleName.MEMBER }] as any[];
      const mockRoleSet = { id: 'rs-1' } as any;
      (roleSetService.getRoleDefinitions as Mock).mockResolvedValue(mockRoles);

      const result = await resolver.roleDefinitions(mockRoleSet, undefined);

      expect(result).toBe(mockRoles);
    });

    it('should pass roles filter', async () => {
      const mockRoles = [{ id: 'role-1', name: RoleName.MEMBER }] as any[];
      const mockRoleSet = { id: 'rs-1' } as any;
      (roleSetService.getRoleDefinitions as Mock).mockResolvedValue(mockRoles);

      await resolver.roleDefinitions(mockRoleSet, [RoleName.MEMBER]);

      expect(roleSetService.getRoleDefinitions).toHaveBeenCalledWith(
        mockRoleSet,
        [RoleName.MEMBER]
      );
    });
  });

  describe('roleDefinition', () => {
    it('should delegate to roleSetService.getRoleDefinition', async () => {
      const mockRole = { id: 'role-1', name: RoleName.MEMBER } as any;
      const mockRoleSet = { id: 'rs-1' } as any;
      (roleSetService.getRoleDefinition as Mock).mockResolvedValue(mockRole);

      const result = await resolver.roleDefinition(
        mockRoleSet,
        RoleName.MEMBER
      );

      expect(result).toBe(mockRole);
    });
  });

  describe('roleNames', () => {
    it('should return role names from definitions', async () => {
      const mockRoles = [
        { id: 'role-1', name: RoleName.MEMBER },
        { id: 'role-2', name: RoleName.LEAD },
      ] as any[];
      const mockRoleSet = { id: 'rs-1' } as any;
      (roleSetService.getRoleDefinitions as Mock).mockResolvedValue(mockRoles);

      const result = await resolver.roleNames(mockRoleSet);

      expect(result).toEqual([RoleName.MEMBER, RoleName.LEAD]);
    });
  });

  describe('myMembershipStatus', () => {
    it('should use data loader', async () => {
      const actorContext = { actorID: 'agent-1' } as any;
      const mockRoleSet = { id: 'rs-1' } as any;
      (membershipStatusLoader.loader.load as Mock).mockResolvedValue(
        CommunityMembershipStatus.MEMBER
      );

      const result = await resolver.myMembershipStatus(
        actorContext,
        mockRoleSet
      );

      expect(result).toBe(CommunityMembershipStatus.MEMBER);
    });
  });

  describe('myRoles', () => {
    it('should use data loader', async () => {
      const actorContext = { actorID: 'agent-1' } as any;
      const mockRoleSet = { id: 'rs-1' } as any;
      (actorRolesLoader.loader.load as Mock).mockResolvedValue([
        RoleName.MEMBER,
      ]);

      const result = await resolver.myRoles(mockRoleSet, actorContext);

      expect(result).toEqual([RoleName.MEMBER]);
    });
  });

  describe('myRolesImplicit', () => {
    it('should delegate to roleSetService.getImplicitRoles', async () => {
      const actorContext = { actorID: 'agent-1' } as any;
      const mockRoleSet = { id: 'rs-1' } as any;
      (roleSetService.getImplicitRoles as Mock).mockResolvedValue([]);

      const result = await resolver.myRolesImplicit(actorContext, mockRoleSet);

      expect(result).toEqual([]);
    });
  });
});
