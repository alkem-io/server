import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import {
  GrantAuthorizationCredentialInput,
  GrantStateModificationVCInput,
  RevokeAuthorizationCredentialInput,
} from '@core/authorization';
import { AuthorizationService } from './authorization.service';
import { IUser } from '@domain/community/user';
import { GraphqlGuard } from './graphql.guard';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { SsiAgentService } from '@src/services/ssi/agent/ssi.agent.service';

@Resolver()
export class AuthorizationResolverMutations {
  private authorizationDefinition: IAuthorizationDefinition;

  constructor(
    private ssiAgentService: SsiAgentService,
    private challengeService: ChallengeService,
    private authorizationEngine: AuthorizationEngineService,
    private authorizationService: AuthorizationService
  ) {
    this.authorizationDefinition = this.authorizationEngine.createGlobalRolesAuthorizationDefinition(
      [AuthorizationRoleGlobal.CommunityAdmin, AuthorizationRoleGlobal.Admin],
      [AuthorizationPrivilege.GRANT]
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Grants an authorization credential to a User.',
  })
  @Profiling.api
  async grantCredentialToUser(
    @Args('grantCredentialData')
    grantCredentialData: GrantAuthorizationCredentialInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser> {
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      this.authorizationDefinition,
      AuthorizationPrivilege.GRANT,
      `grant credential: ${agentInfo.email}`
    );
    return await this.authorizationService.grantCredential(
      grantCredentialData,
      agentInfo
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes an authorization credential from a User.',
  })
  @Profiling.api
  async revokeCredentialFromUser(
    @Args('revokeCredentialData')
    credentialRemoveData: RevokeAuthorizationCredentialInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser> {
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      this.authorizationDefinition,
      AuthorizationPrivilege.GRANT,
      `revoke credential: ${agentInfo.email}`
    );
    return await this.authorizationService.revokeCredential(
      credentialRemoveData,
      agentInfo
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description:
      'Assigns the StateModification credential to a particular user for a particular challenge',
  })
  @Profiling.api
  async grantStateModificationVC(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('grantStateModificationVC')
    grantStateModificationVC: GrantStateModificationVCInput
  ): Promise<IUser> {
    const challenge = await this.challengeService.getChallengeOrFail(
      grantStateModificationVC.challengeID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      challenge.authorization,
      AuthorizationPrivilege.CREATE,
      `create VC on challenge (${challenge.nameID}) for user ${grantStateModificationVC.userID}`
    );

    return await this.authorizationService.authorizeChallengeStateModification(
      grantStateModificationVC
    );
  }
}
