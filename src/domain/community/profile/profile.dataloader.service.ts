import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { In, Repository } from 'typeorm';
import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Profile } from '@domain/community/profile/profile.entity';
import { IVisual } from '@domain/common/visual/visual.interface';
import { ILocation } from '@domain/common/location/location.interface';
import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';

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
    const profiles = await this.profileRepository.find({
      where: { id: In(profileIds) },
      relations: ['references'],
      select: ['id'],
    });

    const results = profiles.filter(profile => profileIds.includes(profile.id));
    return profileIds.map(
      id =>
        results.find(result => result.id === id)?.references ||
        new EntityNotFoundException(
          `Could not load profile ${id}`,
          LogContext.COMMUNITY
        )
    );
  }

  public async findAvatarsByBatch(
    profileIds: string[]
  ): Promise<(IVisual | Error)[]> {
    const profiles = await this.profileRepository.find({
      where: { id: In(profileIds) },
      relations: ['avatar'],
      select: ['id'],
    });

    const results = profiles.filter(avatar => profileIds.includes(avatar.id));
    return profileIds.map(
      id =>
        results.find(result => result.id === id)?.avatar ||
        new EntityNotFoundException(
          `Could not load profile ${id}`,
          LogContext.COMMUNITY
        )
    );
  }

  public async findLocationsByBatch(
    profileIds: string[]
  ): Promise<(ILocation | Error)[]> {
    const profiles = await this.profileRepository.find({
      where: { id: In(profileIds) },
      relations: ['location'],
      select: ['id'],
    });

    const results = profiles.filter(location =>
      profileIds.includes(location.id)
    );
    return profileIds.map(
      id =>
        results.find(result => result.id === id)?.location ||
        new EntityNotFoundException(
          `Could not load profile ${id}`,
          LogContext.COMMUNITY
        )
    );
  }

  public async findTagsetsByBatch(
    profileIds: string[]
  ): Promise<(ITagset[] | Error)[]> {
    const profiles = await this.profileRepository.find({
      where: { id: In(profileIds) },
      relations: ['tagsets'],
      select: ['id'],
    });

    const results = profiles.filter(profile => profileIds.includes(profile.id));
    return profileIds.map(
      id =>
        results.find(result => result.id === id)?.tagsets ||
        new EntityNotFoundException(
          `Could not load profile ${id}`,
          LogContext.COMMUNITY
        )
    );
  }
}
