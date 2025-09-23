import {
  Resolver,
  ResolveField,
  Parent,
  ObjectType,
  Field,
} from '@nestjs/graphql';
import { InAppNotificationPayloadPlatformForumDiscussion } from '@platform/in-app-notification-payload/dto/platform/notification.in.app.payload.platform.forum.discussion';

@ObjectType('DiscussionDetails')
class DiscussionDetails {
  @Field(() => String, {
    description: 'The discussion ID.',
  })
  id!: string;

  @Field(() => String, {
    description: 'The discussion display name.',
  })
  displayName!: string;

  @Field(() => String, {
    nullable: true,
    description: 'The discussion content.',
  })
  description?: string | undefined;

  @Field(() => String, {
    nullable: true,
    description: 'The discussion category.',
  })
  category?: string | undefined;

  @Field(() => String, {
    description: 'The discussion URL.',
  })
  url!: string;
}

@Resolver(() => InAppNotificationPayloadPlatformForumDiscussion)
export class InAppNotificationPayloadPlatformForumDiscussionResolverFields {
  @ResolveField(() => DiscussionDetails, {
    nullable: true,
    description: 'The discussion details.',
  })
  public discussion(
    @Parent()
    payload: InAppNotificationPayloadPlatformForumDiscussion
  ): DiscussionDetails | undefined {
    return payload.discussion;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'The comment message.',
  })
  public comment(
    @Parent()
    payload: InAppNotificationPayloadPlatformForumDiscussion
  ): string | undefined {
    return payload.comment?.message;
  }
}
