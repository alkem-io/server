import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockType } from '@test/utils/mock.type';
import { Repository } from 'typeorm';
import { NVP } from './nvp.entity';
import { NVPService } from './nvp.service';
import { EntityNotFoundException } from '@common/exceptions';

describe('NVPService', () => {
  let service: NVPService;
  let nvpRepository: MockType<Repository<NVP>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NVPService,
        repositoryProviderMockFactory(NVP),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(NVPService);
    nvpRepository = module.get(getRepositoryToken(NVP));
  });

  describe('getNvpOrFail', () => {
    it('should return the NVP when it exists', async () => {
      const nvp = { id: 'nvp-1', name: 'key', value: 'val' } as NVP;
      nvpRepository.findOneBy!.mockResolvedValue(nvp);

      const result = await service.getNvpOrFail('nvp-1');

      expect(result).toBe(nvp);
      expect(nvpRepository.findOneBy).toHaveBeenCalledWith({ id: 'nvp-1' });
    });

    it('should throw EntityNotFoundException when NVP does not exist', async () => {
      nvpRepository.findOneBy!.mockResolvedValue(null);

      await expect(service.getNvpOrFail('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('removeNVP', () => {
    it('should remove and return the NVP when it exists', async () => {
      const nvp = { id: 'nvp-1', name: 'key', value: 'val' } as NVP;
      nvpRepository.findOneBy!.mockResolvedValue(nvp);
      nvpRepository.remove!.mockResolvedValue(nvp);

      const result = await service.removeNVP('nvp-1');

      expect(result).toBe(nvp);
      expect(nvpRepository.remove).toHaveBeenCalledWith(nvp);
    });

    it('should throw EntityNotFoundException when removing a non-existent NVP', async () => {
      nvpRepository.findOneBy!.mockResolvedValue(null);

      await expect(service.removeNVP('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
