import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/authentication/graphql.guard';
import { Roles } from '@utils/decorators/roles.decorator';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { ReferenceInput } from '@domain/reference/reference.dto';
import { Reference } from '@domain/reference/reference.entity';
import { IReference } from '@domain/reference/reference.interface';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { ContextService } from './context.service';

@Resolver()
export class ContextResolver {
  constructor(private contextService: ContextService) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
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
