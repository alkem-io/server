import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { callouts } from '@domain/collaboration/callout/callout.schema';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { calloutContributions } from '@domain/collaboration/callout-contribution/callout.contribution.schema';
import { posts } from '@domain/collaboration/post/post.schema';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class ContributionResolverService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getCalloutForPostContribution(
    postID: string
  ): Promise<ICallout> {
    // Find the callout through contribution -> post chain
    const contribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.postId, postID),
      with: {
        callout: true,
      },
    });
    if (!contribution || !contribution.callout) {
      throw new EntityNotFoundException(
        `Unable to identify Callout with postID profiled: ${postID}`,
        LogContext.COLLABORATION
      );
    }
    return contribution.callout as unknown as ICallout;
  }

  public async getContributionForPost(
    postID: string
  ): Promise<ICalloutContribution> {
    const result = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.postId, postID),
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Callout with postID profiled: ${postID}`,
        LogContext.COLLABORATION
      );
    }
    return result as unknown as ICalloutContribution;
  }
}
