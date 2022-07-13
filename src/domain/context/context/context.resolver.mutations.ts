import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IReference } from '@domain/common/reference';
import { ContextService } from '@domain/context/context/context.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { CreateReferenceOnContextInput } from '@domain/context/context/dto/context.dto.create.reference';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Resolver()
export class ContextResolverMutations {
  constructor(
    private referenceService: ReferenceService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private contextService: ContextService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Creates a new Reference on the specified Context.',
  })
  @Profiling.api
  async createReferenceOnContext(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('referenceInput') referenceInput: CreateReferenceOnContextInput
  ): Promise<IReference> {
    const context = await this.contextService.getContextOrFail(
      referenceInput.contextID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      context.authorization,
      AuthorizationPrivilege.CREATE,
      `create reference on context: ${context.id}`
    );
    const reference = await this.contextService.createReference(referenceInput);
    reference.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        reference.authorization,
        context.authorization
      );
    return await this.referenceService.saveReference(reference);
  }
}
