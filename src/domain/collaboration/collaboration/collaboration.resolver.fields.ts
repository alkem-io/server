import { Relation } from '@domain/collaboration/relation/relation.entity';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';

import { Collaboration } from '@domain/collaboration';
import { CollaborationService } from './collaboration.service';

@Resolver(() => Collaboration)
export class CollaborationResolverFields {
  constructor(private collaborationService: CollaborationService) {}

  @ResolveField('relations', () => [Relation], {
    nullable: true,
    description:
      'The set of relations within the context of this Collaboration.',
  })
  @Profiling.api
  async relations(@Parent() collaboration: Collaboration) {
    return await this.collaborationService.loadRelations(collaboration);
  }
}
