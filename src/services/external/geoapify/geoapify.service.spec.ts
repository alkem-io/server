import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { of, throwError } from 'rxjs';
import { GeoapifyService } from './geoapify.service';

describe('GeoapifyService', () => {
  let service: GeoapifyService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoapifyService,
        MockWinstonProvider,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'integrations.geoapify') {
                return {
                  geocode_rest_endpoint: 'https://api.geoapify.com/v1/geocode',
                  api_key: 'test-api-key',
                };
              }
              if (key === 'integrations.geoapify.enabled') {
                return true;
              }
              return undefined;
            }),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(GeoapifyService);
    httpService = module.get(HttpService);
  });

  describe('isEnabled', () => {
    it('should return true when enabled in config', () => {
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('getGeoapifyGeocodeLocation', () => {
    it('should return undefined when service is disabled', async () => {
      // Create a service with disabled config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GeoapifyService,
          MockWinstonProvider,
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn((key: string) => {
                if (key === 'integrations.geoapify') {
                  return {
                    geocode_rest_endpoint:
                      'https://api.geoapify.com/v1/geocode',
                    api_key: 'test-api-key',
                  };
                }
                if (key === 'integrations.geoapify.enabled') {
                  return false;
                }
                return undefined;
              }),
            },
          },
        ],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      const disabledService = module.get(GeoapifyService);
      const result = await disabledService.getGeoapifyGeocodeLocation(
        'US',
        'NYC'
      );
      expect(result).toBeUndefined();
    });

    it('should return undefined when country is empty', async () => {
      const result = await service.getGeoapifyGeocodeLocation('', undefined);
      expect(result).toBeUndefined();
    });

    it('should return location for country only', async () => {
      vi.mocked(httpService.get).mockReturnValue(
        of({
          data: {
            features: [
              {
                properties: { lon: -95.7129, lat: 37.0902 },
              },
            ],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        })
      );

      const result = await service.getGeoapifyGeocodeLocation('US', undefined);

      expect(result).toEqual({
        longitude: -95.7129,
        latitude: 37.0902,
      });
    });

    it('should include city in search text when provided', async () => {
      vi.mocked(httpService.get).mockReturnValue(
        of({
          data: {
            features: [
              {
                properties: { lon: -74.006, lat: 40.7128 },
              },
            ],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        })
      );

      const result = await service.getGeoapifyGeocodeLocation('US', 'New York');

      expect(result).toEqual({
        longitude: -74.006,
        latitude: 40.7128,
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            text: expect.stringContaining('New York'),
          }),
        })
      );
    });

    it('should return undefined when no features in response', async () => {
      vi.mocked(httpService.get).mockReturnValue(
        of({
          data: { features: [] },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        })
      );

      const result = await service.getGeoapifyGeocodeLocation('XY', undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined on HTTP error', async () => {
      vi.mocked(httpService.get).mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      const result = await service.getGeoapifyGeocodeLocation('US', 'NYC');
      expect(result).toBeUndefined();
    });

    it('should resolve ISO country codes to names', async () => {
      vi.mocked(httpService.get).mockReturnValue(
        of({
          data: {
            features: [
              {
                properties: { lon: 10.0, lat: 50.0 },
              },
            ],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        })
      );

      await service.getGeoapifyGeocodeLocation('DE', undefined);

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            text: 'Germany',
          }),
        })
      );
    });
  });
});
