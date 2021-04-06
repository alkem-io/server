import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Profiling } from '@src/common/decorators';
import { CreateReferenceInput } from '@domain/common/reference';
import { Reference } from '@domain/common/reference/reference.entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { ContextService } from './context.service';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';

@Resolver()
export class ContextResolver {
  constructor(private contextService: ContextService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Reference, {
    description:
      'Creates a new reference with the specified name for the context with given id',
  })
  @Profiling.api
  async createReferenceOnContext(
    @Args('contextID') profileID: number,
    @Args('referenceInput') referenceInput: CreateReferenceInput
  ): Promise<IReference> {
    const reference = await this.contextService.createReference(
      profileID,
      referenceInput
    );
    return reference;
  }
}
