import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RelationService } from './relation.service';
import { IRelation, DeleteRelationInput } from '@domain/collaboration/relation';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { AuthorizationRolesGlobal, GraphqlGuard } from '@core/authorization';
@Resolver()
export class RelationResolverMutations {
  constructor(private relationService: RelationService) {}

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => IRelation, {
    description: 'Deletes the specified Relation.',
  })
  async deleteRelation(
    @Args('deleteData') deleteData: DeleteRelationInput
  ): Promise<IRelation> {
    return await this.relationService.deleteRelation(deleteData);
  }
}
