import { SelfManagement } from '@common/decorators';
import { Roles } from '@common/decorators/roles.decorator';
import {
  DeleteReferenceInput,
  IReference,
  Reference,
} from '@domain/common/reference';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { UpdateReferenceInput } from './reference.dto.update';
import { ReferenceService } from './reference.service';

@Resolver()
export class ReferenceResolverMutations {
  constructor(private referenceService: ReferenceService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @SelfManagement()
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Reference, {
    description: 'Deletes the specified Reference.',
  })
  async deleteReference(
    @Args('deleteData') deleteData: DeleteReferenceInput
  ): Promise<IReference> {
    return await this.referenceService.deleteReference(deleteData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Reference, {
    description: 'Update the specified Reference.',
  })
  async updateReference(
    @Args('updateData') updateData: UpdateReferenceInput
  ): Promise<IReference> {
    return await this.referenceService.updateReference(updateData);
  }
}
