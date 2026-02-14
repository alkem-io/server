import { LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { Inject, Injectable } from '@nestjs/common';
import { GeoapifyService } from '@services/external/geoapify/geoapify.service';
import { CreateLocationInput, UpdateLocationInput } from './dto';
import { IGeoLocation } from './geolocation.interface';
import { Location } from './location.entity';
import { ILocation } from './location.interface';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { locations } from './location.schema';

@Injectable()
export class LocationService {
  constructor(
    private readonly geoapifyService: GeoapifyService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb
  ) {}

  public async createLocation(
    locationData?: CreateLocationInput
  ): Promise<ILocation> {
    const location = Location.create({ ...locationData });
    location.geoLocation = {
      isValid: false,
    };
    location.geoLocation = await this.checkAndUpdateGeoLocation(location);
    return location;
  }
  async removeLocation(location: ILocation): Promise<ILocation> {
    await this.db.delete(locations).where(eq(locations.id, location.id));
    return location;
  }

  async save(location: ILocation): Promise<ILocation> {
    if (location.id) {
      const [updated] = await this.db
        .update(locations)
        .set({
          city: location.city,
          country: location.country,
          addressLine1: location.addressLine1,
          addressLine2: location.addressLine2,
          stateOrProvince: location.stateOrProvince,
          postalCode: location.postalCode,
          geoLocation: location.geoLocation,
        })
        .where(eq(locations.id, location.id))
        .returning();
      return updated as unknown as ILocation;
    } else {
      const [inserted] = await this.db
        .insert(locations)
        .values({
          id: location.id,
          city: location.city,
          country: location.country,
          addressLine1: location.addressLine1,
          addressLine2: location.addressLine2,
          stateOrProvince: location.stateOrProvince,
          postalCode: location.postalCode,
          geoLocation: location.geoLocation,
        })
        .returning();
      return inserted as unknown as ILocation;
    }
  }

  /** Update the location, including the GeoLocation if needed. */
  public async updateLocation(
    location: ILocation | undefined,
    locationData: UpdateLocationInput
  ): Promise<ILocation> {
    if (!location) {
      throw new EntityNotInitializedException(
        'Location entity not provided',
        LogContext.COMMUNITY
      );
    }
    let locationChanged = false;
    let geoLocationChanged = false;
    if (
      locationData.city !== undefined &&
      locationData.city !== location.city
    ) {
      locationChanged = true;
      geoLocationChanged = true;
      location.city = locationData.city;
    }

    if (
      locationData.country !== undefined &&
      locationData.country !== location.country
    ) {
      locationChanged = true;
      geoLocationChanged = true;
      location.country = locationData.country;
    }

    if (
      locationData.addressLine1 !== undefined &&
      locationData.addressLine1 !== location.addressLine1
    ) {
      locationChanged = true;
      location.addressLine1 = locationData.addressLine1;
    }

    if (
      locationData.addressLine2 !== undefined &&
      locationData.addressLine2 !== location.addressLine2
    ) {
      locationChanged = true;
      location.addressLine2 = locationData.addressLine2;
    }

    if (
      locationData.postalCode !== undefined &&
      locationData.postalCode !== location.postalCode
    ) {
      locationChanged = true;
      location.postalCode = locationData.postalCode;
    }

    if (
      locationData.stateOrProvince !== undefined &&
      locationData.stateOrProvince !== location.stateOrProvince
    ) {
      locationChanged = true;
      location.stateOrProvince = locationData.stateOrProvince;
    }

    if (geoLocationChanged) {
      location.geoLocation.isValid = false;
      location.geoLocation = await this.checkAndUpdateGeoLocation(location);
    }
    if (!locationChanged) {
      return location;
    }

    return await this.save(location);
  }

  public async checkAndUpdateGeoLocation(
    location: ILocation
  ): Promise<IGeoLocation> {
    if (location.geoLocation.isValid) {
      return location.geoLocation;
    }

    if (location.country === '' && location.city === '') {
      // If both country and city are empty, we cannot update the geoLocation.
      // In the ideal case the data should not be updated on query; to be discussed.
      location.geoLocation.longitude = undefined;
      location.geoLocation.latitude = undefined;
      return location.geoLocation;
    }

    if (!this.hasValidLocationDataForGeoLocation(location)) {
      // If no valid location data is available, we cannot update the geoLocation.
      return location.geoLocation;
    }

    const geoLocationFromData =
      await this.geoapifyService.getGeoapifyGeocodeLocation(
        location.country!,
        location.city
      );
    if (!geoLocationFromData) {
      // If no valid geoLocation data is available, we cannot update the geoLocation.
      return location.geoLocation;
    }

    // In the ideal case the data should not be updated on query; to be discussed.
    location.geoLocation.longitude = geoLocationFromData.longitude;
    location.geoLocation.latitude = geoLocationFromData.latitude;
    location.geoLocation.isValid = true;

    return location.geoLocation;
  }

  public hasValidLocationDataForGeoLocation(location: ILocation): boolean {
    return this.hasValidLocationField(location.country);
  }

  private hasValidLocationField(value: string | undefined): boolean {
    if (value === undefined || value === null) {
      return false;
    }
    return value.length > 0;
  }
}
