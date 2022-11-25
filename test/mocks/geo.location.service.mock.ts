import { GeoLocationService } from '@services/external/geo-location';
import { MockValueProvider } from '../utils/mock.value.provider';

export const MockGeoLocationService: MockValueProvider<GeoLocationService> = {
  provide: GeoLocationService,
  useValue: {
    getGeo: jest.fn(),
  },
};
