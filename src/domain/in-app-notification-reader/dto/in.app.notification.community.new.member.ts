import { Field, ObjectType } from '@nestjs/graphql';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { ICommunity } from '@domain/community/community';
import { InAppNotification } from '../in.app.notification.interface';
import { InAppNotificationBase } from './in.app.notification.base';
import { ISpace } from '@domain/space/space/space.interface';

@ObjectType('InAppNotificationCommunityNewMember', {
  implements: () => InAppNotification,
})
// todo: implement InAppNotificationBase
export class InAppNotificationCommunityNewMember extends InAppNotificationBase {
  type!: NotificationEventType.COMMUNITY_NEW_MEMBER;
  // overwrite the description
  @Field(() => IContributor, {
    nullable: true,
    description: 'The Contributor that added the Contributor in.',
  })
  triggeredBy?: IContributor;

  @Field(() => CommunityContributorType, {
    nullable: false,
    description: 'The type of the Contributor that joined.',
  })
  contributorType!: CommunityContributorType;

  @Field(() => IContributor, {
    nullable: true,
    description: 'The Contributor that joined.',
  })
  actor?: IContributor;

  @Field(() => ISpace, {
    nullable: false,
    description: 'The Space that was joined.',
  })
  space!: ISpace;
}
