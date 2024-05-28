import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IMessage } from './message.interface';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserLookupService } from '@services/infrastructure/user-lookup/user.lookup.service';
import { VirtualContributor } from '@domain/community/virtual-contributor';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IContributor } from '@domain/community/contributor/contributor.interface';

@Resolver(() => IMessage)
export class MessageResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private userLookupService: UserLookupService,
    @InjectRepository(VirtualContributor)
    private virtualContributorRepository: Repository<VirtualContributor>
  ) {}

  @ResolveField('sender', () => IContributor, {
    nullable: true,
    description: 'The User or Virtual Contributor that created this Message',
  })
  async sender(
    @Parent() message: IMessage
  ): Promise<IContributor | null | never> {
    const senderID = message.sender;
    if (!senderID) {
      return null;
    }

    const contributorOptions = {
      where: {
        id: senderID,
      },
      relations: {
        profile: true,
      },
    };
    try {
      let sender: IContributor | null =
        await this.userLookupService.getUserByUUID(
          senderID,
          contributorOptions
        );
      if (!sender) {
        sender = await this.virtualContributorRepository.findOne(
          contributorOptions
        );
      }

      return sender;
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          `sender '${senderID}' unable to be resolved when resolving message '${message.id}'`,
          LogContext.COMMUNICATION
        );
        return null;
      } else {
        throw e;
      }
    }
  }
}
