import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IMessage } from './message.interface';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';

@Resolver(() => IMessage)
export class MessageResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    private contributorLookupService: ContributorLookupService
  ) {}

  @ResolveField('sender', () => IContributor, {
    nullable: true,
    description: 'The User or Virtual Contributor that created this Message',
  })
  async sender(
    @Parent() message: IMessage
  ): Promise<IContributor | null | never> {
    // sender contains the agent ID (actorId from the communication adapter)
    const senderAgentId = message.sender;
    if (!senderAgentId) {
      return null;
    }

    try {
      const sender =
        await this.contributorLookupService.getContributorByAgentId(
          senderAgentId,
          { relations: { profile: true } }
        );

      return sender;
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          {
            message: 'Sender unable to be resolved when resolving message.',
            senderAgentId,
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
