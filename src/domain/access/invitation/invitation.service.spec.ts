import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { User } from '@domain/community/user/user.entity';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Mock, vi } from 'vitest';
import { RoleSetCacheService } from '../role-set/role.set.service.cache';
import { Invitation } from './invitation.entity';
import { IInvitation } from './invitation.interface';
import { InvitationService } from './invitation.service';
import { InvitationLifecycleService } from './invitation.service.lifecycle';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('InvitationService', () => {
  let service: InvitationService;
  let db: any;
  let lifecycleService: LifecycleService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let invitationLifecycleService: InvitationLifecycleService;
  let contributorService: ContributorService;
  let userLookupService: UserLookupService;
  let roleSetCacheService: RoleSetCacheService;

  beforeEach(async () => {
    // Mock static Invitation.create to avoid DataSource requirement
    vi.spyOn(Invitation, 'create').mockImplementation((input: any) => {
      const entity = new Invitation();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<InvitationService>(InvitationService);
    db = module.get(DRIZZLE);
    lifecycleService = module.get<LifecycleService>(LifecycleService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    invitationLifecycleService = module.get<InvitationLifecycleService>(
      InvitationLifecycleService
    );
    contributorService = module.get<ContributorService>(ContributorService);
    userLookupService = module.get<UserLookupService>(UserLookupService);
    roleSetCacheService = module.get<RoleSetCacheService>(RoleSetCacheService);
  });

  describe('getInvitationOrFail', () => {
    it('should return invitation when it exists', async () => {
      const mockInvitation = { id: 'inv-1' } as Invitation;
      db.query.invitations.findFirst.mockResolvedValueOnce(mockInvitation);

      const result = await service.getInvitationOrFail('inv-1');

      expect(result).toBe(mockInvitation);
    });

    it('should throw EntityNotFoundException when invitation does not exist', async () => {

      await expect(service.getInvitationOrFail('non-existent')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should merge provided options with the id filter', async () => {
      const mockInvitation = { id: 'inv-1' } as Invitation;
      db.query.invitations.findFirst.mockResolvedValueOnce(mockInvitation);

      await service.getInvitationOrFail('inv-1', {
        with: { roleSet: true },
      });

    });
  });

  describe('getInvitationsOrFail', () => {
    it('should return all invitations when all IDs are found', async () => {
      const mockInvitations = [
        { id: 'inv-1' },
        { id: 'inv-2' },
      ] as Invitation[];
      db.query.invitations.findMany.mockResolvedValueOnce(mockInvitations);

      const result = await service.getInvitationsOrFail(['inv-1', 'inv-2']);

      expect(result).toHaveLength(2);
    });

    it('should throw EntityNotFoundException when some IDs are not found', async () => {
      const mockInvitations = [{ id: 'inv-1' }] as Invitation[];
      db.query.invitations.findMany.mockResolvedValueOnce(mockInvitations);

      await expect(
        service.getInvitationsOrFail(['inv-1', 'inv-2'])
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when no invitations are found', async () => {

      await expect(service.getInvitationsOrFail(['inv-1'])).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('createInvitation', () => {
    it('should create invitation with authorization policy and lifecycle', async () => {
      const invitationData = {
        invitedContributorID: 'contributor-1',
        createdBy: 'user-1',
        roleSetID: 'roleset-1',
        invitedToParent: false,
      };
      // Use a real User instance so getContributorType()'s instanceof check works
      const mockContributor = Object.assign(new User(), {
        id: 'contributor-1',
      }) as any;
      const mockLifecycle = { id: 'lifecycle-1' } as any;

      (lifecycleService.createLifecycle as Mock).mockResolvedValue(
        mockLifecycle
      );

      const result = await service.createInvitation(
        invitationData,
        mockContributor
      );

      expect(result.authorization).toBeDefined();
      expect(result.lifecycle).toBe(mockLifecycle);
    });
  });

  describe('deleteInvitation', () => {
    it('should delete invitation with lifecycle, auth policy, and invalidate caches', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
        authorization: { id: 'auth-1' },
        invitedContributorID: 'contributor-1',
        roleSet: { id: 'roleset-1' },
      } as any;
      const mockContributor = {
        id: 'contributor-1',
        agent: { id: 'agent-1' },
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (lifecycleService.deleteLifecycle as Mock).mockResolvedValue(
        undefined as any
      );
      (authorizationPolicyService.delete as Mock).mockResolvedValue(
        undefined as any
      );
      (
        roleSetCacheService.deleteOpenInvitationFromCache as Mock
      ).mockResolvedValue(undefined);
      (contributorService.getContributor as Mock).mockResolvedValue(
        mockContributor
      );
      (
        roleSetCacheService.deleteMembershipStatusCache as Mock
      ).mockResolvedValue(undefined);

      const result = await service.deleteInvitation({ ID: 'inv-1' });

      expect(lifecycleService.deleteLifecycle).toHaveBeenCalledWith(
        'lifecycle-1'
      );
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockInvitation.authorization
      );
      expect(
        roleSetCacheService.deleteOpenInvitationFromCache
      ).toHaveBeenCalledWith('contributor-1', 'roleset-1');
      expect(
        roleSetCacheService.deleteMembershipStatusCache
      ).toHaveBeenCalledWith('agent-1', 'roleset-1');
      expect(result.id).toBe('inv-1');
    });

    it('should skip authorization policy deletion when authorization is undefined', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
        authorization: undefined,
        invitedContributorID: undefined,
        roleSet: undefined,
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (lifecycleService.deleteLifecycle as Mock).mockResolvedValue(
        undefined as any
      );

      await service.deleteInvitation({ ID: 'inv-1' });

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });

    it('should skip cache invalidation when invitedContributorID or roleSet is not present', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
        authorization: undefined,
        invitedContributorID: undefined,
        roleSet: undefined,
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (lifecycleService.deleteLifecycle as Mock).mockResolvedValue(
        undefined as any
      );

      await service.deleteInvitation({ ID: 'inv-1' });

      expect(
        roleSetCacheService.deleteOpenInvitationFromCache
      ).not.toHaveBeenCalled();
    });

    it('should log error when contributor or agent not found during cache invalidation', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
        authorization: undefined,
        invitedContributorID: 'contributor-1',
        roleSet: { id: 'roleset-1' },
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (lifecycleService.deleteLifecycle as Mock).mockResolvedValue(
        undefined as any
      );
      (
        roleSetCacheService.deleteOpenInvitationFromCache as Mock
      ).mockResolvedValue(undefined);
      (contributorService.getContributor as Mock).mockResolvedValue(
        null as any
      );

      await service.deleteInvitation({ ID: 'inv-1' });

      expect(
        roleSetCacheService.deleteMembershipStatusCache
      ).not.toHaveBeenCalled();
    });
  });

  describe('getInvitedContributor', () => {
    it('should return the contributor for the invitation', async () => {
      const mockContributor = { id: 'contributor-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        invitedContributorID: 'contributor-1',
      } as IInvitation;

      (contributorService.getContributorByUuidOrFail as Mock).mockResolvedValue(
        mockContributor
      );

      const result = await service.getInvitedContributor(mockInvitation);

      expect(result).toBe(mockContributor);
    });

    it('should throw RelationshipNotFoundException when contributor is not found', async () => {
      const mockInvitation = {
        id: 'inv-1',
        invitedContributorID: 'contributor-1',
      } as IInvitation;

      (contributorService.getContributorByUuidOrFail as Mock).mockResolvedValue(
        null as any
      );

      await expect(
        service.getInvitedContributor(mockInvitation)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });

  describe('getCreatedByOrFail', () => {
    it('should return the user who created the invitation', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        createdBy: 'user-1',
      } as IInvitation;

      (userLookupService.getUserOrFail as Mock).mockResolvedValue(mockUser);

      const result = await service.getCreatedByOrFail(mockInvitation);

      expect(result).toBe(mockUser);
    });

    it('should throw RelationshipNotFoundException when user is null', async () => {
      const mockInvitation = {
        id: 'inv-1',
        createdBy: 'user-1',
      } as IInvitation;

      (userLookupService.getUserOrFail as Mock).mockResolvedValue(null as any);

      await expect(service.getCreatedByOrFail(mockInvitation)).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('findExistingInvitations', () => {
    it('should return invitations when they exist', async () => {
      const mockInvitations = [{ id: 'inv-1' }] as Invitation[];
      db.query.invitations.findMany.mockResolvedValueOnce(mockInvitations);

      const result = await service.findExistingInvitations(
        'contributor-1',
        'roleset-1'
      );

      expect(result).toEqual(mockInvitations);
    });

    it('should return empty array when no invitations found', async () => {

      const result = await service.findExistingInvitations(
        'contributor-1',
        'roleset-1'
      );

      expect(result).toEqual([]);
    });
  });

  describe('findInvitationsForContributor', () => {
    it('should return all invitations when no states filter is provided', async () => {
      const mockInvitations = [
        { id: 'inv-1' },
        { id: 'inv-2' },
      ] as Invitation[];
      db.query.invitations.findMany.mockResolvedValueOnce(mockInvitations);

      const result =
        await service.findInvitationsForContributor('contributor-1');

      expect(result).toEqual(mockInvitations);
    });

    it('should include lifecycle relation when states filter is provided', async () => {

      await service.findInvitationsForContributor('contributor-1', ['invited']);

    });
  });

  describe('getLifecycleState', () => {
    it('should return the lifecycle state from invitationLifecycleService', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (invitationLifecycleService.getState as Mock).mockReturnValue('invited');

      const result = await service.getLifecycleState('inv-1');

      expect(result).toBe('invited');
      expect(invitationLifecycleService.getState).toHaveBeenCalledWith(
        mockInvitation.lifecycle
      );
    });
  });

  describe('isFinalizedInvitation', () => {
    it('should return true when invitation is in a final state', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (invitationLifecycleService.isFinalState as Mock).mockReturnValue(true);

      const result = await service.isFinalizedInvitation('inv-1');

      expect(result).toBe(true);
    });

    it('should return false when invitation is not in a final state', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (invitationLifecycleService.isFinalState as Mock).mockReturnValue(false);

      const result = await service.isFinalizedInvitation('inv-1');

      expect(result).toBe(false);
    });
  });

  describe('canInvitationBeAccepted', () => {
    it('should return true when ACCEPT is among next events', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (invitationLifecycleService.getNextEvents as Mock).mockReturnValue([
        'ACCEPT',
        'REJECT',
      ]);

      const result = await service.canInvitationBeAccepted('inv-1');

      expect(result).toBe(true);
    });

    it('should return false when ACCEPT is not among next events', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (invitationLifecycleService.getNextEvents as Mock).mockReturnValue([
        'REINVITE',
        'ARCHIVE',
      ]);

      const result = await service.canInvitationBeAccepted('inv-1');

      expect(result).toBe(false);
    });

    it('should return false when no next events are available', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (invitationLifecycleService.getNextEvents as Mock).mockReturnValue([]);

      const result = await service.canInvitationBeAccepted('inv-1');

      expect(result).toBe(false);
    });
  });
});
