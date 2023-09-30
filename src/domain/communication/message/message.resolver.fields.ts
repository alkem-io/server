import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IMessage } from './message.interface';
import { LogContext } from '@common/enums/logging.context';
import { IUser } from '@domain/community/user';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserLookupService } from '@services/infrastructure/user-lookup/user.lookup.service';

@Resolver(() => IMessage)
export class MessageResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private userLookupService: UserLookupService
  ) {}

  @ResolveField('sender', () => IUser, {
    nullable: true,
    description: 'The user that created this Post',
  })
  async sender(@Parent() message: IMessage): Promise<IUser | null> {
    const sender = message.sender;
    if (!sender) {
      return null;
    }

    try {
      return await this.userLookupService.getUserByUUID(sender);
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          `sender '${sender}' unable to be resolved when resolving message '${message.id}'`,
          LogContext.COMMUNICATION
        );
        return null;
      } else {
        throw e;
      }
    }
  }
}
