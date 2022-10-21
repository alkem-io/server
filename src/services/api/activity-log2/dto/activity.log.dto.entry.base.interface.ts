import { ActivityEventType } from '@common/enums/activity.event.type';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IUser } from '@domain/community';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryBase', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryBase implements IActivityLogEntry {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => IUser, {
    nullable: false,
    description: 'The user that triggered this Activity.',
  })
  triggeredBy!: IUser;

  @Field(() => Date, {
    description: 'The timestamp for the Activity.',
    nullable: false,
  })
  createdDate!: Date;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The id of the Collaboration entity within which the Activity was generated.',
  })
  collaborationID!: string;

  @Field(() => ActivityEventType, {
    nullable: false,
    description: 'The event type for this Activity.',
  })
  type!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The text details for this Activity.',
  })
  description?: string;
}
