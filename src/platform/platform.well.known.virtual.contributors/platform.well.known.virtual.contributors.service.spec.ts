import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { PlatformWellKnownVirtualContributorsService } from './platform.well.known.virtual.contributors.service';

describe('PlatformWellKnownVirtualContributorsService', () => {
  let service: PlatformWellKnownVirtualContributorsService;
  let platformRepository: MockType<Repository<Platform>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformWellKnownVirtualContributorsService,
        repositoryProviderMockFactory(Platform),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformWellKnownVirtualContributorsService);
    platformRepository = module.get(getRepositoryToken(Platform));
  });

  describe('getMappings', () => {
    it('should return the wellKnownVirtualContributors when platform exists', async () => {
      const mappings = {
        [VirtualContributorWellKnown.CHAT_GUIDANCE]: 'vc-1',
      };
      const platform = { wellKnownVirtualContributors: mappings } as any;
      platformRepository.findOne!.mockResolvedValue(platform);

      const result = await service.getMappings();

      expect(result).toEqual(mappings);
    });

    it('should return empty object when wellKnownVirtualContributors is falsy', async () => {
      const platform = { wellKnownVirtualContributors: null } as any;
      platformRepository.findOne!.mockResolvedValue(platform);

      const result = await service.getMappings();

      expect(result).toEqual({});
    });

    it('should throw EntityNotFoundException when platform not found', async () => {
      platformRepository.findOne!.mockResolvedValue(null);

      await expect(service.getMappings()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('setMapping', () => {
    it('should set a new mapping and save the platform', async () => {
      const platform = { wellKnownVirtualContributors: {} } as any;
      platformRepository.findOne!.mockResolvedValue(platform);
      platformRepository.save!.mockResolvedValue(platform);

      const result = await service.setMapping(
        VirtualContributorWellKnown.CHAT_GUIDANCE,
        'vc-new'
      );

      expect(result[VirtualContributorWellKnown.CHAT_GUIDANCE]).toBe('vc-new');
      expect(platformRepository.save).toHaveBeenCalledWith(platform);
    });

    it('should overwrite an existing mapping', async () => {
      const platform = {
        wellKnownVirtualContributors: {
          [VirtualContributorWellKnown.CHAT_GUIDANCE]: 'vc-old',
        },
      } as any;
      platformRepository.findOne!.mockResolvedValue(platform);
      platformRepository.save!.mockResolvedValue(platform);

      const result = await service.setMapping(
        VirtualContributorWellKnown.CHAT_GUIDANCE,
        'vc-new'
      );

      expect(result[VirtualContributorWellKnown.CHAT_GUIDANCE]).toBe('vc-new');
    });

    it('should initialize mappings when wellKnownVirtualContributors is falsy', async () => {
      const platform = { wellKnownVirtualContributors: null } as any;
      platformRepository.findOne!.mockResolvedValue(platform);
      platformRepository.save!.mockResolvedValue(platform);

      const result = await service.setMapping(
        VirtualContributorWellKnown.STEWARD_OWNERSHIP_EXPERT,
        'vc-steward'
      );

      expect(result[VirtualContributorWellKnown.STEWARD_OWNERSHIP_EXPERT]).toBe(
        'vc-steward'
      );
    });

    it('should throw EntityNotFoundException when platform not found', async () => {
      platformRepository.findOne!.mockResolvedValue(null);

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
      platformRepository.findOne!.mockResolvedValue(platform);

      const result = await service.getVirtualContributorID(
        VirtualContributorWellKnown.CHAT_GUIDANCE
      );

      expect(result).toBe('vc-1');
    });

    it('should return undefined when the well-known type is not mapped', async () => {
      const platform = { wellKnownVirtualContributors: {} } as any;
      platformRepository.findOne!.mockResolvedValue(platform);

      const result = await service.getVirtualContributorID(
        VirtualContributorWellKnown.CHAT_GUIDANCE
      );

      expect(result).toBeUndefined();
    });
  });
});
