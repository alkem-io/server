import { Field, ObjectType } from '@nestjs/graphql';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotification } from '../in.app.notification.interface';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';

@ObjectType('InAppNotificationUserMentioned', {
  implements: () => InAppNotification,
})
export class InAppNotificationUserMentioned implements InAppNotification {
  type!: NotificationEventType.COMMUNICATION_USER_MENTION;
  @Field(() => CommunityContributorType, {
    nullable: false,
    description: 'The type of contributor that was mentioned.',
  })
  contributorType!: CommunityContributorType;
  // overwrite the description
  @Field(() => IContributor, {
    nullable: true,
    description: 'The contributor that mentioned the receiver.',
  })
  triggeredBy?: IContributor;
  // inherited
  id!: string;
  category!: string;
  receiver!: IContributor;
  state!: InAppNotificationState;
  triggeredAt!: Date;
}
