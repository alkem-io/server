import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Inject } from '@nestjs/common/decorators';
import { ICalloutContribution } from './callout.contribution.interface';
import { Profiling } from '@common/decorators';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { CalloutContributionService } from './callout.contribution.service';
import { IPost } from '../post/post.interface';
import { IUser } from '@domain/community/user/user.interface';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { ILink } from '../link/link.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

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
  @Profiling.api
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
  @Profiling.api
  async link(
    @Parent() calloutContribution: ICalloutContribution
  ): Promise<ILink | null> {
    return await this.calloutContributionService.getLink(calloutContribution);
  }

  @ResolveField('post', () => IPost, {
    nullable: true,
    description: 'The Post that was contributed.',
  })
  @Profiling.api
  async post(
    @Parent() calloutContribution: ICalloutContribution
  ): Promise<IPost | null> {
    return await this.calloutContributionService.getPost(calloutContribution, {
      post: { comments: true },
    });
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
