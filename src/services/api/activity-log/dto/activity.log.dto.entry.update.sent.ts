import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';
import { IRoom } from '@domain/communication/room/room.interface';

@ObjectType('ActivityLogEntryUpdateSent', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryUpdateSent
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => IRoom, {
    nullable: false,
    description: 'The Updates for this Community.',
  })
  updates!: IRoom;

  @Field(() => String, {
    nullable: false,
    description: 'The Message that been sent to this Community.',
  })
  message!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The url to the Journey.',
  })
  journeyUrl!: string;
}
