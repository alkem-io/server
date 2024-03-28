import { ActivityEventType } from '@common/enums/activity.event.type';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IUser } from '@domain/community/user';
import { Field } from '@nestjs/graphql';
import { NameID } from '@domain/common/scalars';
import { IJourney } from '@domain/challenge/base-challenge/journey.interface';
import { SpaceType } from '@common/enums/space.type';

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

  @Field(() => NameID, {
    description: 'The nameID of the parent',
  })
  parentNameID!: string;

  @Field(() => String, {
    description: 'The display name of the parent',
  })
  parentDisplayName!: string;

  @Field(() => SpaceType, {
    nullable: true,
    description: 'The type of journey',
  })
  journeyType?: SpaceType;

  @Field(() => IJourney, {
    nullable: true,
    description: 'The journey where the activity happened',
  })
  journey?: IJourney;
}
