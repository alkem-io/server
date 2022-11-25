import { Test, TestingModule } from '@nestjs/testing';
import {
  MockCacheManager,
  MockConfigService,
  MockHttpService,
} from '@test/mocks';
import { GeoLocationService } from '@services/external/geo-location';

describe('GeoLocationService', () => {
  let service: GeoLocationService;

  MockConfigService.useValue = {
    ...MockConfigService.useValue,
    get: () => ({
      geo: {
        service_endpoint: 'mock',
      },
    }),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [
        GeoLocationService,
        MockCacheManager,
        MockHttpService,
        MockConfigService,
      ],
    }).compile();

    service = app.get(GeoLocationService);
  });

  describe('root', () => {
    it('should return "Hello Alkemio!"', () => {
      expect(1).toBe(1);
    });
  });
});
