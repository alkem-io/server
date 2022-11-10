import {
  Args,
  Context,
  Float,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ICallout } from '../callout/callout.interface';
import { UUID_NAMEID } from '@domain/common/scalars';

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
    @Args({
      name: 'IDs',
      type: () => [UUID_NAMEID],
      description: 'The IDs of the callouts to return',
      nullable: true,
    })
    ids: string[],
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Callouts to return; if omitted return all Callouts.',
      nullable: true,
    })
    limit: number,
    @Args({
      name: 'shuffle',
      type: () => Boolean,
      description:
        'If true and limit is specified then return the Callouts based on a random selection. Defaults to false.',
      nullable: true,
    })
    shuffle: boolean
  ) {
    return await this.collaborationService.getCalloutsFromCollaboration(
      collaboration,
      ids,
      limit,
      shuffle
    );
  }
}
