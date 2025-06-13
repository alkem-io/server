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

  async save(location: ILocation): Promise<ILocation> {
    return await this.locationRepository.save(location);
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
    }
    return locationChanged;
  }

  async updateLocation(
    location: ILocation,
    locationData: UpdateLocationInput
  ): Promise<ILocation> {
    this.updateLocationValues(location, locationData);

    return await this.locationRepository.save(location);
  }

  public hasValidLocationDataForGeoLocation(location: ILocation): boolean {
    const hasValidCity = this.hasValidLocationField(location.city);
    const hasValidCountry = this.hasValidLocationField(location.country);
    return hasValidCity || hasValidCountry;
  }

  private hasValidLocationField(value: string | undefined): boolean {
    if (value === undefined || value === null) {
      return false;
    }
    return value.length > 0;
  }
}
