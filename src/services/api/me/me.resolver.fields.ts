import { Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { Args, ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication/agent-info';
import { MeQueryResults } from '@services/api/me/dto';
import { IInvitation } from '@domain/community/invitation';
import { IApplication } from '@domain/community/application';
import { IUser } from '@domain/community/user';
import { AuthenticationException } from '@common/exceptions';
import { UserService } from '@domain/community/user/user.service';
import { ISpace } from '@domain/challenge/space/space.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { MeService } from './me.service';

@Resolver(() => MeQueryResults)
export class MeResolverFields {
  constructor(private meService: MeService, private userService: UserService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IUser, {
    nullable: true,
    description:
      'The current authenticated User;  null if not yet registered on the platform',
  })
  @Profiling.api
  async user(@CurrentUser() agentInfo: AgentInfo): Promise<IUser | null> {
    const email = agentInfo.email;
    if (!email) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier'
      );
    }

    return this.userService.getUserByEmail(email);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => [IInvitation], {
    description: 'The invitations of the current authenticated user',
  })
  @Profiling.api
  public invitations(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<IInvitation[]> {
    return this.meService.getUserInvitations(agentInfo.userID, states);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => [IApplication], {
    description: 'The applications of the current authenticated user',
  })
  @Profiling.api
  public applications(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<IApplication[]> {
    return this.meService.getUserApplications(agentInfo.userID, states);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => [ISpace], {
    description: 'The applications of the current authenticated user',
  })
  @Profiling.api
  public spaceMemberships(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'visibilities',
      nullable: true,
      type: () => [SpaceVisibility],
      description: 'The Space visibilities you want to filter on',
    })
    visibilities: SpaceVisibility[]
  ): Promise<IApplication[]> {
    return this.meService.getSpaceMemberships(
      agentInfo.credentials,
      visibilities
    );
  }
}
