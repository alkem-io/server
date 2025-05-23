import { ActivityEventType } from '@common/enums/activity.event.type';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IUser } from '@domain/community/user/user.interface';
import { Field } from '@nestjs/graphql';

export abstract class IActivityLogEntryBase {
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
  type!: ActivityEventType;

  @Field(() => String, {
    nullable: false,
    description: 'The text details for this Activity.',
  })
  description?: string;

  @Field(() => Boolean, {
    defaultValue: false,
    description:
      'Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter.',
  })
  child?: boolean;

  @Field(() => String, {
    description: 'The display name of the parent',
  })
  parentDisplayName!: string;
}
