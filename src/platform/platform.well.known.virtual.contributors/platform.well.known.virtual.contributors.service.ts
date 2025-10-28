import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';

// Internal storage type - Record for JSON storage
type WellKnownVCMappingsRecord = Record<
  VirtualContributorWellKnown,
  string | undefined
>;

@Injectable()
export class PlatformWellKnownVirtualContributorsService {
  constructor(
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>
  ) {}

  async getMappings(): Promise<WellKnownVCMappingsRecord> {
    const platform = await this.platformRepository.findOne({
      where: {},
    });

    if (!platform) {
      throw new EntityNotFoundException(
        'Platform not found',
        LogContext.PLATFORM
      );
    }

    return (platform.wellKnownVirtualContributors as any) || {};
  }

  async setMapping(
    wellKnown: VirtualContributorWellKnown,
    virtualContributorID: string
  ): Promise<WellKnownVCMappingsRecord> {
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
    const mappings = ((platform.wellKnownVirtualContributors as any) ||
      {}) as WellKnownVCMappingsRecord;

    // Set the mapping
    mappings[wellKnown] = virtualContributorID;

    platform.wellKnownVirtualContributors = mappings as any;

    await this.platformRepository.save(platform);

    return mappings;
  }

  async getVirtualContributorID(
    wellKnown: VirtualContributorWellKnown
  ): Promise<string | undefined> {
    const mappings = await this.getMappings();
    return mappings[wellKnown];
  }
}
