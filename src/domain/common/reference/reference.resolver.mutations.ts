import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { ReferenceService } from './reference.service';
import { RemoveEntityInput } from '@domain/common/entity.dto.remove';
import { IReference, Reference } from '@domain/common/reference';

@Resolver()
export class ReferenceResolverMutations {
  constructor(private referenceService: ReferenceService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Reference, {
    description: 'Removes the reference  with the specified ID',
  })
  async removeReference(
    @Args('removeData') removeData: RemoveEntityInput
  ): Promise<IReference> {
    return await this.referenceService.removeReference(removeData);
  }
}
