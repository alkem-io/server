import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { NVP } from './nvp.entity';
import { NVPService } from './nvp.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('NVPService', () => {
  let service: NVPService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NVPService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(NVPService);
    db = module.get(DRIZZLE);
  });

  describe('getNvpOrFail', () => {
    it('should return the NVP when it exists', async () => {
      const nvp = { id: 'nvp-1', name: 'key', value: 'val' } as NVP;
      db.query.nvps.findFirst.mockResolvedValueOnce(nvp);

      const result = await service.getNvpOrFail('nvp-1');

      expect(result).toBe(nvp);
    });

    it('should throw EntityNotFoundException when NVP does not exist', async () => {

      await expect(service.getNvpOrFail('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('removeNVP', () => {
    it('should remove and return the NVP when it exists', async () => {
      const nvp = { id: 'nvp-1', name: 'key', value: 'val' } as NVP;
      db.query.nvps.findFirst.mockResolvedValueOnce(nvp);

      const result = await service.removeNVP('nvp-1');

      expect(result).toBe(nvp);
    });

    it('should throw EntityNotFoundException when removing a non-existent NVP', async () => {

      await expect(service.removeNVP('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
