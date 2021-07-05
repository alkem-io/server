import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IAuthorizationDefinition } from './authorization.definition.interface';
import { IAuthorizationRuleCredential } from './authorization.rule.credential.interface';
import { AuthorizationDefinitionService } from './authorization.definition.service';

@Resolver(() => IAuthorizationDefinition)
export class AuthorizationDefinitionResolverFields {
  constructor(
    private authorizationDefinitionService: AuthorizationDefinitionService
  ) {}

  @ResolveField('credentialRules', () => [IAuthorizationRuleCredential], {
    nullable: true,
    description:
      'The set of credential rules that are contained by this AuthorizationDefinition.',
  })
  @Profiling.api
  credentialRules(
    @Parent() authorization: IAuthorizationDefinition
  ): IAuthorizationRuleCredential[] {
    return this.authorizationDefinitionService.getCredentialRules(
      authorization
    );
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
    @Parent() authorization: IAuthorizationDefinition
  ): IAuthorizationRuleCredential[] {
    return this.authorizationDefinitionService.getVerifiedCredentialRules(
      authorization
    );
  }
}
