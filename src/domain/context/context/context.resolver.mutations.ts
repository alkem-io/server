import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import {
  CreateReferenceInput,
  Reference,
  IReference,
} from '@domain/common/reference';
import { ContextService } from './context.service';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { AuthorizationRolesGlobal, GraphqlGuard } from '@core/authorization';
import { Aspect, CreateAspectInput, IContext } from '@domain/context';

@Resolver()
export class ContextResolverMutations {
  constructor(private contextService: ContextService) {}

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
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

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => Aspect, {
    description: 'Create a new Aspect on the Opportunity.',
  })
  @Profiling.api
  async createAspect(
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IContext> {
    return await this.contextService.createAspect(aspectData);
  }
}
