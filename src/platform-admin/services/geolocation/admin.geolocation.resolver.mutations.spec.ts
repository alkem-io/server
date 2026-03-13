import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { LocationService } from '@domain/common/location';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { GeoapifyService } from '@services/external/geoapify';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AdminGeoLocationMutations } from './admin.geolocation.resolver.mutations';

describe('AdminGeoLocationMutations', () => {
  let resolver: AdminGeoLocationMutations;
  let authorizationService: Record<string, Mock>;
  let platformAuthorizationPolicyService: Record<string, Mock>;
  let locationService: Record<string, Mock>;
  let geoapifyService: Record<string, Mock>;
  let entityManager: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as any as ActorContext;

  beforeEach(async () => {
    const mockEntityManager = {
      find: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGeoLocationMutations,
        MockWinstonProvider,
        {
          provide: getEntityManagerToken('default'),
          useValue: mockEntityManager,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminGeoLocationMutations);
    authorizationService = module.get(AuthorizationService) as any;
    platformAuthorizationPolicyService = module.get(
      PlatformAuthorizationPolicyService
    ) as any;
    locationService = module.get(LocationService) as any;
    geoapifyService = module.get(GeoapifyService) as any;
    entityManager = mockEntityManager as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('adminUpdateGeoLocationData', () => {
    it('should return false when geoapify is not enabled', async () => {
      const platformPolicy = { id: 'platform-auth' };
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
      geoapifyService.isEnabled.mockReturnValue(false);

      const result = await resolver.adminUpdateGeoLocationData(actorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
      expect(result).toBe(false);
    });

    it('should update geolocation for locations with valid country and no valid geolocation', async () => {
      const platformPolicy = { id: 'platform-auth' };
      const locations = [
        {
          id: 'loc-1',
          country: 'Netherlands',
          city: 'Amsterdam',
          geoLocation: null,
        },
        {
          id: 'loc-2',
          country: 'Germany',
          city: 'Berlin',
          geoLocation: { isValid: false },
        },
        {
          id: 'loc-3',
          country: 'France',
          city: 'Paris',
          geoLocation: { isValid: true },
        },
      ];
      const updatedGeoLocation = { isValid: true, lat: 52.37, lon: 4.89 };

      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
      geoapifyService.isEnabled.mockReturnValue(true);
      entityManager.find.mockResolvedValue(locations);
      locationService.hasValidLocationDataForGeoLocation.mockReturnValue(true);
      locationService.checkAndUpdateGeoLocation.mockResolvedValue(
        updatedGeoLocation
      );

      const result = await resolver.adminUpdateGeoLocationData(actorContext);

      expect(result).toBe(true);
      // loc-1 and loc-2 should be processed (no valid geolocation), loc-3 skipped (valid)
      expect(locationService.checkAndUpdateGeoLocation).toHaveBeenCalledTimes(
        2
      );
      expect(locationService.save).toHaveBeenCalledTimes(2);
    });

    it('should filter out locations with empty country strings', async () => {
      const platformPolicy = { id: 'platform-auth' };
      const locations = [
        { id: 'loc-1', country: '   ', city: 'Amsterdam', geoLocation: null },
        {
          id: 'loc-2',
          country: 'Germany',
          city: 'Berlin',
          geoLocation: null,
        },
      ];

      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
      geoapifyService.isEnabled.mockReturnValue(true);
      entityManager.find.mockResolvedValue(locations);
      locationService.hasValidLocationDataForGeoLocation.mockReturnValue(true);
      locationService.checkAndUpdateGeoLocation.mockResolvedValue({
        isValid: true,
      });

      await resolver.adminUpdateGeoLocationData(actorContext);

      // Only loc-2 should be processed
      expect(locationService.checkAndUpdateGeoLocation).toHaveBeenCalledTimes(
        1
      );
    });

    it('should throw GeoLocationException when update fails', async () => {
      const platformPolicy = { id: 'platform-auth' };
      const locations = [
        {
          id: 'loc-1',
          country: 'Netherlands',
          city: 'Amsterdam',
          geoLocation: null,
        },
      ];

      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
      geoapifyService.isEnabled.mockReturnValue(true);
      entityManager.find.mockResolvedValue(locations);
      locationService.hasValidLocationDataForGeoLocation.mockReturnValue(true);
      locationService.checkAndUpdateGeoLocation.mockRejectedValue(
        new Error('API failure')
      );

      await expect(
        resolver.adminUpdateGeoLocationData(actorContext)
      ).rejects.toThrow('API failure');
    });
  });
});
