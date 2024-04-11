import {
  createUnionType,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { IMessage } from './message.interface';
import { LogContext } from '@common/enums/logging.context';
import { IUser } from '@domain/community/user';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserLookupService } from '@services/infrastructure/user-lookup/user.lookup.service';
import {
  IVirtualContributor,
  VirtualContributor,
} from '@domain/community/virtual-contributor';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const ISenderUnionType = createUnionType({
  name: 'MessageSender',
  types: () => [IUser, IVirtualContributor],
  resolveType(value) {
    if ('email' in value) {
      return IUser;
    }
    return IVirtualContributor;
  },
});

@Resolver(() => IMessage)
export class MessageResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private userLookupService: UserLookupService,
    @InjectRepository(VirtualContributor)
    private virtualContributorRepository: Repository<VirtualContributor>
  ) {}

  @ResolveField('sender', () => ISenderUnionType, {
    nullable: true,
    description: 'The User or Virtual Contributor that created this Message',
  })
  async sender(
    @Parent() message: IMessage
  ): Promise<IUser | IVirtualContributor | null | never> {
    const { sender, senderType } = message;
    if (!sender || !senderType) {
      return null;
    }

    try {
      if (senderType === 'virtualContributor') {
        return await this.virtualContributorRepository.findOne({
          where: {
            id: sender,
          },
          relations: {
            profile: true,
          },
        });
      }
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
