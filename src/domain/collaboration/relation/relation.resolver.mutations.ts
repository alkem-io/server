import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RelationService } from './relation.service';
import { IRelation, DeleteRelationInput } from '@domain/collaboration/relation';
import { CurrentUser } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication';
@Resolver()
export class RelationResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private relationService: RelationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IRelation, {
    description: 'Deletes the specified Relation.',
  })
  async deleteRelation(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteRelationInput
  ): Promise<IRelation> {
    const relation = await this.relationService.getRelationOrFail(
      deleteData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      relation.authorization,
      AuthorizationPrivilege.DELETE,
      `user delete: ${relation.actorName}`
    );
    return await this.relationService.deleteRelation(deleteData);
  }
}
