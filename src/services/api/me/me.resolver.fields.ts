import { Float, Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '@src/common/decorators';
import { Args, ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { MeQueryResults } from '@services/api/me/dto';
import { IUser } from '@domain/community/user';
import {
  AuthenticationException,
  ValidationException,
} from '@common/exceptions';
import { UserService } from '@domain/community/user/user.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { MeService } from './me.service';
import { LogContext } from '@common/enums';
import { MySpaceResults } from './dto/my.journeys.results';
import { CommunityInvitationResult } from './dto/me.invitation.result';
import { CommunityApplicationResult } from './dto/me.application.result';

@Resolver(() => MeQueryResults)
export class MeResolverFields {
  constructor(private meService: MeService, private userService: UserService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('id', () => String, {
    description: 'The query id',
  })
  public id(@CurrentUser() agentInfo: AgentInfo): string {
    return `me-${agentInfo.userID}`;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IUser, {
    nullable: true,
    description:
      'The current authenticated User;  null if not yet registered on the platform',
  })
  async user(@CurrentUser() agentInfo: AgentInfo): Promise<IUser | null> {
    const email = agentInfo.email;
    if (!email) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier',
        LogContext.RESOLVER_FIELD
      );
    }

    return this.userService.getUserByEmail(email);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('communityInvitations', () => [CommunityInvitationResult], {
    description: 'The invitations the current authenticated user can act on.',
  })
  public async communityInvitations(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<CommunityInvitationResult[]> {
    if (agentInfo.userID === '') {
      throw new ValidationException(
        'Unable to retrieve invitations as no userID provided.',
        LogContext.COMMUNITY
      );
    }
    return this.meService.getCommunityInvitationsForUser(
      agentInfo.userID,
      states
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('communityApplications', () => [CommunityApplicationResult], {
    description:
      'The community applications current authenticated user can act on.',
  })
  public async communityApplications(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<CommunityApplicationResult[]> {
    if (agentInfo.userID === '') {
      throw new ValidationException(
        'Unable to retrieve invitations as no userID provided.',
        LogContext.COMMUNITY
      );
    }
    return this.meService.getCommunityApplicationsForUser(
      agentInfo.userID,
      states
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => [ISpace], {
    description: 'The applications of the current authenticated user',
  })
  public spaceMemberships(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'visibilities',
      nullable: true,
      type: () => [SpaceVisibility],
      description: 'The Space visibilities you want to filter on',
    })
    visibilities: SpaceVisibility[]
  ): Promise<ISpace[]> {
    return this.meService.getSpaceMemberships(agentInfo, visibilities);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => [MySpaceResults], {
    description: 'The Spaces I am contributing to',
  })
  public mySpaces(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Journeys to return; if omitted return latest 20 active Journeys.',
      nullable: true,
    })
    limit: number
  ): Promise<MySpaceResults[]> {
    return this.meService.getMySpaces(agentInfo, limit);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => [ISpace], {
    description: 'The Spaces I have created',
  })
  public myCreatedSpaces(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<ISpace[]> {
    return this.meService.getMyCreatedSpaces(agentInfo);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => Boolean, {
    description: 'Can I create a free space?',
  })
  public canCreateFreeSpace(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    return this.meService.canCreateFreeSpace(agentInfo);
  }
}
