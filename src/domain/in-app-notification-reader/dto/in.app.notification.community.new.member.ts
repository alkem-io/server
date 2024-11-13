import { Field, ObjectType } from '@nestjs/graphql';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { ICommunity } from '@domain/community/community';
import { InAppNotification } from './in.app.notification.interface';
import { NotificationEventType } from '@alkemio/notifications-lib';

@ObjectType('InAppNotificationCommunityNewMember', {
  implements: () => InAppNotification,
})
export class InAppNotificationCommunityNewMember extends InAppNotification {
  type!: NotificationEventType.COMMUNITY_NEW_MEMBER;
  // overwrite the description
  @Field(() => IContributor, {
    nullable: false,
    description: 'The Contributor that joined the Community.',
  })
  triggeredBy!: IContributor;

  @Field(() => CommunityContributorType, {
    nullable: false,
    description: 'The type of the Contributor that joined the Community.',
  })
  contributorType!: CommunityContributorType;

  @Field(() => ICommunity, {
    nullable: false,
    description: 'The community that was joined.',
  })
  community!: ICommunity;
}
