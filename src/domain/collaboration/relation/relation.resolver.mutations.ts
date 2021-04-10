import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { RelationService } from './relation.service';
import {
  Relation,
  IRelation,
  DeleteRelationInput,
} from '@domain/collaboration/relation';

@Resolver()
export class RelationResolverMutations {
  constructor(private relationService: RelationService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Relation, {
    description: 'Removes the relation with the specified ID',
  })
  async deleteRelation(
    @Args('deleteData') deleteData: DeleteRelationInput
  ): Promise<IRelation> {
    return await this.relationService.deleteRelation(deleteData);
  }
}
