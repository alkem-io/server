import { ActivityEventType } from '@common/enums/activity.event.type';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ObjectType('Activity')
export abstract class IActivity extends IBaseAlkemio {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The id of the Collaboration entity within which the Activity was generated.',
  })
  collaborationID!: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'The id of the parent of the entity within which the Activity was generated.',
  })
  parentID?: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The id of the user that triggered this Activity.',
  })
  triggeredBy!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The id of the entity that is associated with this Activity.',
  })
  resourceID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The text details for this Activity.',
  })
  description?: string;

  @Field(() => ActivityEventType, {
    nullable: false,
    description: 'The event type for this Activity.',
  })
  type!: ActivityEventType;

  @Field(() => Boolean, {
    description:
      'Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter.',
    defaultValue: false,
  })
  child?: boolean;

  messageID?: string;
  visibility!: boolean;
}
