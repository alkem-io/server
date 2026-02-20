import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { IAuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege.interface';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { IAuthorizationPolicyRuleCredential } from '../../../core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from './authorization.policy.interface';
import { AuthorizationPolicyService } from './authorization.policy.service';

@Resolver(() => IAuthorizationPolicy)
export class AuthorizationPolicyResolverFields {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  @ResolveField('credentialRules', () => [IAuthorizationPolicyRuleCredential], {
    nullable: true,
    description:
      'The set of credential rules that are contained by this Authorization Policy.',
  })
  credentialRules(
    @Parent() authorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRuleCredential[] {
    return this.authorizationPolicyService.getCredentialRules(authorization);
  }

  @ResolveField('privilegeRules', () => [IAuthorizationPolicyRulePrivilege], {
    nullable: true,
    description:
      'The set of privilege rules that are contained by this Authorization Policy.',
  })
  privilegeRules(
    @Parent() authorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRulePrivilege[] {
    return this.authorizationPolicyService.getPrivilegeRules(authorization);
  }

  @ResolveField('myPrivileges', () => [AuthorizationPrivilege], {
    nullable: true,
    description:
      'The privileges granted to the current user based on this Authorization Policy.',
  })
  myPrivileges(
    @CurrentActor() actorContext: ActorContext,
    @Parent() authorization: IAuthorizationPolicy
  ): AuthorizationPrivilege[] {
    return this.authorizationPolicyService.getAgentPrivileges(
      actorContext,
      authorization
    );
  }

  @ResolveField('hasPrivilege', () => Boolean, {
    nullable: false,
    description:
      'Does the current User have the specified privilege based on this Authorization Policy.',
  })
  hasPrivilege(
    @CurrentActor() actorContext: ActorContext,
    @Parent() authorization: IAuthorizationPolicy,
    @Args('privilege', { type: () => AuthorizationPrivilege, nullable: false })
    privilege: AuthorizationPrivilege
  ): boolean {
    const privileges = this.authorizationPolicyService.getAgentPrivileges(
      actorContext,
      authorization
    );
    return Array.isArray(privileges) && privileges.includes(privilege);
  }
}
