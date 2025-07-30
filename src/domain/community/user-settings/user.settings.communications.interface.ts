import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsCommunication')
export abstract class IUserSettingsCommunication {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Allow Users to send messages to this User.',
  })
  allowOtherUsersToSendMessages!: boolean;
}
