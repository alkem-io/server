import { LogContext } from '@common/enums';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { EntityNotFoundException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { Repository } from 'typeorm';

// Internal convenience type - flat record for key-based lookups
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

    const record: Partial<WellKnownVCMappingsRecord> = {};
    for (const mapping of platform.wellKnownVirtualContributors?.mappings ??
      []) {
      record[mapping.wellKnown as VirtualContributorWellKnown] =
        mapping.virtualContributorID;
    }
    return record as WellKnownVCMappingsRecord;
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

    const existingMappings = [
      ...(platform.wellKnownVirtualContributors?.mappings ?? []),
    ];
    const index = existingMappings.findIndex(m => m.wellKnown === wellKnown);
    if (index >= 0) {
      existingMappings[index] = { wellKnown, virtualContributorID };
    } else {
      existingMappings.push({ wellKnown, virtualContributorID });
    }

    platform.wellKnownVirtualContributors = { mappings: existingMappings };

    await this.platformRepository.save(platform);

    const record: Partial<WellKnownVCMappingsRecord> = {};
    for (const mapping of existingMappings) {
      record[mapping.wellKnown as VirtualContributorWellKnown] =
        mapping.virtualContributorID;
    }
    return record as WellKnownVCMappingsRecord;
  }

  async getVirtualContributorID(
    wellKnown: VirtualContributorWellKnown
  ): Promise<string | undefined> {
    const mappings = await this.getMappings();
    return mappings[wellKnown];
  }
}
