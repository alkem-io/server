import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import {
  CreateReferenceParentInput,
  IReference,
} from '@domain/common/reference';
import { ContextService } from './context.service';
import { CreateAspectInput, IAspect } from '@domain/context';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { AuthorizationRoleGlobal } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common/decorators';
@Resolver()
export class ContextResolverMutations {
  constructor(private contextService: ContextService) {}

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Creates a new Reference on the specified Context.',
  })
  @Profiling.api
  async createReferenceOnContext(
    @Args('referenceInput') referenceInput: CreateReferenceParentInput
  ): Promise<IReference> {
    const reference = await this.contextService.createReference(referenceInput);
    return reference;
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Create a new Aspect on the Opportunity.',
  })
  @Profiling.api
  async createAspect(
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IAspect> {
    return await this.contextService.createAspect(aspectData);
  }
}
