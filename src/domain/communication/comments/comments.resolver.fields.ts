import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { CommunicationMessageResult } from '../message/communication.dto.message.result';
import { IComments } from './comments.interface';
import { CommentsService } from './comments.service';

@Resolver(() => IComments)
export class CommentsResolverFields {
  constructor(private commentsService: CommentsService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('messages', () => [CommunicationMessageResult], {
    nullable: true,
    description: 'Messages in this Comments.',
  })
  @Profiling.api
  async messages(
    @Parent() comments: IComments
  ): Promise<CommunicationMessageResult[]> {
    const commentsRoom = await this.commentsService.getCommentsRoom(comments);
    return commentsRoom.messages;
  }
}
