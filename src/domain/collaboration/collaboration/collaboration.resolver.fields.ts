import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IRelation } from '@domain/collaboration/relation';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ICallout } from '../callout/callout.interface';

@Resolver(() => ICollaboration)
export class CollaborationResolverFields {
  constructor(private collaborationService: CollaborationService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('relations', () => [IRelation], {
    nullable: true,
    description: 'The list of Relations for this Collaboration object.',
  })
  @Profiling.api
  async relations(
    @Parent() collaboration: Collaboration,
    @Context() { loaders }: IGraphQLContext
  ) {
    return loaders.relationsLoader.load(collaboration.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('callouts', () => [ICallout], {
    nullable: true,
    description: 'The list of Callouts for this Collaboration object.',
  })
  @Profiling.api
  async callouts(
    @Parent() collaboration: Collaboration,
    @Context() { loaders }: IGraphQLContext
  ) {
    return loaders.calloutsLoader.load(collaboration.id);
  }
}
