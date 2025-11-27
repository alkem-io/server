import { Inject, LoggerService } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InstrumentResolver } from '@src/apm/decorators';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, IsNull, Not } from 'typeorm';
import { Location } from '@domain/common/location/location.entity';
import { LocationService } from '@domain/common/location';
import { GeoLocationException } from '@common/exceptions/geo.location.exception';
import { GeoapifyService } from '@services/external/geoapify';

@InstrumentResolver()
@Resolver()
export class AdminGeoLocationMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private locationService: LocationService,
    private geoapifyService: GeoapifyService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {}

  @Mutation(() => Boolean, {
    description: 'Updates the GeoLocation data where required on the platform.',
  })
  async adminUpdateGeoLocationData(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `Update GeoLocation data: ${agentInfo.userID}`
    );

    if (!this.geoapifyService.isEnabled()) {
      this.logger.warn?.(
        'GeoLocation is not enabled, skipping update.',
        LogContext.GEO
      );
      return false;
    }

    // Get all the location entities which have a country set and the string length is greater than zero
    const locations = await this.entityManager.find(Location, {
      where: {
        country: Not(IsNull()),
      },
    });
    // Filter out empty strings in code
    const filteredLocations = locations.filter(
      loc =>
        loc.country &&
        loc.country.trim().length > 0 &&
        (!loc.geoLocation || !loc.geoLocation.isValid)
    );
    this.logger.verbose?.(
      `Identified ${filteredLocations.length} locations to potentially GeoLocation data for.`,
      LogContext.GEO
    );
    for (const location of filteredLocations) {
      try {
        if (this.locationService.hasValidLocationDataForGeoLocation(location)) {
          this.logger.verbose?.(
            `Updating GeoLocation for location: ${location.id} -  ${location.country}, ${location.city}`,
            LogContext.GEO
          );
        }
        location.geoLocation =
          await this.locationService.checkAndUpdateGeoLocation(location);
        await this.locationService.save(location);
      } catch (error: any) {
        this.logger.error?.(
          `Failed to update all GeoLocations: ${error.message}`,
          LogContext.GEO
        );
        throw new GeoLocationException(
          `Failed to updateGeoLocationData: ${error.message}`,
          LogContext.GEO
        );
      }
    }
    return true;
  }
}
