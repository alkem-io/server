import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILocation } from '@domain/common/location/location.interface';
import { GeoapifyService } from '@services/external/geoapify';
import { IGeoLocation } from './geolocation.interface';
import { LocationService } from './location.service';

@Resolver(() => ILocation)
export class LocationResolverFields {
  constructor(
    private geoapifyService: GeoapifyService,
    private locationService: LocationService
  ) {}

  @ResolveField('geoLocation', () => IGeoLocation, {
    nullable: false,
    description:
      'The GeoLocation for this Location, derived from (City, Country) if those are set.',
  })
  async geoLocation(@Parent() location: ILocation): Promise<IGeoLocation> {
    if (
      !location.geoLocation.isValid &&
      this.locationService.hasValidLocationDataForGeoLocation(location)
    ) {
      const geoLocationFromData =
        await this.geoapifyService.getGeoapifyGeocodeLocation(
          location.city,
          location.country
        );
      if (geoLocationFromData) {
        // In the ideal case the data should not be updated on query; to be discussed.
        location.geoLocation.longitude = geoLocationFromData.longitude;
        location.geoLocation.latitude = geoLocationFromData.latitude;
        location.geoLocation.isValid = true;
        await this.locationService.save(location);
      }
    }
    return location.geoLocation;
  }
}
