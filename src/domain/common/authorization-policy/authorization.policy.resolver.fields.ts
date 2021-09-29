import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IAuthorizationPolicy } from './authorization.policy.interface';
import { IAuthorizationPolicyRuleCredential } from '../../../core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyService } from './authorization.policy.service';

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
    () => [IAuthorizationPolicyRuleCredential],
    {
      nullable: true,
      description:
        'The set of verified credential rules that are contained by this Authorization Policy.',
    }
  )
  @Profiling.api
  verifiedCredentialRules(
    @Parent() authorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRuleCredential[] {
    return this.authorizationPolicyService.getVerifiedCredentialRules(
      authorization
    );
  }
}
