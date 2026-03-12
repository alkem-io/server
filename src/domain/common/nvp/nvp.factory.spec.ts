import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { NVP } from './nvp.entity';
import { NVPFactoryService } from './nvp.factory';

describe('NVPFactoryService', () => {
  let service: NVPFactoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NVPFactoryService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(NVPFactoryService);
  });

  describe('toNVPArray', () => {
    it('should convert a list of name-value pairs to NVP entities', () => {
      const input = [
        { name: 'key1', value: 'val1' },
        { name: 'key2', value: 'val2' },
      ];

      const result = service.toNVPArray(input);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(NVP);
      expect(result[0].name).toBe('key1');
      expect(result[0].value).toBe('val1');
      expect(result[1].name).toBe('key2');
      expect(result[1].value).toBe('val2');
    });

    it('should return an empty array when given an empty list', () => {
      const result = service.toNVPArray([]);

      expect(result).toEqual([]);
    });

    it('should handle a single item', () => {
      const result = service.toNVPArray([{ name: 'only', value: 'one' }]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('only');
      expect(result[0].value).toBe('one');
    });
  });
});
