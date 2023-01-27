import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IMessage } from './message.interface';
import { LogContext } from '@common/enums/logging.context';
import { UserService } from '@domain/community/user/user.service';
import { IUser } from '@domain/community';

@Resolver(() => IMessage)
export class MessageResolverFields {
  constructor(private userService: UserService) {}

  @ResolveField('sender', () => IUser, {
    nullable: false,
    description: 'The user that created this Message',
  })
  async sender(@Parent() message: IMessage): Promise<IUser> {
    const sender = message.sender;
    if (!sender) {
      throw new EntityNotInitializedException(
        'Sender not defined on message',
        LogContext.COMMUNITY
      );
    }
    const user = await this.userService.getUserOrFail(sender);
    return user;
  }

  @ResolveField('date', () => Date, {
    nullable: false,
    description: 'The date that this message was sent',
  })
  async date(@Parent() message: IMessage): Promise<Date> {
    const timestamp = message.timestamp;
    if (!timestamp) {
      throw new EntityNotInitializedException(
        'Timestamp not defined on message',
        LogContext.COMMUNITY
      );
    }
    const date = new Date(timestamp);
    return date;
  }
}
