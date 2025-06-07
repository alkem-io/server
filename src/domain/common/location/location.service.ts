import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './location.entity';
import { ILocation } from './location.interface';
import { CreateLocationInput, UpdateLocationInput } from './dto';
import { EntityNotInitializedException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { GeoapifyService } from '@services/external/geoapify/geoapify.service';

@Injectable()
export class LocationService {
  constructor(
    private readonly geoapifyService: GeoapifyService,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>
  ) {}

  public createLocation(locationData?: CreateLocationInput): ILocation {
    const location = Location.create({ ...locationData });
    // TODO: how to make the geolocation be retrieved later automatically?
    return location;
  }
  async removeLocation(location: ILocation): Promise<ILocation> {
    return await this.locationRepository.remove(location as Location);
  }

  /** Returns whether the location has been changed */
  updateLocationValues(
    location: ILocation | undefined,
    locationData: UpdateLocationInput
  ): boolean {
    if (!location) {
      throw new EntityNotInitializedException(
        'Location entity not provided',
        LogContext.COMMUNITY
      );
    }
    let locationChanged = false;
    if (
      locationData.city !== undefined &&
      locationData.city !== location.city
    ) {
      locationChanged = true;
      location.city = locationData.city;
    }

    if (
      locationData.country !== undefined &&
      locationData.country !== location.country
    ) {
      locationChanged = true;
      location.country = locationData.country;
    }

    if (
      locationData.addressLine1 !== undefined &&
      locationData.addressLine1 !== location.addressLine1
    ) {
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
    return locationChanged;
  }

  async updateLocation(
    location: ILocation,
    locationData: UpdateLocationInput
  ): Promise<ILocation> {
    const locationChanged = this.updateLocationValues(location, locationData);
    if (locationChanged) {
      const geocodeLocation =
        await this.geoapifyService.getGeoapifyGeocodeLocation(
          location.country,
          location.city
        );
      location.longitude = geocodeLocation?.longitude;
      location.latitude = geocodeLocation?.latitude;
    }

    return await this.locationRepository.save(location);
  }
}
