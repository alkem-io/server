import { AuthorizationCredential } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { UserSettingsHomeSpaceValidationService } from './user.settings.home.space.validation.service';

describe('UserSettingsHomeSpaceValidationService', () => {
  let service: UserSettingsHomeSpaceValidationService;
  let spaceLookupService: {
    getSpaceOrFail: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSettingsHomeSpaceValidationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(UserSettingsHomeSpaceValidationService);
    spaceLookupService = module.get(SpaceLookupService) as any;
  });

  const buildAgentInfo = (
    credentialOverrides: Array<{
      type: AuthorizationCredential;
      resourceID: string;
    }> = []
  ): AgentInfo => {
    const agentInfo = new AgentInfo();
    agentInfo.credentials = credentialOverrides.map(c => ({
      type: c.type,
      resourceID: c.resourceID,
    }));
    return agentInfo;
  };

  describe('validateSpaceAccess', () => {
    it('should succeed when user has a space credential matching the spaceID', async () => {
      const spaceID = 'space-1';
      spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: spaceID });

      const agentInfo = buildAgentInfo([
        { type: AuthorizationCredential.SPACE_MEMBER, resourceID: spaceID },
      ]);

      await expect(
        service.validateSpaceAccess(spaceID, agentInfo)
      ).resolves.toBeUndefined();
    });

    it('should throw ValidationException when user has no credentials for the space', async () => {
      const spaceID = 'space-1';
      spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: spaceID });

      const agentInfo = buildAgentInfo([
        {
          type: AuthorizationCredential.SPACE_MEMBER,
          resourceID: 'other-space',
        },
      ]);

      await expect(
        service.validateSpaceAccess(spaceID, agentInfo)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when user has no space credentials at all', async () => {
      const spaceID = 'space-1';
      spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: spaceID });

      const agentInfo = buildAgentInfo([]);

      await expect(
        service.validateSpaceAccess(spaceID, agentInfo)
      ).rejects.toThrow(ValidationException);
    });

    it('should propagate the error when space does not exist', async () => {
      const spaceID = 'nonexistent-space';
      spaceLookupService.getSpaceOrFail.mockRejectedValue(
        new Error('Space not found')
      );

      const agentInfo = buildAgentInfo([
        { type: AuthorizationCredential.SPACE_MEMBER, resourceID: spaceID },
      ]);

      await expect(
        service.validateSpaceAccess(spaceID, agentInfo)
      ).rejects.toThrow('Space not found');
    });

    it('should recognize SPACE_ADMIN credential as valid access', async () => {
      const spaceID = 'space-1';
      spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: spaceID });

      const agentInfo = buildAgentInfo([
        { type: AuthorizationCredential.SPACE_ADMIN, resourceID: spaceID },
      ]);

      await expect(
        service.validateSpaceAccess(spaceID, agentInfo)
      ).resolves.toBeUndefined();
    });
  });

  describe('isHomeSpaceValid', () => {
    it('should return false when spaceID is null', async () => {
      const agentInfo = buildAgentInfo();

      const result = await service.isHomeSpaceValid(null, agentInfo);

      expect(result).toBe(false);
    });

    it('should return false when spaceID is undefined', async () => {
      const agentInfo = buildAgentInfo();

      const result = await service.isHomeSpaceValid(undefined, agentInfo);

      expect(result).toBe(false);
    });

    it('should return false when spaceID is empty string', async () => {
      const agentInfo = buildAgentInfo();

      const result = await service.isHomeSpaceValid('', agentInfo);

      expect(result).toBe(false);
    });

    it('should return true when user has access to the space', async () => {
      const spaceID = 'space-1';
      spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: spaceID });

      const agentInfo = buildAgentInfo([
        { type: AuthorizationCredential.SPACE_MEMBER, resourceID: spaceID },
      ]);

      const result = await service.isHomeSpaceValid(spaceID, agentInfo);

      expect(result).toBe(true);
    });

    it('should return false when space does not exist', async () => {
      spaceLookupService.getSpaceOrFail.mockRejectedValue(
        new Error('Space not found')
      );

      const agentInfo = buildAgentInfo([
        { type: AuthorizationCredential.SPACE_MEMBER, resourceID: 'space-1' },
      ]);

      const result = await service.isHomeSpaceValid('space-1', agentInfo);

      expect(result).toBe(false);
    });

    it('should return false when user does not have access to the space', async () => {
      const spaceID = 'space-1';
      spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: spaceID });

      const agentInfo = buildAgentInfo([
        {
          type: AuthorizationCredential.SPACE_MEMBER,
          resourceID: 'other-space',
        },
      ]);

      const result = await service.isHomeSpaceValid(spaceID, agentInfo);

      expect(result).toBe(false);
    });
  });
});
