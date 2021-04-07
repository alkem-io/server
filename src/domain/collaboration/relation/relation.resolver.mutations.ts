import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { RelationService } from './relation.service';
import { Relation, IRelation } from '@domain/collaboration/relation';
import { RemoveEntityInput } from '@domain/common/entity.dto.remove';

@Resolver()
export class RelationResolverMutations {
  constructor(private relationService: RelationService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Relation, {
    description: 'Removes the relation with the specified ID',
  })
  async removeRelation(
    @Args('removeData') removeData: RemoveEntityInput
  ): Promise<IRelation> {
    return await this.relationService.removeRelation(removeData);
  }
}
