import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, EntityNotFoundError, FindOneOptions } from 'typeorm';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Callout, ICallout } from '@domain/collaboration/callout';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';

@Injectable()
export class ContributionResolverService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getCalloutForPostContribution(
    postID: string,
    options?: FindOneOptions<Callout>
  ): Promise<ICallout> {
    const result = await this.entityManager.findOne(Callout, {
      where: {
        contributions: {
          post: {
            id: postID,
          },
        },
      },
      ...options,
    });
    if (!result) {
      throw new EntityNotFoundError(
        `Unable to identify Callout with postID profiled: ${postID}`,
        LogContext.COLLABORATION
      );
    }
    return result;
  }

  public async getContributionForPost(
    postID: string,
    options?: FindOneOptions<CalloutContribution>
  ): Promise<ICalloutContribution> {
    const result = await this.entityManager.findOne(CalloutContribution, {
      where: {
        post: {
          id: postID,
        },
      },
      ...options,
    });
    if (!result) {
      throw new EntityNotFoundError(
        `Unable to identify Callout with postID profiled: ${postID}`,
        LogContext.COLLABORATION
      );
    }
    return result;
  }
}
