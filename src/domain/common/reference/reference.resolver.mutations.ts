import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { ReferenceService } from './reference.service';

import {
  DeleteReferenceInput,
  IReference,
  Reference,
} from '@domain/common/reference';

@Resolver()
export class ReferenceResolverMutations {
  constructor(private referenceService: ReferenceService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Reference, {
    description: 'Deletes the specified Reference.',
  })
  async deleteReference(
    @Args('deleteData') deleteData: DeleteReferenceInput
  ): Promise<IReference> {
    return await this.referenceService.deleteReference(deleteData);
  }
}
