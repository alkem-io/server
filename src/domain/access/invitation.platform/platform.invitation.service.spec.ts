import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Mock, vi } from 'vitest';
import { IRoleSet } from '../role-set/role.set.interface';
import { PlatformInvitation } from './platform.invitation.entity';
import { PlatformInvitationService } from './platform.invitation.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('PlatformInvitationService', () => {
  let service: PlatformInvitationService;
  let db: any;
  let authorizationPolicyService: AuthorizationPolicyService;
  let userLookupService: UserLookupService;

  beforeEach(async () => {
    // Mock static PlatformInvitation.create to avoid DataSource requirement
    vi.spyOn(PlatformInvitation, 'create').mockImplementation((input: any) => {
      const entity = new PlatformInvitation();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformInvitationService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<PlatformInvitationService>(PlatformInvitationService);
    db = module.get(DRIZZLE);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    userLookupService = module.get<UserLookupService>(UserLookupService);
  });

  describe('getPlatformInvitationOrFail', () => {
    it('should return platform invitation when it exists', async () => {
      const mockInvitation = { id: 'inv-1' } as PlatformInvitation;
      db.query.platformInvitations.findFirst.mockResolvedValueOnce(mockInvitation);

      const result = await service.getPlatformInvitationOrFail('inv-1');

      expect(result).toBe(mockInvitation);
    });

    it('should throw EntityNotFoundException when platform invitation does not exist', async () => {

      await expect(
        service.getPlatformInvitationOrFail('non-existent')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should merge provided options with the id filter', async () => {
      const mockInvitation = { id: 'inv-1' } as PlatformInvitation;
      db.query.platformInvitations.findFirst.mockResolvedValueOnce(mockInvitation);

      await service.getPlatformInvitationOrFail('inv-1', {
        relations: { roleSet: true },
      });

    });
  });

  describe('createPlatformInvitation', () => {
    it('should create platform invitation with trimmed lowercase email', async () => {
      const roleSet = { type: RoleSetType.SPACE } as IRoleSet;
      const invitationData = {
        email: '  Test@Example.COM  ',
        createdBy: 'user-1',
        roleSetInvitedToParent: false,
        roleSetExtraRoles: [] as RoleName[],
      };

      const result = await service.createPlatformInvitation(
        roleSet,
        invitationData
      );

      expect(result.authorization).toBeDefined();
      expect(invitationData.email).toBe('test@example.com');
    });

    it('should allow invitations with accepted platform roles for platform roleSets', async () => {
      const roleSet = { type: RoleSetType.PLATFORM } as IRoleSet;
      const invitationData = {
        email: 'user@test.com',
        createdBy: 'user-1',
        roleSetInvitedToParent: false,
        roleSetExtraRoles: [RoleName.PLATFORM_BETA_TESTER],
      };

      await expect(
        service.createPlatformInvitation(roleSet, invitationData)
      ).resolves.toBeDefined();
    });

    it('should throw ValidationException when inviting to disallowed platform role', async () => {
      const roleSet = { type: RoleSetType.PLATFORM } as IRoleSet;
      const invitationData = {
        email: 'user@test.com',
        createdBy: 'user-1',
        roleSetInvitedToParent: false,
        roleSetExtraRoles: [RoleName.GLOBAL_ADMIN],
      };

      await expect(
        service.createPlatformInvitation(roleSet, invitationData)
      ).rejects.toThrow(ValidationException);
    });

    it('should allow any roles for non-platform roleSets', async () => {
      const roleSet = { type: RoleSetType.SPACE } as IRoleSet;
      const invitationData = {
        email: 'user@test.com',
        createdBy: 'user-1',
        roleSetInvitedToParent: false,
        roleSetExtraRoles: [RoleName.GLOBAL_ADMIN],
      };

      await expect(
        service.createPlatformInvitation(roleSet, invitationData)
      ).resolves.toBeDefined();
    });

    it('should allow PLATFORM_VC_CAMPAIGN as an accepted platform role', async () => {
      const roleSet = { type: RoleSetType.PLATFORM } as IRoleSet;
      const invitationData = {
        email: 'user@test.com',
        createdBy: 'user-1',
        roleSetInvitedToParent: false,
        roleSetExtraRoles: [RoleName.PLATFORM_VC_CAMPAIGN],
      };

      await expect(
        service.createPlatformInvitation(roleSet, invitationData)
      ).resolves.toBeDefined();
    });

    it('should throw ValidationException when any role in the list is disallowed for platform roleSet', async () => {
      const roleSet = { type: RoleSetType.PLATFORM } as IRoleSet;
      const invitationData = {
        email: 'user@test.com',
        createdBy: 'user-1',
        roleSetInvitedToParent: false,
        roleSetExtraRoles: [
          RoleName.PLATFORM_BETA_TESTER,
          RoleName.GLOBAL_ADMIN,
        ],
      };

      await expect(
        service.createPlatformInvitation(roleSet, invitationData)
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('deletePlatformInvitation', () => {
    it('should delete invitation and its authorization policy', async () => {
      const mockInvitation = {
        id: 'inv-1',
        authorization: { id: 'auth-1' },
      } as any;

      vi.spyOn(service, 'getPlatformInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (authorizationPolicyService.delete as Mock).mockResolvedValue(
        undefined as any
      );

      const result = await service.deletePlatformInvitation({ ID: 'inv-1' });

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockInvitation.authorization
      );
      expect(result.id).toBe('inv-1');
    });

    it('should skip authorization policy deletion when authorization is undefined', async () => {
      const mockInvitation = {
        id: 'inv-1',
        authorization: undefined,
      } as any;

      vi.spyOn(service, 'getPlatformInvitationOrFail').mockResolvedValue(
        mockInvitation
      );

      await service.deletePlatformInvitation({ ID: 'inv-1' });

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });
  });

  describe('recordProfileCreated', () => {
    it('should set profileCreated to true and save', async () => {
      const mockInvitation = {
        id: 'inv-1',
        profileCreated: false,
      } as any;

      const result = await service.recordProfileCreated(mockInvitation);

      expect(result.profileCreated).toBe(true);
    });
  });

  describe('getCreatedBy', () => {
    it('should return the user who created the invitation', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        createdBy: 'user-1',
      } as any;

      (userLookupService.getUserOrFail as Mock).mockResolvedValue(mockUser);

      const result = await service.getCreatedBy(mockInvitation);

      expect(result).toBe(mockUser);
      expect(userLookupService.getUserOrFail).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findPlatformInvitationsForUser', () => {
    it('should return invitations found for the email', async () => {
      const mockInvitations = [{ id: 'inv-1' }] as PlatformInvitation[];
      db.query.platformInvitations.findMany.mockResolvedValueOnce(mockInvitations);

      const result =
        await service.findPlatformInvitationsForUser('user@test.com');

      expect(result).toEqual(mockInvitations);
    });

    it('should return empty array when no invitations found', async () => {

      const result =
        await service.findPlatformInvitationsForUser('user@test.com');

      expect(result).toEqual([]);
    });

    it('should search with lowercase email', async () => {

      await service.findPlatformInvitationsForUser('USER@TEST.COM');

    });
  });

  describe('getExistingPlatformInvitationForRoleSet', () => {
    it('should return the invitation when exactly one exists', async () => {
      const mockInvitation = { id: 'inv-1' } as PlatformInvitation;
      db.query.platformInvitations.findMany.mockResolvedValueOnce([mockInvitation]);

      const result = await service.getExistingPlatformInvitationForRoleSet(
        'user@test.com',
        'roleset-1'
      );

      expect(result).toBe(mockInvitation);
    });

    it('should return undefined when no invitations exist', async () => {

      const result = await service.getExistingPlatformInvitationForRoleSet(
        'user@test.com',
        'roleset-1'
      );

      expect(result).toBeUndefined();
    });

    it('should throw RoleSetMembershipException when more than one invitation exists', async () => {
      const mockInvitations = [
        { id: 'inv-1' },
        { id: 'inv-2' },
      ] as PlatformInvitation[];
      db.query.platformInvitations.findMany.mockResolvedValueOnce(mockInvitations);

      await expect(
        service.getExistingPlatformInvitationForRoleSet(
          'user@test.com',
          'roleset-1'
        )
      ).rejects.toThrow(RoleSetMembershipException);
    });

    it('should search with lowercase email', async () => {

      await service.getExistingPlatformInvitationForRoleSet(
        'USER@TEST.COM',
        'roleset-1'
      );

    });
  });
});
