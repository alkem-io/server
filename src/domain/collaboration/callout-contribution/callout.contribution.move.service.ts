import { LogContext } from '@common/enums';
import { CalloutType } from '@common/enums/callout.type';
import {
  EntityNotFoundException,
  NotSupportedException,
} from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Callout } from '../callout';
import { ContributionResolverService } from '@services/infrastructure/entity-resolver/contribution.resolver.service';
import { CalloutContribution } from './callout.contribution.entity';
import { CalloutContributionService } from './callout.contribution.service';
import { ICalloutContribution } from './callout.contribution.interface';

@Injectable()
export class CalloutContributionMoveService {
  constructor(
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>,
    @InjectRepository(CalloutContribution)
    private calloutContributionRepository: Repository<CalloutContribution>,
    private contributionResolverService: ContributionResolverService,
    private calloutContributionService: CalloutContributionService
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
              collaboration: true,
            },
          },
        }
      )) as CalloutContribution;
    const sourceCallout = contribution.callout;
    const targetCallout = await this.calloutRepository.findOne({
      where: { id: calloutID },
      relations: { collaboration: true },
    });

    if (!targetCallout) {
      throw new EntityNotFoundException(
        `Target Callout ${calloutID} not found.`,
        LogContext.COLLABORATION
      );
    }

    if (
      contribution.post &&
      targetCallout.type !== CalloutType.POST_COLLECTION
    ) {
      throw new NotSupportedException(
        'A Post can be moved to a callout of type POST_COLLECTION only.',
        LogContext.COLLABORATION
      );
    }
    if (
      contribution.whiteboard &&
      targetCallout.type !== CalloutType.WHITEBOARD_COLLECTION
    ) {
      throw new NotSupportedException(
        'A Whiteboard can be moved to a callout of type WHITEBOARD_COLLECTION only.',
        LogContext.COLLABORATION
      );
    }
    if (
      contribution.link &&
      targetCallout.type !== CalloutType.LINK_COLLECTION
    ) {
      throw new NotSupportedException(
        'A Link can be moved to a callout of type LINK_COLLECTION only.',
        LogContext.COLLABORATION
      );
    }

    if (targetCallout.collaboration?.id !== sourceCallout?.collaboration?.id) {
      throw new NotSupportedException(
        'A Contribution can only be moved between Callouts in the same Collaboration.',
        LogContext.COLLABORATION
      );
    }

    contribution.callout = targetCallout;

    return await this.calloutContributionRepository.save(contribution);
  }
}
