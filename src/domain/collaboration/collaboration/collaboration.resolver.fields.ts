import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IRelation } from '@domain/collaboration/relation';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { Collaboration } from './collaboration.entity';
import { ICollaboration } from './collaboration.interface';
import { CollaborationService } from './collaboration.service';

@Resolver(() => ICollaboration)
export class CollaborationResolverFields {
  constructor(private collaborationService: CollaborationService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('relations', () => [IRelation], {
    nullable: true,
    description: 'The set of Relations within the context of this Opportunity.',
  })
  @Profiling.api
  async relations(@Parent() collaboration: Collaboration) {
    return await this.collaborationService.getRelations(collaboration);
  }
}
