import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { IReference } from '@domain/common/reference';
import { ITagset } from '@domain/common/tagset';
import { Profile } from '@domain/community/profile';
import { IVisual } from '@domain/common/visual';
import { ILocation } from '@domain/common/location';

@Injectable()
export class ProfileDataloaderService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}
  public async findReferencesByBatch(
    profileIds: string[]
  ): Promise<(IReference[] | Error)[]> {
    const profiles = await this.profileRepository.findByIds(profileIds, {
      relations: ['references'],
      select: ['id'],
    });

    const results = profiles.filter(profile => profileIds.includes(profile.id));
    const mappedResults = profileIds.map(
      id =>
        results.find(result => result.id === id)?.references ||
        new Error(`Could not load profile ${id}`)
    );
    return mappedResults;
  }

  public async findAvatarsByBatch(
    avatarIds: string[]
  ): Promise<(IVisual | Error)[]> {
    const profiles = await this.profileRepository.findByIds(avatarIds, {
      relations: ['avatar'],
      select: ['id'],
    });

    const results = profiles.filter(avatar => avatarIds.includes(avatar.id));
    const mappedResults = avatarIds.map(
      id =>
        results.find(result => result.id === id)?.avatar ||
        new Error(`Could not load profile ${id}`)
    );
    return mappedResults;
  }

  public async findLocationsByBatch(
    locationIds: string[]
  ): Promise<(ILocation | Error)[]> {
    const profiles = await this.profileRepository.findByIds(locationIds, {
      relations: ['location'],
      select: ['id'],
    });

    const results = profiles.filter(location =>
      locationIds.includes(location.id)
    );
    const mappedResults = locationIds.map(
      id =>
        results.find(result => result.id === id)?.location ||
        new Error(`Could not load profile ${id}`)
    );
    return mappedResults;
  }

  public async findTagsetsByBatch(
    tagsetIds: string[]
  ): Promise<(ITagset[] | Error)[]> {
    const profiles = await this.profileRepository.findByIds(tagsetIds, {
      relations: ['tagsets'],
      select: ['id'],
    });

    const results = profiles.filter(profile => tagsetIds.includes(profile.id));
    const mappedResults = tagsetIds.map(
      id =>
        results.find(result => result.id === id)?.tagsets ||
        new Error(`Could not load profile ${id}`)
    );
    return mappedResults;
  }
}
