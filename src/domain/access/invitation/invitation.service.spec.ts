import { LogContext } from '@common/enums/logging.context';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { Mock, vi } from 'vitest';
import { RoleSetCacheService } from '../role-set/role.set.service.cache';
import { Invitation } from './invitation.entity';
import { IInvitation } from './invitation.interface';
import { InvitationService } from './invitation.service';
import { InvitationLifecycleService } from './invitation.service.lifecycle';

describe('InvitationService', () => {
  let service: InvitationService;
  let invitationRepository: Repository<Invitation>;
  let lifecycleService: LifecycleService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let invitationLifecycleService: InvitationLifecycleService;
  let actorLookupService: ActorLookupService;
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
        repositoryProviderMockFactory(Invitation),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<InvitationService>(InvitationService);
    invitationRepository = module.get<Repository<Invitation>>(
      getRepositoryToken(Invitation)
    );
    lifecycleService = module.get<LifecycleService>(LifecycleService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    invitationLifecycleService = module.get<InvitationLifecycleService>(
      InvitationLifecycleService
    );
    actorLookupService = module.get<ActorLookupService>(ActorLookupService);
    userLookupService = module.get<UserLookupService>(UserLookupService);
    roleSetCacheService = module.get<RoleSetCacheService>(RoleSetCacheService);
  });

  describe('getInvitationOrFail', () => {
    it('should return invitation when it exists', async () => {
      const mockInvitation = { id: 'inv-1' } as Invitation;
      vi.spyOn(invitationRepository, 'findOne').mockResolvedValue(
        mockInvitation
      );

      const result = await service.getInvitationOrFail('inv-1');

      expect(result).toBe(mockInvitation);
    });

    it('should throw EntityNotFoundException when invitation does not exist', async () => {
      vi.spyOn(invitationRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getInvitationOrFail('non-existent')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should merge provided options with the id filter', async () => {
      const mockInvitation = { id: 'inv-1' } as Invitation;
      vi.spyOn(invitationRepository, 'findOne').mockResolvedValue(
        mockInvitation
      );

      await service.getInvitationOrFail('inv-1', {
        relations: { roleSet: true },
      });

      expect(invitationRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          relations: { roleSet: true },
        })
      );
    });
  });

  describe('getInvitationsOrFail', () => {
    it('should return all invitations when all IDs are found', async () => {
      const mockInvitations = [
        { id: 'inv-1' },
        { id: 'inv-2' },
      ] as Invitation[];
      vi.spyOn(invitationRepository, 'findBy').mockResolvedValue(
        mockInvitations
      );

      const result = await service.getInvitationsOrFail(['inv-1', 'inv-2']);

      expect(result).toHaveLength(2);
    });

    it('should throw EntityNotFoundException when some IDs are not found', async () => {
      const mockInvitations = [{ id: 'inv-1' }] as Invitation[];
      vi.spyOn(invitationRepository, 'findBy').mockResolvedValue(
        mockInvitations
      );

      await expect(
        service.getInvitationsOrFail(['inv-1', 'inv-2'])
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when no invitations are found', async () => {
      vi.spyOn(invitationRepository, 'findBy').mockResolvedValue(null as any);

      await expect(service.getInvitationsOrFail(['inv-1'])).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('createInvitation', () => {
    it('should create invitation with authorization policy and lifecycle', async () => {
      const invitationData = {
        invitedActorId: 'contributor-1',
        createdBy: 'user-1',
        roleSetID: 'roleset-1',
        invitedToParent: false,
      };
      const mockLifecycle = { id: 'lifecycle-1' } as any;

      (lifecycleService.createLifecycle as Mock).mockResolvedValue(
        mockLifecycle
      );
      vi.spyOn(invitationRepository, 'save').mockImplementation(
        async (entity: any) => entity
      );

      const result = await service.createInvitation(invitationData);

      expect(result.authorization).toBeDefined();
      expect(result.lifecycle).toBe(mockLifecycle);
      expect(invitationRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteInvitation', () => {
    it('should delete invitation with lifecycle, auth policy, and invalidate caches', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
        authorization: { id: 'auth-1' },
        invitedActorId: 'contributor-1',
        roleSet: { id: 'roleset-1' },
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
      vi.spyOn(invitationRepository, 'remove').mockResolvedValue({
        ...mockInvitation,
        id: undefined,
      });
      (
        roleSetCacheService.deleteOpenInvitationFromCache as Mock
      ).mockResolvedValue(undefined);
      (actorLookupService.actorExists as Mock).mockResolvedValue(true);
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
      ).toHaveBeenCalledWith('contributor-1', 'roleset-1');
      expect(result.id).toBe('inv-1');
    });

    it('should skip authorization policy deletion when authorization is undefined', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
        authorization: undefined,
        invitedActorId: undefined,
        roleSet: undefined,
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (lifecycleService.deleteLifecycle as Mock).mockResolvedValue(
        undefined as any
      );
      vi.spyOn(invitationRepository, 'remove').mockResolvedValue({
        ...mockInvitation,
        id: undefined,
      });

      await service.deleteInvitation({ ID: 'inv-1' });

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });

    it('should skip cache invalidation when invitedActorId or roleSet is not present', async () => {
      const mockInvitation = {
        id: 'inv-1',
        lifecycle: { id: 'lifecycle-1' },
        authorization: undefined,
        invitedActorId: undefined,
        roleSet: undefined,
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (lifecycleService.deleteLifecycle as Mock).mockResolvedValue(
        undefined as any
      );
      vi.spyOn(invitationRepository, 'remove').mockResolvedValue({
        ...mockInvitation,
        id: undefined,
      });

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
        invitedActorId: 'contributor-1',
        roleSet: { id: 'roleset-1' },
      } as any;

      vi.spyOn(service, 'getInvitationOrFail').mockResolvedValue(
        mockInvitation
      );
      (lifecycleService.deleteLifecycle as Mock).mockResolvedValue(
        undefined as any
      );
      vi.spyOn(invitationRepository, 'remove').mockResolvedValue({
        ...mockInvitation,
        id: undefined,
      });
      (
        roleSetCacheService.deleteOpenInvitationFromCache as Mock
      ).mockResolvedValue(undefined);
      (actorLookupService.actorExists as Mock).mockResolvedValue(false);

      await service.deleteInvitation({ ID: 'inv-1' });

      expect(
        roleSetCacheService.deleteMembershipStatusCache
      ).not.toHaveBeenCalled();
    });
  });

  describe('getInvitedActor', () => {
    it('should return the contributor for the invitation', async () => {
      const mockContributor = { id: 'contributor-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        invitedActorId: 'contributor-1',
      } as IInvitation;

      (actorLookupService.getFullActorByIdOrFail as Mock).mockResolvedValue(
        mockContributor
      );

      const result = await service.getInvitedActor(mockInvitation);

      expect(result).toBe(mockContributor);
    });

    it('should throw EntityNotFoundException when actor is not found', async () => {
      const mockInvitation = {
        id: 'inv-1',
        invitedActorId: 'contributor-1',
      } as IInvitation;

      (actorLookupService.getFullActorByIdOrFail as Mock).mockRejectedValue(
        new EntityNotFoundException('Actor not found', LogContext.COMMUNITY)
      );

      await expect(service.getInvitedActor(mockInvitation)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getCreatedByOrFail', () => {
    it('should return the user who created the invitation', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        createdBy: 'user-1',
      } as IInvitation;

      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue(mockUser);

      const result = await service.getCreatedByOrFail(mockInvitation);

      expect(result).toBe(mockUser);
    });

    it('should throw RelationshipNotFoundException when user is null', async () => {
      const mockInvitation = {
        id: 'inv-1',
        createdBy: 'user-1',
      } as IInvitation;

      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue(
        null as any
      );

      await expect(service.getCreatedByOrFail(mockInvitation)).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('findExistingInvitations', () => {
    it('should return invitations when they exist', async () => {
      const mockInvitations = [{ id: 'inv-1' }] as Invitation[];
      vi.spyOn(invitationRepository, 'find').mockResolvedValue(mockInvitations);

      const result = await service.findExistingInvitations(
        'contributor-1',
        'roleset-1'
      );

      expect(result).toEqual(mockInvitations);
    });

    it('should return empty array when no invitations found', async () => {
      vi.spyOn(invitationRepository, 'find').mockResolvedValue([]);

      const result = await service.findExistingInvitations(
        'contributor-1',
        'roleset-1'
      );

      expect(result).toEqual([]);
    });
  });

  describe('findInvitationsForActor', () => {
    it('should return all invitations when no states filter is provided', async () => {
      const mockInvitations = [
        { id: 'inv-1' },
        { id: 'inv-2' },
      ] as Invitation[];
      vi.spyOn(invitationRepository, 'find').mockResolvedValue(mockInvitations);

      const result = await service.findInvitationsForActor('contributor-1');

      expect(result).toEqual(mockInvitations);
      expect(invitationRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: { roleSet: true },
          where: { invitedActorId: 'contributor-1' },
        })
      );
    });

    it('should include lifecycle relation when states filter is provided', async () => {
      vi.spyOn(invitationRepository, 'find').mockResolvedValue([]);

      await service.findInvitationsForActor('contributor-1', ['invited']);

      expect(invitationRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: { roleSet: true, lifecycle: true },
        })
      );
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
