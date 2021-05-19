import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RelationService } from './relation.service';
import { IRelation, DeleteRelationInput } from '@domain/collaboration/relation';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationRoleGlobal } from '@common/enums';
@Resolver()
export class RelationResolverMutations {
  constructor(private relationService: RelationService) {}

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
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
