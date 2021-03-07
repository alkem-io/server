import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@src/core/authorization/roles.decorator';
import { Profiling } from '@src/core/logging/logging.profiling.decorator';
import { ReferenceInput } from '@domain/common/reference/reference.dto';
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
    @Args('referenceInput') referenceInput: ReferenceInput
  ): Promise<IReference> {
    const reference = await this.contextService.createReference(
      profileID,
      referenceInput
    );
    return reference;
  }
}
