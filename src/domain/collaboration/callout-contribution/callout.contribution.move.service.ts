import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  NotSupportedException,
} from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Callout } from '../callout/callout.entity';
import { CalloutContribution } from './callout.contribution.entity';
import { CalloutContributionService } from './callout.contribution.service';
import { ICalloutContribution } from './callout.contribution.interface';
import { UrlGeneratorCacheService } from '@services/infrastructure/url-generator/url.generator.service.cache';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';

@Injectable()
export class CalloutContributionMoveService {
  constructor(
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>,
    @InjectRepository(CalloutContribution)
    private calloutContributionRepository: Repository<CalloutContribution>,
    private calloutContributionService: CalloutContributionService,
    private urlGeneratorCacheService: UrlGeneratorCacheService
  ) {}

  public async moveContributionToCallout(
    contributionID: string,
    calloutID: string
  ): Promise<ICalloutContribution> {
    const contribution =
      (await this.calloutContributionService.getCalloutContributionOrFail(
        contributionID,
        {
          relations: {
            callout: {
              calloutsSet: true,
            },
            post: {
              profile: true,
            },
            whiteboard: {
              profile: true,
            },
            memo: {
              profile: true,
            },
          },
        }
      )) as CalloutContribution;
    const sourceCallout = contribution.callout;
    const targetCallout = await this.calloutRepository.findOne({
      where: { id: calloutID },
      relations: {
        calloutsSet: true,
      },
    });

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

    contribution.callout = targetCallout;

    if (contribution?.post?.profile.id) {
      await this.urlGeneratorCacheService.revokeUrlCache(
        contribution?.post?.profile.id
      );
    }
    if (contribution?.whiteboard?.profile.id) {
      await this.urlGeneratorCacheService.revokeUrlCache(
        contribution?.whiteboard?.profile.id
      );
    }
    if (contribution?.memo?.profile.id) {
      await this.urlGeneratorCacheService.revokeUrlCache(
        contribution?.memo?.profile.id
      );
    }

    return await this.calloutContributionRepository.save(contribution);
  }
}
