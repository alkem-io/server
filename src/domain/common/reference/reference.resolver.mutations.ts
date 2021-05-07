import {
  AuthorizationGlobalRoles,
  AuthorizationRolesGlobal,
  AuthorizationSelfManagement,
  AuthorizationRulesGuard,
} from '@core/authorization';
import {
  DeleteReferenceInput,
  IReference,
  Reference,
} from '@domain/common/reference';
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
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Reference, {
    description: 'Deletes the specified Reference.',
  })
  async deleteReference(
    @Args('deleteData') deleteData: DeleteReferenceInput
  ): Promise<IReference> {
    return await this.referenceService.deleteReference(deleteData);
  }
}
