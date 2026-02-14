import { LogContext } from '@common/enums';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { Inject, Injectable } from '@nestjs/common';
import { platforms } from '@platform/platform/platform.schema';
import { eq } from 'drizzle-orm';

// Internal storage type - Record for JSON storage
type WellKnownVCMappingsRecord = Record<
  VirtualContributorWellKnown,
  string | undefined
>;

@Injectable()
export class PlatformWellKnownVirtualContributorsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
  ) {}

  async getMappings(): Promise<WellKnownVCMappingsRecord> {
    const platform = await this.db.query.platforms.findFirst({
      where: undefined,
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
    const platform = await this.db.query.platforms.findFirst({
      where: undefined,
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

    await this.db
      .update(platforms)
      .set({ wellKnownVirtualContributors: mappings as any })
      .where(eq(platforms.id, platform.id));

    return mappings;
  }

  async getVirtualContributorID(
    wellKnown: VirtualContributorWellKnown
  ): Promise<string | undefined> {
    const mappings = await this.getMappings();
    return mappings[wellKnown];
  }
}
