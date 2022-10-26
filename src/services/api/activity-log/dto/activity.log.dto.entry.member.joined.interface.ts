import { ICommunity } from '@domain/community/community';
import { IUser } from '@domain/community/user/user.interface';
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
  @Field(() => IUser, {
    nullable: false,
    description: 'The User that joined the Community.',
  })
  user!: IUser;

  @Field(() => String, {
    nullable: false,
    description: 'The type of the the Community.',
  })
  communityType!: string;

  @Field(() => ICommunity, {
    nullable: false,
    description: 'The community that was joined.',
  })
  community!: ICommunity;
}
