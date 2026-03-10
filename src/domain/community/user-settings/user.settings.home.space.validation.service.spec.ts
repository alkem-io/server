import { AuthorizationCredential } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
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

  const buildActorContext = (
    credentialOverrides: Array<{
      type: AuthorizationCredential;
      resourceID: string;
    }> = []
  ): ActorContext => {
    const actorContext = new ActorContext();
    actorContext.credentials = credentialOverrides.map(c => ({
      type: c.type,
      resourceID: c.resourceID,
    }));
    return actorContext;
  };

  describe('validateSpaceAccess', () => {
    it('should succeed when user has a space credential matching the spaceID', async () => {
      const spaceID = 'space-1';
      spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: spaceID });

      const actorContext = buildActorContext([
        { type: AuthorizationCredential.SPACE_MEMBER, resourceID: spaceID },
      ]);

      await expect(
        service.validateSpaceAccess(spaceID, actorContext)
      ).resolves.toBeUndefined();
    });

    it('should throw ValidationException when user has no credentials for the space', async () => {
      const spaceID = 'space-1';
      spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: spaceID });

      const actorContext = buildActorContext([
        {
          type: AuthorizationCredential.SPACE_MEMBER,
          resourceID: 'other-space',
        },
      ]);

      await expect(
        service.validateSpaceAccess(spaceID, actorContext)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when user has no space credentials at all', async () => {
      const spaceID = 'space-1';
      spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: spaceID });

      const actorContext = buildActorContext([]);

      await expect(
        service.validateSpaceAccess(spaceID, actorContext)
      ).rejects.toThrow(ValidationException);
    });

    it('should propagate the error when space does not exist', async () => {
      const spaceID = 'nonexistent-space';
      spaceLookupService.getSpaceOrFail.mockRejectedValue(
        new Error('Space not found')
      );

      const actorContext = buildActorContext([
        { type: AuthorizationCredential.SPACE_MEMBER, resourceID: spaceID },
      ]);

      await expect(
        service.validateSpaceAccess(spaceID, actorContext)
      ).rejects.toThrow('Space not found');
    });

    it('should recognize SPACE_ADMIN credential as valid access', async () => {
      const spaceID = 'space-1';
      spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: spaceID });

      const actorContext = buildActorContext([
        { type: AuthorizationCredential.SPACE_ADMIN, resourceID: spaceID },
      ]);

      await expect(
        service.validateSpaceAccess(spaceID, actorContext)
      ).resolves.toBeUndefined();
    });
  });

  describe('isHomeSpaceValid', () => {
    it('should return false when spaceID is null', async () => {
      const actorContext = buildActorContext();

      const result = await service.isHomeSpaceValid(null, actorContext);

      expect(result).toBe(false);
    });

    it('should return false when spaceID is undefined', async () => {
      const actorContext = buildActorContext();

      const result = await service.isHomeSpaceValid(undefined, actorContext);

      expect(result).toBe(false);
    });

    it('should return false when spaceID is empty string', async () => {
      const actorContext = buildActorContext();

      const result = await service.isHomeSpaceValid('', actorContext);

      expect(result).toBe(false);
    });

    it('should return true when user has access to the space', async () => {
      const spaceID = 'space-1';
      spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: spaceID });

      const actorContext = buildActorContext([
        { type: AuthorizationCredential.SPACE_MEMBER, resourceID: spaceID },
      ]);

      const result = await service.isHomeSpaceValid(spaceID, actorContext);

      expect(result).toBe(true);
    });

    it('should return false when space does not exist', async () => {
      spaceLookupService.getSpaceOrFail.mockRejectedValue(
        new Error('Space not found')
      );

      const actorContext = buildActorContext([
        { type: AuthorizationCredential.SPACE_MEMBER, resourceID: 'space-1' },
      ]);

      const result = await service.isHomeSpaceValid('space-1', actorContext);

      expect(result).toBe(false);
    });

    it('should return false when user does not have access to the space', async () => {
      const spaceID = 'space-1';
      spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: spaceID });

      const actorContext = buildActorContext([
        {
          type: AuthorizationCredential.SPACE_MEMBER,
          resourceID: 'other-space',
        },
      ]);

      const result = await service.isHomeSpaceValid(spaceID, actorContext);

      expect(result).toBe(false);
    });
  });
});
