import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPackResolverFields } from './innovation.pack.resolver.fields';
import { InnovationPackService } from './innovation.pack.service';

describe('InnovationPackResolverFields', () => {
  let resolver: InnovationPackResolverFields;
  let innovationPackService: InnovationPackService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationPackResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(InnovationPackResolverFields);
    innovationPackService = module.get(InnovationPackService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('templatesSet', () => {
    it('should delegate to innovationPackService.getTemplatesSetOrFail', async () => {
      const templatesSet = { id: 'ts-1' };
      vi.mocked(innovationPackService.getTemplatesSetOrFail).mockResolvedValue(
        templatesSet as any
      );

      const pack = { id: 'pack-1' } as IInnovationPack;
      const result = await resolver.templatesSet(pack);

      expect(innovationPackService.getTemplatesSetOrFail).toHaveBeenCalledWith(
        'pack-1'
      );
      expect(result).toBe(templatesSet);
    });
  });

  describe('provider', () => {
    it('should delegate to innovationPackService.getProvider', async () => {
      const provider = { id: 'provider-1' };
      vi.mocked(innovationPackService.getProvider).mockResolvedValue(
        provider as any
      );

      const pack = { id: 'pack-1' } as IInnovationPack;
      const result = await resolver.provider(pack);

      expect(innovationPackService.getProvider).toHaveBeenCalledWith('pack-1');
      expect(result).toBe(provider);
    });
  });
});
