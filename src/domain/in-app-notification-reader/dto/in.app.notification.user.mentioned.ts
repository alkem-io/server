import { Field, ObjectType } from '@nestjs/graphql';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotification } from './in.app.notification.interface';
import { NotificationEventType } from '@alkemio/notifications-lib';

@ObjectType('InAppNotificationUserMentioned', {
  implements: () => InAppNotification,
})
export class InAppNotificationUserMentioned extends InAppNotification {
  type!: NotificationEventType.COMMUNICATION_USER_MENTION;
  // the receiver is the mentioned Contributor
  @Field(() => CommunityContributorType, {
    nullable: false,
    description: 'The type of the Contributor that joined the Community.',
  })
  contributorType!: CommunityContributorType;
  // overwrite the description
  @Field(() => IContributor, {
    nullable: false,
    description: 'The contributor that mentioned the receiver.',
  })
  triggeredBy!: IContributor;
}
