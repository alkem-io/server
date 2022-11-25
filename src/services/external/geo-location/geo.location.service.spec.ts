import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { Cache } from 'cache-manager';
import { of } from 'rxjs';
import {
  MockCacheManager,
  MockConfigService,
  MockHttpService,
} from '@test/mocks';
import { CACHE_MANAGER } from '@nestjs/common';
import { asyncToThrow } from '@test/utils';
import {
  GeoServiceErrorException,
  GeoServiceNotAvailableException,
  GeoServiceRequestLimitExceededException,
} from '@common/exceptions/geo';
import { GeoLocationService } from './geo.location.service';
import * as isLimitExceededModule from './utils/is.limit.exceeded';

describe('GeoLocationService', () => {
  let geoLocationService: GeoLocationService;
  let cacheService: Cache;
  let httpService: HttpService;

  MockConfigService.useValue = {
    ...MockConfigService.useValue,
    get: () => ({
      geo: {
        service_endpoint: 'mock',
        allowed_calls_to_service: 1,
        allowed_calls_to_service_window: 1,
        cache_entry_ttl: 14440,
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

    geoLocationService = app.get(GeoLocationService);
    cacheService = app.get(CACHE_MANAGER);
    httpService = app.get(HttpService);
  });

  it('should return cached value', async () => {
    const mockValue = {
      latitude: 1,
      longitude: 2,
    };

    const spy = jest.spyOn(cacheService, 'get');
    spy.mockResolvedValueOnce(mockValue);

    const result = await geoLocationService.getGeo('ip');

    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith('ip');
    expect(result).toEqual(mockValue);
  });
  describe('isLimitExceeded', () => {
    it('return true on equal amount of calls', () => {
      expect(isLimitExceededModule.isLimitExceeded({ start: 1, calls: 1 }, 1));
    });
    it('return true on greater amount of calls', () => {
      expect(isLimitExceededModule.isLimitExceeded({ start: 1, calls: 3 }, 1));
    });
    it('return false on less amount of calls', () => {
      expect(isLimitExceededModule.isLimitExceeded({ start: 1, calls: 0 }, 1));
    });
  });
  it('should throw on limit exceeded', async () => {
    const spy = jest.spyOn(cacheService, 'get');
    spy.mockImplementation(name =>
      Promise.resolve(
        name === 'geo-service-call-limit'
          ? {
              start: 1,
              calls: 1,
            }
          : undefined
      )
    );

    jest
      .spyOn(isLimitExceededModule, 'isLimitExceeded')
      .mockReturnValueOnce(true);

    await asyncToThrow(
      geoLocationService.getGeo('ip'),
      GeoServiceRequestLimitExceededException
    );

    expect(spy).toBeCalledWith('geo-service-call-limit');
    expect(spy).toBeCalledTimes(2);
  });
  it('should throw on empty service response', async () => {
    jest.spyOn(cacheService, 'get').mockResolvedValue(undefined);
    // jest doesnt pick the right overload
    jest.spyOn(cacheService, 'set').mockImplementation(() => ({
      start: 1,
      calls: 0,
    }));

    jest
      .spyOn(isLimitExceededModule, 'isLimitExceeded')
      .mockReturnValueOnce(false);

    jest.spyOn(httpService, 'get').mockReturnValueOnce(of(undefined) as any);

    await asyncToThrow(
      geoLocationService.getGeo('ip'),
      GeoServiceNotAvailableException
    );
  });
  it('should throw on service error', async () => {
    const spy = jest.spyOn(cacheService, 'get');
    spy.mockResolvedValueOnce(undefined);

    jest
      .spyOn(httpService, 'get')
      .mockReturnValueOnce(of(new Error('test error')) as any);

    await asyncToThrow(
      geoLocationService.getGeo('ip'),
      GeoServiceErrorException
    );
  });
  it('should set value to cache and return value', async () => {
    // userGeoCached
    jest.spyOn(cacheService, 'get').mockResolvedValue(undefined);
    // cacheMetadata
    jest.spyOn(geoLocationService, 'getCacheMetadata').mockResolvedValueOnce({
      start: 1,
      calls: 0,
    });
    // isLimitExceeded
    jest
      .spyOn(isLimitExceededModule, 'isLimitExceeded')
      .mockReturnValueOnce(false);
    // http response
    jest.spyOn(httpService, 'get').mockReturnValueOnce(
      of({
        data: {
          geoplugin_latitude: '1',
          geoplugin_longitude: '2',
        },
      }) as any
    );
    // set geo to cache
    const spySet = jest.spyOn(cacheService, 'set');
    // execute
    const result = await geoLocationService.getGeo('ip');
    // assert
    expect(spySet).toBeCalledWith(
      'ip',
      { latitude: 1, longitude: 2 },
      { ttl: 14440 }
    );
    expect(spySet).toBeCalledTimes(2);
    expect(result).toStrictEqual({
      latitude: 1,
      longitude: 2,
    });
  });
});
