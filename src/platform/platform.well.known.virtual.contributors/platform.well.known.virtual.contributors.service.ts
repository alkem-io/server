import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { IPlatformWellKnownVirtualContributors } from './platform.well.known.virtual.contributors.interface';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';

@Injectable()
export class PlatformWellKnownVirtualContributorsService {
  constructor(
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>
  ) {}

  async getMappings(): Promise<IPlatformWellKnownVirtualContributors> {
    const platform = await this.platformRepository.findOne({
      where: {},
    });

    if (!platform) {
      throw new EntityNotFoundException(
        'Platform not found',
        LogContext.PLATFORM
      );
    }

    return platform.wellKnownVirtualContributors || {};
  }

  async setMapping(
    wellKnown: VirtualContributorWellKnown,
    virtualContributorID: string
  ): Promise<IPlatformWellKnownVirtualContributors> {
    const platform = await this.platformRepository.findOne({
      where: {},
    });

    if (!platform) {
      throw new EntityNotFoundException(
        'Platform not found',
        LogContext.PLATFORM
      );
    }

    // Initialize if needed
    if (!platform.wellKnownVirtualContributors) {
      platform.wellKnownVirtualContributors = {};
    }

    // Set the mapping
    platform.wellKnownVirtualContributors[wellKnown] = virtualContributorID;

    await this.platformRepository.save(platform);

    return platform.wellKnownVirtualContributors;
  }

  async getVirtualContributorID(
    wellKnown: VirtualContributorWellKnown
  ): Promise<string | undefined> {
    const mappings = await this.getMappings();
    return mappings[wellKnown];
  }
}
