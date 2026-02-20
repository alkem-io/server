import { ActorType } from '@common/enums/actor.type';
import { IActor } from '@domain/actor/actor/actor.interface';
import { ICommunity } from '@domain/community/community';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryMemberJoined', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryMemberJoined
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => IActor, {
    nullable: false,
    description: 'The Contributor that joined the Community.',
  })
  contributor!: IActor;

  @Field(() => ActorType, {
    nullable: false,
    description: 'The type of the Contributor that joined the Community.',
  })
  actorType!: ActorType;

  @Field(() => ICommunity, {
    nullable: false,
    description: 'The community that was joined.',
  })
  community!: ICommunity;
}
