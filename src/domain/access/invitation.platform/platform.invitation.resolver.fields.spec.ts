import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { PlatformInvitationResolverFields } from './platform.invitation.resolver.fields';
import { PlatformInvitationService } from './platform.invitation.service';

describe('PlatformInvitationResolverFields', () => {
  let resolver: PlatformInvitationResolverFields;
  let platformInvitationService: PlatformInvitationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformInvitationResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<PlatformInvitationResolverFields>(
      PlatformInvitationResolverFields
    );
    platformInvitationService = module.get<PlatformInvitationService>(
      PlatformInvitationService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createdBy', () => {
    it('should return the user who created the invitation', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockInvitation = { id: 'inv-1' } as any;
      (platformInvitationService.getCreatedBy as Mock).mockResolvedValue(
        mockUser
      );

      const result = await resolver.createdBy(mockInvitation);

      expect(result).toBe(mockUser);
      expect(platformInvitationService.getCreatedBy).toHaveBeenCalledWith(
        mockInvitation
      );
    });
  });
});
