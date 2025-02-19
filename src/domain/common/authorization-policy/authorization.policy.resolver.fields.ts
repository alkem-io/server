import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IAuthorizationPolicy } from './authorization.policy.interface';
import { IAuthorizationPolicyRuleCredential } from '../../../core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyService } from './authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IAuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege.interface';
import { IAuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential.interface';

@Resolver(() => IAuthorizationPolicy)
export class AuthorizationPolicyResolverFields {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  @ResolveField('credentialRules', () => [IAuthorizationPolicyRuleCredential], {
    nullable: true,
    description:
      'The set of credential rules that are contained by this Authorization Policy.',
  })
  @Profiling.api
  credentialRules(
    @Parent() authorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRuleCredential[] {
    return this.authorizationPolicyService.getCredentialRules(authorization);
  }

  @ResolveField(
    'verifiedCredentialRules',
    () => [IAuthorizationPolicyRuleVerifiedCredential],
    {
      nullable: true,
      description:
        'The set of verified credential rules that are contained by this Authorization Policy.',
    }
  )
  @Profiling.api
  verifiedCredentialRules(
    @Parent() authorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRuleVerifiedCredential[] {
    return this.authorizationPolicyService.getVerifiedCredentialRules(
      authorization
    );
  }

  @ResolveField('privilegeRules', () => [IAuthorizationPolicyRulePrivilege], {
    nullable: true,
    description:
      'The set of privilege rules that are contained by this Authorization Policy.',
  })
  @Profiling.api
  privilegeRules(
    @Parent() authorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRulePrivilege[] {
    return this.authorizationPolicyService.getPrivilegeRules(authorization);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myPrivileges', () => [AuthorizationPrivilege], {
    nullable: true,
    description:
      'The privileges granted to the current user based on this Authorization Policy.',
  })
  @Profiling.api
  myPrivileges(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() authorization: IAuthorizationPolicy
  ): AuthorizationPrivilege[] {
    return this.authorizationPolicyService.getAgentPrivileges(
      agentInfo,
      authorization
    );
  }
}
