import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { IMemo } from '@domain/common/memo/memo.interface';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { LoggerService } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ILink } from '../link/link.interface';
import { IPost } from '../post/post.interface';
import { ICalloutContribution } from './callout.contribution.interface';
import { CalloutContributionService } from './callout.contribution.service';

@Resolver(() => ICalloutContribution)
export class CalloutContributionResolverFields {
  constructor(
    private calloutContributionService: CalloutContributionService,
    private userLookupService: UserLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @ResolveField('whiteboard', () => IWhiteboard, {
    nullable: true,
    description: 'The Whiteboard that was contributed.',
  })
  async whiteboard(
    @Parent() calloutContribution: ICalloutContribution
  ): Promise<IWhiteboard | null> {
    return await this.calloutContributionService.getWhiteboard(
      calloutContribution
    );
  }

  @ResolveField('link', () => ILink, {
    nullable: true,
    description: 'The Link that was contributed.',
  })
  async link(
    @Parent() calloutContribution: ICalloutContribution
  ): Promise<ILink | null> {
    return await this.calloutContributionService.getLink(calloutContribution);
  }

  @ResolveField('post', () => IPost, {
    nullable: true,
    description: 'The Post that was contributed.',
  })
  async post(
    @Parent() calloutContribution: ICalloutContribution
  ): Promise<IPost | null> {
    return await this.calloutContributionService.getPost(calloutContribution);
  }

  @ResolveField('memo', () => IMemo, {
    nullable: true,
    description: 'The Memo that was contributed.',
  })
  async memo(
    @Parent() calloutContribution: ICalloutContribution
  ): Promise<IMemo | null> {
    return await this.calloutContributionService.getMemo(calloutContribution);
  }

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Document',
  })
  async createdBy(
    @Parent() contribution: ICalloutContribution
  ): Promise<IUser | null> {
    const createdBy = contribution.createdBy;
    if (!createdBy) {
      return null;
    }

    try {
      return await this.userLookupService.getUserByUUID(createdBy);
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          `createdBy '${createdBy}' unable to be resolved when resolving contribution '${contribution.id}'`,
          LogContext.COLLABORATION
        );
        return null;
      } else {
        throw e;
      }
    }
  }
}
