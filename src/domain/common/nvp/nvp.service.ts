import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { NVP } from '@domain/common/nvp';
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { nvps } from './nvp.schema';

@Injectable()
export class NVPService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb
  ) {}

  async getNvpOrFail(NVPID: string): Promise<NVP> {
    const nvp = await this.db.query.nvps.findFirst({
      where: eq(nvps.id, NVPID),
    });
    if (!nvp)
      throw new EntityNotFoundException(
        `Not able to locate NVP with the specified ID: ${NVPID}`,
        LogContext.SPACES
      );
    return nvp as unknown as NVP;
  }

  async removeNVP(nvpID: string): Promise<NVP> {
    const nvp = await this.getNvpOrFail(nvpID);
    await this.db.delete(nvps).where(eq(nvps.id, nvpID));
    return nvp;
  }
}
