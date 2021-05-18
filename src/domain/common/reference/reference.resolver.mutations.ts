import {
  AuthorizationGlobalRoles,
  AuthorizationRolesGlobal,
  AuthorizationSelfManagement,
  GraphqlGuard,
} from '@core/authorization';
import { DeleteReferenceInput, IReference } from '@domain/common/reference';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ReferenceService } from './reference.service';

@Resolver()
export class ReferenceResolverMutations {
  constructor(private referenceService: ReferenceService) {}

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @AuthorizationSelfManagement()
  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Deletes the specified Reference.',
  })
  async deleteReference(
    @Args('deleteData') deleteData: DeleteReferenceInput
  ): Promise<IReference> {
    return await this.referenceService.deleteReference(deleteData);
  }
}
