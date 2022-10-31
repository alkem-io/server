import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { IMessage } from '../message/message.interface';
import { IUpdates } from './updates.interface';
import { UpdatesService } from './updates.service';

@Resolver(() => IUpdates)
export class UpdatesResolverFields {
  constructor(private updatesService: UpdatesService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('messages', () => [IMessage], {
    nullable: true,
    description: 'Messages in this Updates.',
  })
  @Profiling.api
  async messages(@Parent() updates: IUpdates): Promise<IMessage[]> {
    const discussionRoom = await this.updatesService.getUpdatesRoom(updates);
    return discussionRoom.messages;
  }
}
