import { LogContext } from '@common/enums';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import {
  EntityNotFoundException,
  NotSupportedException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { Inject, Injectable } from '@nestjs/common';
import { UrlGeneratorCacheService } from '@services/infrastructure/url-generator/url.generator.service.cache';
import { eq } from 'drizzle-orm';
import { callouts } from '../callout/callout.schema';
import { calloutContributions } from './callout.contribution.schema';
import { ICalloutContribution } from './callout.contribution.interface';
import { CalloutContributionService } from './callout.contribution.service';

@Injectable()
export class CalloutContributionMoveService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    private calloutContributionService: CalloutContributionService,
    private urlGeneratorCacheService: UrlGeneratorCacheService
  ) {}

  public async moveContributionToCallout(
    contributionID: string,
    calloutID: string
  ): Promise<ICalloutContribution> {
    const contribution =
      await this.calloutContributionService.getCalloutContributionOrFail(
        contributionID
      );
    // Load contribution with full relations for the move
    const contributionFull = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.id, contributionID),
      with: {
        callout: {
          with: {
            calloutsSet: true,
          },
        },
        post: {
          with: {
            profile: true,
          },
        },
        link: true,
      },
    }) as any;
    // Also load whiteboard and memo profiles separately if present
    if (contribution.whiteboard) {
      (contributionFull as any).whiteboard = contribution.whiteboard;
    }
    if (contribution.memo) {
      (contributionFull as any).memo = contribution.memo;
    }
    const sourceCallout = contributionFull?.callout;
    const targetCallout = await this.db.query.callouts.findFirst({
      where: eq(callouts.id, calloutID),
      with: {
        calloutsSet: true,
      },
    }) as any;

    if (!targetCallout) {
      throw new EntityNotFoundException(
        `Target Callout ${calloutID} not found.`,
        LogContext.COLLABORATION
      );
    }

    if (
      contribution.post &&
      !targetCallout.settings.contribution.allowedTypes.includes(
        CalloutContributionType.POST
      )
    ) {
      throw new NotSupportedException(
        'The destination callout does not allow contributions of type POST.',
        LogContext.COLLABORATION
      );
    }
    if (
      contribution.whiteboard &&
      !targetCallout.settings.contribution.allowedTypes.includes(
        CalloutContributionType.WHITEBOARD
      )
    ) {
      throw new NotSupportedException(
        'The destination callout does not allow contributions of type WHITEBOARD.',
        LogContext.COLLABORATION
      );
    }
    if (
      contribution.link &&
      !targetCallout.settings.contribution.allowedTypes.includes(
        CalloutContributionType.LINK
      )
    ) {
      throw new NotSupportedException(
        'The destination callout does not allow contributions of type LINK.',
        LogContext.COLLABORATION
      );
    }
    if (
      contribution.memo &&
      !targetCallout.settings.contribution.allowedTypes.includes(
        CalloutContributionType.MEMO
      )
    ) {
      throw new NotSupportedException(
        'The destination callout does not allow contributions of type MEMO.',
        LogContext.COLLABORATION
      );
    }

    if (targetCallout.calloutsSet?.id !== sourceCallout?.calloutsSet?.id) {
      throw new NotSupportedException(
        'A Contribution can only be moved between Callouts in the same CalloutsSet.',
        LogContext.COLLABORATION
      );
    }

    if (contributionFull?.post?.profile?.id) {
      await this.urlGeneratorCacheService.revokeUrlCache(
        contributionFull.post.profile.id
      );
    }
    if (contributionFull?.whiteboard?.profile?.id) {
      await this.urlGeneratorCacheService.revokeUrlCache(
        contributionFull.whiteboard.profile.id
      );
    }
    if (contributionFull?.memo?.profile?.id) {
      await this.urlGeneratorCacheService.revokeUrlCache(
        contributionFull.memo.profile.id
      );
    }

    // Update the calloutId FK to move the contribution
    await this.db
      .update(calloutContributions)
      .set({ calloutId: calloutID })
      .where(eq(calloutContributions.id, contributionID));

    return await this.calloutContributionService.getCalloutContributionOrFail(
      contributionID
    );
  }
}
