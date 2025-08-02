import { Field, ObjectType } from '@nestjs/graphql';
import { IUser } from '@domain/community/user/user.interface';

@ObjectType()
export class NotificationRecipientResult {
  @Field(() => [IUser], {
    nullable: false,
    description: 'The email recipients for the notification.',
  })
  emailRecipients!: IUser[];

  @Field(() => [IUser], {
    nullable: false,
    description: 'The in-app recipients for the notification.',
  })
  inAppRecipients!: IUser[];
}
