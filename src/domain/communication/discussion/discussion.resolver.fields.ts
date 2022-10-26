import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { DiscussionService } from './discussion.service';
import { IDiscussion } from './discussion.interface';
import { IMessage } from '../message/message.interface';
import { Discussion } from './discussion.entity';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@Resolver(() => IDiscussion)
export class DiscussionResolverFields {
  constructor(private discussionService: DiscussionService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('messages', () => [IMessage], {
    nullable: true,
    description: 'Messages for this Discussion.',
  })
  @Profiling.api
  async messages(@Parent() discussion: IDiscussion): Promise<IMessage[]> {
    const discussionRoom = await this.discussionService.getDiscussionRoom(
      discussion
    );
    return discussionRoom.messages;
  }

  @ResolveField('timestamp', () => Number, {
    nullable: true,
    description: 'The timestamp for the creation of this Discussion.',
  })
  async timestamp(@Parent() discussion: IDiscussion): Promise<number> {
    const createdDate = (discussion as Discussion).createdDate;
    const date = new Date(createdDate);
    return date.getTime();
  }

  @ResolveField('createdBy', () => UUID, {
    nullable: false,
    description: 'The id of the user that created this discussion',
  })
  async createdBy(@Parent() discussion: IDiscussion): Promise<string> {
    const createdBy = discussion.createdBy;
    if (!createdBy) return '';
    return createdBy;
  }
}
