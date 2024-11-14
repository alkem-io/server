import { Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';

export abstract class InAppNotificationBase {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => Date, {
    nullable: false,
    description: 'When (UTC) was the action triggered.',
  })
  triggeredAt!: Date;
  // todo: graphql enum
  @Field(() => String, {
    nullable: false,
    description: 'The user that triggered this Activity.',
  })
  type!: NotificationEventType;

  @Field(() => InAppNotificationState, {
    nullable: false,
    description: 'The user that triggered this Activity.',
  })
  state!: InAppNotificationState;

  // todo: graphql enum
  @Field(() => String, {
    nullable: false,
    description: 'The contributor that triggered this notification.',
  })
  category!: string;

  @Field(() => IContributor, {
    nullable: true,
    description: 'The contributor that triggered this notification.',
  })
  triggeredBy?: IContributor;

  @Field(() => IContributor, {
    nullable: false,
    description: 'The contributor that should receive this notification.',
  })
  receiver!: IContributor;

  @Field(() => IContributor, {
    nullable: true,
    description: 'The contributor is the main actor in the notification.',
  })
  actor?: IContributor;
  // the type and name to be resolved in the concrete class
  resourceID?: string;
}
