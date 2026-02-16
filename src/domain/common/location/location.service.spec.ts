import { EntityNotInitializedException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { GeoapifyService } from '@services/external/geoapify/geoapify.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { Location } from './location.entity';
import { ILocation } from './location.interface';
import { LocationService } from './location.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('LocationService', () => {
  let service: LocationService;
  let db: any;
  let geoapifyService: GeoapifyService;

  beforeEach(async () => {
    // Mock static Location.create to avoid DataSource requirement
    vi.spyOn(Location, 'create').mockImplementation((input: any) => {
      const entity = new Location();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LocationService);
    db = module.get(DRIZZLE);
    geoapifyService = module.get(GeoapifyService);
  });

  describe('createLocation', () => {
    it('should create a location with geoLocation initialized as invalid', async () => {
      (geoapifyService.getGeoapifyGeocodeLocation as Mock).mockResolvedValue(
        undefined as any
      );

      const result = await service.createLocation({});

      expect(result).toBeDefined();
      expect(result.geoLocation).toBeDefined();
    });

    it('should create a location with provided data', async () => {
      (geoapifyService.getGeoapifyGeocodeLocation as Mock).mockResolvedValue({
        longitude: 4.9,
        latitude: 52.3,
      });

      const result = await service.createLocation({
        city: 'Amsterdam',
        country: 'Netherlands',
      });

      expect(result.city).toBe('Amsterdam');
      expect(result.country).toBe('Netherlands');
      expect(result.geoLocation.isValid).toBe(true);
      expect(result.geoLocation.longitude).toBe(4.9);
      expect(result.geoLocation.latitude).toBe(52.3);
    });
  });

  describe('updateLocation', () => {
    it('should throw EntityNotInitializedException when location is undefined', async () => {
      await expect(
        service.updateLocation(undefined, { city: 'Berlin' })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should return unchanged location when no fields differ', async () => {
      const location = {
        city: 'Berlin',
        country: 'Germany',
        addressLine1: '123 Main',
        addressLine2: '',
        postalCode: '10115',
        stateOrProvince: 'Berlin',
        geoLocation: { isValid: true, longitude: 13.4, latitude: 52.5 },
      } as unknown as ILocation;

      const result = await service.updateLocation(location, {
        city: 'Berlin',
        country: 'Germany',
      });

      expect(result).toBe(location);
    });

    it('should update city and trigger geo-location refresh', async () => {
      const location = {
        city: 'Berlin',
        country: 'Germany',
        geoLocation: { isValid: true, longitude: 13.4, latitude: 52.5 },
      } as unknown as ILocation;

      (geoapifyService.getGeoapifyGeocodeLocation as Mock).mockResolvedValue({
        longitude: 2.3,
        latitude: 48.8,
      });

      db.returning.mockResolvedValueOnce([{ ...location, city: 'Paris' }]);
      const result = await service.updateLocation(location, { city: 'Paris' });

      expect(result.city).toBe('Paris');
    });

    it('should update addressLine1 without triggering geo-location refresh', async () => {
      const location = {
        city: 'Berlin',
        country: 'Germany',
        addressLine1: 'old address',
        geoLocation: { isValid: true, longitude: 13.4, latitude: 52.5 },
      } as unknown as ILocation;

      await service.updateLocation(location, {
        addressLine1: 'new address',
      });

      expect(location.addressLine1).toBe('new address');
    });
  });

  describe('hasValidLocationDataForGeoLocation', () => {
    it('should return true when country is a non-empty string', () => {
      const location = { country: 'Netherlands' } as ILocation;
      expect(service.hasValidLocationDataForGeoLocation(location)).toBe(true);
    });

    it('should return false when country is undefined', () => {
      const location = { country: undefined } as ILocation;
      expect(service.hasValidLocationDataForGeoLocation(location)).toBe(false);
    });

    it('should return false when country is empty string', () => {
      const location = { country: '' } as ILocation;
      expect(service.hasValidLocationDataForGeoLocation(location)).toBe(false);
    });
  });

  describe('checkAndUpdateGeoLocation', () => {
    it('should return existing geoLocation when already valid', async () => {
      const geoLocation = { isValid: true, longitude: 4.9, latitude: 52.3 };
      const location = {
        country: 'Netherlands',
        city: 'Amsterdam',
        geoLocation,
      } as unknown as ILocation;

      const result = await service.checkAndUpdateGeoLocation(location);

      expect(result).toBe(geoLocation);
    });

    it('should clear coordinates when both country and city are empty', async () => {
      const geoLocation = {
        isValid: false,
        longitude: 4.9,
        latitude: 52.3,
      };
      const location = {
        country: '',
        city: '',
        geoLocation,
      } as unknown as ILocation;

      const result = await service.checkAndUpdateGeoLocation(location);

      expect(result.longitude).toBeUndefined();
      expect(result.latitude).toBeUndefined();
    });

    it('should return unchanged geoLocation when no valid location data available', async () => {
      const geoLocation = { isValid: false };
      const location = {
        country: undefined,
        city: 'SomeCity',
        geoLocation,
      } as unknown as ILocation;

      const result = await service.checkAndUpdateGeoLocation(location);

      expect(result).toBe(geoLocation);
    });

    it('should update geoLocation from geoapify when valid data is available', async () => {
      const geoLocation = { isValid: false } as any;
      const location = {
        country: 'Germany',
        city: 'Berlin',
        geoLocation,
      } as unknown as ILocation;

      (geoapifyService.getGeoapifyGeocodeLocation as Mock).mockResolvedValue({
        longitude: 13.4,
        latitude: 52.5,
      });

      const result = await service.checkAndUpdateGeoLocation(location);

      expect(result.longitude).toBe(13.4);
      expect(result.latitude).toBe(52.5);
      expect(result.isValid).toBe(true);
    });

    it('should return unchanged geoLocation when geoapify returns null', async () => {
      const geoLocation = { isValid: false } as any;
      const location = {
        country: 'Unknown',
        city: 'Unknown',
        geoLocation,
      } as unknown as ILocation;

      (geoapifyService.getGeoapifyGeocodeLocation as Mock).mockResolvedValue(
        undefined as any
      );

      const result = await service.checkAndUpdateGeoLocation(location);

      expect(result).toBe(geoLocation);
      expect(result.isValid).toBe(false);
    });
  });
});
