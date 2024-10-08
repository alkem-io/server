import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './location.entity';
import { ILocation } from './location.interface';
import { CreateLocationInput, UpdateLocationInput } from './dto';
import { EntityNotInitializedException } from '@common/exceptions';
import { LogContext } from '@common/enums';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>
  ) {}

  public createLocation(locationData?: CreateLocationInput): ILocation {
    return Location.create({ ...locationData });
  }
  async removeLocation(location: ILocation): Promise<ILocation> {
    return await this.locationRepository.remove(location as Location);
  }

  updateLocationValues(
    location: ILocation | undefined,
    locationData: UpdateLocationInput
  ) {
    if (!location) {
      throw new EntityNotInitializedException(
        'Location entity not provided',
        LogContext.COMMUNITY
      );
    }
    if (locationData.city !== undefined) {
      location.city = locationData.city;
    }

    if (locationData.country !== undefined) {
      location.country = locationData.country;
    }

    if (locationData.addressLine1 !== undefined) {
      location.addressLine1 = locationData.addressLine1;
    }

    if (locationData.addressLine2 !== undefined) {
      location.addressLine2 = locationData.addressLine2;
    }

    if (locationData.postalCode !== undefined) {
      location.postalCode = locationData.postalCode;
    }

    if (locationData.stateOrProvince !== undefined) {
      location.stateOrProvince = locationData.stateOrProvince;
    }
  }

  async updateLocation(
    location: ILocation,
    locationData: UpdateLocationInput
  ): Promise<ILocation> {
    this.updateLocationValues(location, locationData);

    return await this.locationRepository.save(location);
  }
}
