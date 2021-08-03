import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IAuthorizationPolicy } from './authorization.policy.interface';
import { IAuthorizationRuleCredential } from './authorization.rule.credential.interface';
import { AuthorizationPolicyService } from './authorization.policy.service';

@Resolver(() => IAuthorizationPolicy)
export class AuthorizationPolicyResolverFields {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  @ResolveField('credentialRules', () => [IAuthorizationRuleCredential], {
    nullable: true,
    description:
      'The set of credential rules that are contained by this AuthorizationDefinition.',
  })
  @Profiling.api
  credentialRules(
    @Parent() authorization: IAuthorizationPolicy
  ): IAuthorizationRuleCredential[] {
    return this.authorizationPolicyService.getCredentialRules(authorization);
  }

  @ResolveField(
    'verifiedCredentialRules',
    () => [IAuthorizationRuleCredential],
    {
      nullable: true,
      description:
        'The set of verified credential rules that are contained by this AuthorizationDefinition.',
    }
  )
  @Profiling.api
  verifiedCredentialRules(
    @Parent() authorization: IAuthorizationPolicy
  ): IAuthorizationRuleCredential[] {
    return this.authorizationPolicyService.getVerifiedCredentialRules(
      authorization
    );
  }
}
