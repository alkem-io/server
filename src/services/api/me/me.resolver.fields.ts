import { Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '@src/common/decorators';
import { Args, ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication/agent-info';
import { MeQueryResults } from '@services/api/me/dto';
import { IUser } from '@domain/community/user';
import { AuthenticationException } from '@common/exceptions';
import { UserService } from '@domain/community/user/user.service';
import { ISpace } from '@domain/challenge/space/space.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { MeService } from './me.service';
import { ApplicationForRoleResult } from '../roles/dto/roles.dto.result.application';
import { InvitationForRoleResult } from '../roles/dto/roles.dto.result.invitation';
import { LogContext } from '@common/enums';

@Resolver(() => MeQueryResults)
export class MeResolverFields {
  constructor(private meService: MeService, private userService: UserService) {}

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
  @ResolveField('invitations', () => [InvitationForRoleResult], {
    description: 'The invitations of the current authenticated user',
  })
  public async invitations(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<InvitationForRoleResult[]> {
    return this.meService.getUserInvitations(agentInfo.userID, states);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('applications', () => [ApplicationForRoleResult], {
    description: 'The applications of the current authenticated user',
  })
  public async applications(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<ApplicationForRoleResult[]> {
    return this.meService.getUserApplications(agentInfo.userID, states);
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
    return this.meService.getSpaceMemberships(
      agentInfo.credentials,
      visibilities
    );
  }
}
