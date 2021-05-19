import { AuthorizationGlobalRoles } from '@common/decorators';
import { AuthorizationRoleGlobal } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import {
  CreateReferenceInput,
  IReference,
  Reference,
} from '@domain/common/reference';
import { Aspect, CreateAspectInput, IAspect } from '@domain/context';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { ContextService } from './context.service';

@Resolver()
export class ContextResolverMutations {
  constructor(private contextService: ContextService) {}

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => Reference, {
    description: 'Creates a new Reference on the specified Context.',
  })
  @Profiling.api
  async createReferenceOnContext(
    @Args('referenceInput') referenceInput: CreateReferenceInput
  ): Promise<IReference> {
    const reference = await this.contextService.createReference(referenceInput);
    return reference;
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => Aspect, {
    description: 'Create a new Aspect on the Opportunity.',
  })
  @Profiling.api
  async createAspect(
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IAspect> {
    return await this.contextService.createAspect(aspectData);
  }
}
