import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IMessage } from './message.interface';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';

@Resolver(() => IMessage)
export class MessageResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    private userLookupService: UserLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService
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
        sender =
          await this.virtualContributorLookupService.getVirtualContributorOrFail(
            senderID,
            contributorOptions
          );
      }

      return sender;
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          {
            message: 'Sender unable to be resolved when resolving message.',
            senderId: senderID,
            messageId: message.id,
          },
          LogContext.COMMUNICATION
        );
        return null;
      } else {
        throw e;
      }
    }
  }
}
