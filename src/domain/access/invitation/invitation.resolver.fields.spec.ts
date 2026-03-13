import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { InvitationResolverFields } from './invitation.resolver.fields';
import { InvitationService } from './invitation.service';

describe('InvitationResolverFields', () => {
  let resolver: InvitationResolverFields;
  let invitationService: InvitationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<InvitationResolverFields>(InvitationResolverFields);
    invitationService = module.get<InvitationService>(InvitationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('invitedActor', () => {
    it('should return the invited actor', async () => {
      const mockActor = { id: 'actor-1' } as any;
      const mockInvitation = { id: 'inv-1' } as any;
      (invitationService.getInvitedActor as Mock).mockResolvedValue(mockActor);

      const result = await resolver.invitedActor(mockInvitation);

      expect(result).toBe(mockActor);
      expect(invitationService.getInvitedActor).toHaveBeenCalledWith(
        mockInvitation
      );
    });
  });

  describe('createdBy', () => {
    it('should return the user who created the invitation', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockInvitation = { id: 'inv-1' } as any;
      (invitationService.getCreatedByOrFail as Mock).mockResolvedValue(
        mockUser
      );

      const result = await resolver.createdBy(mockInvitation);

      expect(result).toBe(mockUser);
    });

    it('should return null when createdBy user is not found', async () => {
      const mockInvitation = { id: 'inv-1' } as any;
      (invitationService.getCreatedByOrFail as Mock).mockRejectedValue(
        new Error('not found')
      );

      const result = await resolver.createdBy(mockInvitation);

      expect(result).toBeNull();
    });
  });
});
