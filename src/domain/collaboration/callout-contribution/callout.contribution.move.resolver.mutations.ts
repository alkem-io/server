import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { Inject } from '@nestjs/common/decorators';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IPost } from '@domain/collaboration/post';
import { ILink } from '@domain/collaboration/link/link.interface';
import { EntityNotFoundException } from '@common/exceptions';
import { UUID } from '@domain/common/scalars';
import { CalloutContributionService } from './callout.contribution.service';
import { ICalloutContribution } from './callout.contribution.interface';
import { CalloutContributionMoveService } from './callout.contribution.move.service';
import { MoveCalloutContributionInput } from './dto/callout.contribution.dto.move';

@InstrumentResolver()
@Resolver()
export class CalloutContributionMoveResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private calloutContributionService: CalloutContributionService,
    private calloutContributionMoveService: CalloutContributionMoveService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: WinstonLogger
  ) {}

  @Mutation(() => ICalloutContribution, {
    description: 'Moves the specified Contribution to another Callout.',
  })
  async moveContributionToCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('moveContributionData')
    moveContributionData: MoveCalloutContributionInput
  ): Promise<ICalloutContribution> {
    const contribution =
      await this.calloutContributionService.getCalloutContributionOrFail(
        moveContributionData.contributionID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      contribution.authorization,
      AuthorizationPrivilege.MOVE_CONTRIBUTION,
      `move contribution: ${contribution.id}`
    );
    return this.calloutContributionMoveService.moveContributionToCallout(
      moveContributionData.contributionID,
      moveContributionData.calloutID
    );
  }

  @Mutation(() => ICalloutContribution, {
    description: 'Deletes a contribution.',
  })
  public async deleteContribution(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('contributionID') contributionID: string
  ): Promise<ICalloutContribution> {
    const contribution =
      await this.calloutContributionService.getCalloutContributionOrFail(
        contributionID
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      contribution.authorization,
      AuthorizationPrivilege.DELETE,
      `delete contribution: ${contribution.id}`
    );

    const { contribution: deletedContribution } =
      await this.calloutContributionService.delete(contribution.id);

    return deletedContribution;
  }

  @Mutation(() => IWhiteboard, {
    description: 'Deletes the specified Whiteboard.',
  })
  async deleteWhiteboardAsContribution(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IWhiteboard> {
    const contribution =
      await this.calloutContributionService.getContributionByChildIdOrFail(id);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      contribution.authorization,
      AuthorizationPrivilege.DELETE,
      `delete contribution: ${contribution.id}`
    );

    const { whiteboard } = await this.calloutContributionService.delete(
      contribution.id
    );

    if (!whiteboard) {
      throw new EntityNotFoundException(
        'Whiteboard not found after deleting the parent Contribution',
        LogContext.COLLABORATION,
        {
          contributionId: contribution.id,
          whiteboardId: id,
        }
      );
    }

    return whiteboard;
  }

  @Mutation(() => IPost, {
    description: 'Deletes the specified Post.',
  })
  async deletePostAsContribution(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IPost> {
    const contribution =
      await this.calloutContributionService.getContributionByChildIdOrFail(id);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      contribution.authorization,
      AuthorizationPrivilege.DELETE,
      `delete contribution: ${contribution.id}`
    );

    const { post } = await this.calloutContributionService.delete(
      contribution.id
    );

    if (!post) {
      throw new EntityNotFoundException(
        'Post not found after deleting the parent Contribution',
        LogContext.COLLABORATION,
        {
          contributionId: contribution.id,
          postId: id,
        }
      );
    }

    return post;
  }

  @Mutation(() => ILink, {
    description: 'Deletes the specified Link.',
  })
  async deleteLinkAsContribution(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ILink> {
    const contribution =
      await this.calloutContributionService.getContributionByChildIdOrFail(id);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      contribution.authorization,
      AuthorizationPrivilege.DELETE,
      `link contribution: ${contribution.id}`
    );

    const { link } = await this.calloutContributionService.delete(
      contribution.id
    );

    if (!link) {
      throw new EntityNotFoundException(
        'Link not found after deleting the parent Contribution',
        LogContext.COLLABORATION,
        {
          contributionId: contribution.id,
          postId: id,
        }
      );
    }

    return link;
  }
}
