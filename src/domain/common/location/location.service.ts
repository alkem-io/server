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

  async createLocation(locationData?: CreateLocationInput): Promise<ILocation> {
    const location = new Location(locationData?.city, locationData?.country);
    return await this.locationRepository.save(location);
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
    if (locationData.city || locationData.city === '') {
      location.city = locationData.city;
    }

    if (locationData.country || locationData.country === '') {
      location.country = locationData.country;
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
