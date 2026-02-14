import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { InnovationPackDefaultsService } from './innovation.pack.defaults.service';

describe('InnovationPackDefaultsService', () => {
  let service: InnovationPackDefaultsService;
  let namingService: NamingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationPackDefaultsService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(InnovationPackDefaultsService);
    namingService = module.get(NamingService);
  });

  describe('createVirtualContributorNameID', () => {
    it('should delegate to namingService with the displayName as base and the reserved name IDs', async () => {
      const reservedNameIDs = ['existing-pack', 'another-pack'];
      vi.mocked(
        namingService.getReservedNameIDsInInnovationPacks
      ).mockResolvedValue(reservedNameIDs);
      vi.mocked(
        namingService.createNameIdAvoidingReservedNameIDs
      ).mockReturnValue('my-new-pack');

      const result =
        await service.createVirtualContributorNameID('My New Pack');

      expect(
        namingService.getReservedNameIDsInInnovationPacks
      ).toHaveBeenCalledOnce();
      expect(
        namingService.createNameIdAvoidingReservedNameIDs
      ).toHaveBeenCalledWith('My New Pack', reservedNameIDs);
      expect(result).toBe('my-new-pack');
    });

    it('should pass through the displayName as the base parameter without modification', async () => {
      vi.mocked(
        namingService.getReservedNameIDsInInnovationPacks
      ).mockResolvedValue([]);
      vi.mocked(
        namingService.createNameIdAvoidingReservedNameIDs
      ).mockReturnValue('special-chars-name');

      await service.createVirtualContributorNameID('Special Chars Name!');

      expect(
        namingService.createNameIdAvoidingReservedNameIDs
      ).toHaveBeenCalledWith('Special Chars Name!', []);
    });

    it('should handle an empty displayName', async () => {
      vi.mocked(
        namingService.getReservedNameIDsInInnovationPacks
      ).mockResolvedValue([]);
      vi.mocked(
        namingService.createNameIdAvoidingReservedNameIDs
      ).mockReturnValue('');

      const result = await service.createVirtualContributorNameID('');

      expect(
        namingService.createNameIdAvoidingReservedNameIDs
      ).toHaveBeenCalledWith('', []);
      expect(result).toBe('');
    });

    it('should return the result from createNameIdAvoidingReservedNameIDs', async () => {
      vi.mocked(
        namingService.getReservedNameIDsInInnovationPacks
      ).mockResolvedValue(['taken-name']);
      vi.mocked(
        namingService.createNameIdAvoidingReservedNameIDs
      ).mockReturnValue('taken-name-1');

      const result =
        await service.createVirtualContributorNameID('Taken Name');

      expect(result).toBe('taken-name-1');
    });
  });
});
