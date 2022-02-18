import { UseGuards } from '@nestjs/common';
import { Args, Float, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IUser } from '@domain/community/user';
import { UserService } from './user.service';
import { AuthenticationException } from '@common/exceptions';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { UserNotRegisteredException } from '@common/exceptions/registration.exception';
import { GraphqlGuard } from '@core/authorization';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPrivilege, ConfigurationTypes } from '@common/enums';
import { AgentService } from '@domain/agent/agent/agent.service';
import {
  BeginCredentialOfferOutput,
  BeginCredentialRequestOutput,
} from '@domain/agent/credential/credential.dto.interactions';
import { ConfigService } from '@nestjs/config';
import { ssiConfig } from '@config/ssi.config';
import { v4 } from 'uuid';

@Resolver(() => IUser)
export class UserResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userService: UserService,
    private agentService: AgentService,
    private configService: ConfigService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [IUser], {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  @Profiling.api
  async users(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of users to return; if omitted return all Users.',
      nullable: true,
    })
    limit: number,
    @Args({
      name: 'shuffle',
      type: () => Boolean,
      description:
        'If true and limit is specified then return a random selection of Users. Defaults to false.',
      nullable: true,
    })
    shuffle: boolean
  ): Promise<IUser[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationPolicyService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `users query: ${agentInfo.email}`
    );
    return await this.userService.getUsers(limit, shuffle);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => IUser, {
    nullable: false,
    description: 'A particular user, identified by the ID or by email',
  })
  @Profiling.api
  async user(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID_NAMEID_EMAIL }) id: string
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationPolicyService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `user query: ${agentInfo.email}`
    );
    return await this.userService.getUserOrFail(id);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => [IUser], {
    nullable: false,
    description: 'The users filtered by list of IDs.',
  })
  @Profiling.api
  async usersById(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ name: 'IDs', type: () => [UUID_NAMEID_EMAIL] }) ids: string[]
  ): Promise<IUser[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationPolicyService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `users query: ${agentInfo.email}`
    );
    const users = await this.userService.getUsers();
    return users.filter(x => {
      return ids ? ids.indexOf(x.id) > -1 : false;
    });
  }

  @UseGuards(GraphqlGuard)
  @Query(() => Boolean, {
    nullable: false,
    description: 'Check if the currently logged in user has a User profile',
  })
  @Profiling.api
  async meHasProfile(@CurrentUser() agentInfo: AgentInfo): Promise<boolean> {
    const email = agentInfo.email;
    if (!email || email.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier'
      );
    }
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      return false;
    }
    return true;
  }

  @UseGuards(GraphqlGuard)
  @Query(() => IUser, {
    nullable: false,
    description: 'The currently logged in user',
  })
  @Profiling.api
  async me(@CurrentUser() agentInfo: AgentInfo): Promise<IUser> {
    const email = agentInfo.email;
    if (!email || email.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier'
      );
    }
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new UserNotRegisteredException();
    }
    return user;
  }

  @UseGuards(GraphqlGuard)
  @Query(() => BeginCredentialRequestOutput, {
    nullable: false,
    description: 'Generate credential share request',
  })
  @Profiling.api
  async beginCredentialRequestInteraction(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ name: 'types', type: () => [String] }) types: string[]
  ): Promise<BeginCredentialRequestOutput> {
    const userID = agentInfo.userID;
    if (!userID || userID.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier'
      );
    }

    // TODO - the api/public/rest needs to be configurable
    const nonce = v4();
    const url = `${
      this.configService.get(ConfigurationTypes.HOSTING)?.endpoint
    }/api/public/rest/${
      ssiConfig.endpoints.completeCredentialRequestInteraction
    }/${nonce}`;

    const storedAgent = await this.userService.getAgent(userID);
    return await this.agentService.beginCredentialRequestInteraction(
      storedAgent,
      url,
      nonce,
      types
    );
  }

  @UseGuards(GraphqlGuard)
  @Query(() => BeginCredentialOfferOutput, {
    nullable: false,
    description: 'Generate credential offer request',
  })
  @Profiling.api
  async beginCredentialOfferInteraction(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ name: 'types', type: () => [String] }) types: string[]
  ): Promise<BeginCredentialOfferOutput> {
    const userID = agentInfo.userID;
    if (!userID || userID.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier'
      );
    }

    // TODO - the api/public/rest needs to be configurable
    const nonce = v4();
    const url = `${
      this.configService.get(ConfigurationTypes.HOSTING)?.endpoint
    }/api/public/rest/${
      ssiConfig.endpoints.completeCredentialOfferInteraction
    }/${nonce}`;

    const storedAgent = await this.userService.getAgent(userID);
    return await this.agentService.beginCredentialOfferInteraction(
      storedAgent,
      url,
      nonce,
      types
    );
  }
}
