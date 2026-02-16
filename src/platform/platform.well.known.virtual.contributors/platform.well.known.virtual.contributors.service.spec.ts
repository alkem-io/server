import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { Platform } from '@platform/platform/platform.entity';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { PlatformWellKnownVirtualContributorsService } from './platform.well.known.virtual.contributors.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('PlatformWellKnownVirtualContributorsService', () => {
  let service: PlatformWellKnownVirtualContributorsService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformWellKnownVirtualContributorsService,
        mockDrizzleProvider,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformWellKnownVirtualContributorsService);
    db = module.get(DRIZZLE);
  });

  describe('getMappings', () => {
    it('should return the wellKnownVirtualContributors when platform exists', async () => {
      const mappings = {
        [VirtualContributorWellKnown.CHAT_GUIDANCE]: 'vc-1',
      };
      const platform = { wellKnownVirtualContributors: mappings } as any;
      db.query.platforms.findFirst.mockResolvedValueOnce(platform);

      const result = await service.getMappings();

      expect(result).toEqual(mappings);
    });

    it('should return empty object when wellKnownVirtualContributors is falsy', async () => {
      const platform = { wellKnownVirtualContributors: null } as any;
      db.query.platforms.findFirst.mockResolvedValueOnce(platform);

      const result = await service.getMappings();

      expect(result).toEqual({});
    });

    it('should throw EntityNotFoundException when platform not found', async () => {
      // findFirst returns undefined by default
      await expect(service.getMappings()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('setMapping', () => {
    it('should set a new mapping and save the platform', async () => {
      const platform = { id: 'plat-1', wellKnownVirtualContributors: {} } as any;
      db.query.platforms.findFirst.mockResolvedValueOnce(platform);

      const result = await service.setMapping(
        VirtualContributorWellKnown.CHAT_GUIDANCE,
        'vc-new'
      );

      expect(result[VirtualContributorWellKnown.CHAT_GUIDANCE]).toBe('vc-new');
    });

    it('should overwrite an existing mapping', async () => {
      const platform = {
        id: 'plat-1',
        wellKnownVirtualContributors: {
          [VirtualContributorWellKnown.CHAT_GUIDANCE]: 'vc-old',
        },
      } as any;
      db.query.platforms.findFirst.mockResolvedValueOnce(platform);

      const result = await service.setMapping(
        VirtualContributorWellKnown.CHAT_GUIDANCE,
        'vc-new'
      );

      expect(result[VirtualContributorWellKnown.CHAT_GUIDANCE]).toBe('vc-new');
    });

    it('should initialize mappings when wellKnownVirtualContributors is falsy', async () => {
      const platform = { id: 'plat-1', wellKnownVirtualContributors: null } as any;
      db.query.platforms.findFirst.mockResolvedValueOnce(platform);

      const result = await service.setMapping(
        VirtualContributorWellKnown.STEWARD_OWNERSHIP_EXPERT,
        'vc-steward'
      );

      expect(result[VirtualContributorWellKnown.STEWARD_OWNERSHIP_EXPERT]).toBe(
        'vc-steward'
      );
    });

    it('should throw EntityNotFoundException when platform not found', async () => {
      // findFirst returns undefined by default
      await expect(
        service.setMapping(VirtualContributorWellKnown.CHAT_GUIDANCE, 'vc-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getVirtualContributorID', () => {
    it('should return the VC ID for the given well-known type', async () => {
      const platform = {
        wellKnownVirtualContributors: {
          [VirtualContributorWellKnown.CHAT_GUIDANCE]: 'vc-1',
        },
      } as any;
      db.query.platforms.findFirst.mockResolvedValueOnce(platform);

      const result = await service.getVirtualContributorID(
        VirtualContributorWellKnown.CHAT_GUIDANCE
      );

      expect(result).toBe('vc-1');
    });

    it('should return undefined when the well-known type is not mapped', async () => {
      const platform = { wellKnownVirtualContributors: {} } as any;
      db.query.platforms.findFirst.mockResolvedValueOnce(platform);

      const result = await service.getVirtualContributorID(
        VirtualContributorWellKnown.CHAT_GUIDANCE
      );

      expect(result).toBeUndefined();
    });
  });
});
