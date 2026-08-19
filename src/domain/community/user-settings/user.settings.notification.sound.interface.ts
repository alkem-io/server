import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsNotificationSound')
export abstract class IUserSettingsNotificationSound {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Play a sound when a chat message is received. Default true.',
  })
  chatMessage!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Play a sound when a non-chat in-app notification is received. Default true.',
  })
  inAppNotification!: boolean;
}
