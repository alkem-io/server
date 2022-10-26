import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IMessage } from './message.interface';
import { LogContext } from '@common/enums/logging.context';
import { UserService } from '@domain/community/user/user.service';
import { UUID } from '@domain/common/scalars';

@Resolver(() => IMessage)
export class MessageResolverFields {
  constructor(private userService: UserService) {}

  @ResolveField('sender', () => UUID, {
    nullable: false,
    description: 'The user that created this Aspect',
  })
  async sender(@Parent() message: IMessage): Promise<string> {
    const sender = message.sender;
    if (!sender) {
      throw new EntityNotInitializedException(
        'Sender not defined on message',
        LogContext.COMMUNITY
      );
    }
    const user = await this.userService.getUserOrFail(sender);
    return user.id;
  }
}
