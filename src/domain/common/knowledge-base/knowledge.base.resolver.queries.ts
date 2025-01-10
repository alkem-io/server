import { Args, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Query } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { IKnowledgeBase } from './knowledge.base.interface';
import { KnowledgeBaseService } from './knowledge.base.service';
import { UUID_NAMEID } from '../scalars';

@Resolver()
export class KnowledgeBaseResolverQueries {
  constructor(private knowledgeBaseService: KnowledgeBaseService) {}

  @UseGuards(GraphqlGuard)
  @Query(() => IKnowledgeBase, {
    nullable: false,
    description: 'A particular KnowledgeBase',
  })
  async knowledgeBase(
    @Args('ID', { type: () => UUID_NAMEID, nullable: false }) id: string
  ): Promise<IKnowledgeBase> {
    return await this.knowledgeBaseService.getKnowledgeBaseOrFail(id);
  }
}
