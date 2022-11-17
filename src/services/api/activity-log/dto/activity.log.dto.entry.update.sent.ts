import { IUpdates } from '@domain/communication/updates/updates.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryUpdateSent', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryUpdateSent
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => IUpdates, {
    nullable: false,
    description: 'The Updates for this Community.',
  })
  updates!: IUpdates;

  @Field(() => String, {
    nullable: false,
    description: 'The Message that been sent to this Community.',
  })
  message!: string;
}
