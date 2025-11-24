import { Inject, LoggerService } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { PollService } from './poll.service';
import { IPoll } from './poll.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdatePollEntityInput } from './dto/poll.dto.update.entity';
import { DeletePollInput } from './dto/poll.dto.delete';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { PollAuthorizationService } from './poll.service.authorization';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver(() => IPoll)
export class PollResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private pollService: PollService,
    private pollAuthService: PollAuthorizationService,
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IPoll, {
    description: 'Updates the specified Poll.',
  })
  async updatePoll(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('pollData') pollData: UpdatePollEntityInput
  ): Promise<IPoll> {
    const poll = await this.pollService.getPollOrFail(
      pollData.ID
    );
    const originalContentPolicy = poll.contentUpdatePolicy;
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      poll.authorization,
      AuthorizationPrivilege.UPDATE,
      `update Poll: ${poll.id}`
    );

    const updatedPoll = await this.pollService.updatePoll(
      poll,
      pollData
    );
    if (updatedPoll.contentUpdatePolicy !== originalContentPolicy) {
      const framing = await this.entityManager.findOne(CalloutFraming, {
        where: {
          poll: { id: poll.id },
        } as any,
        relations: {
          authorization: true,
        },
      });

      if (framing) {
        const updatedPollAuthorizations =
          await this.pollAuthService.applyAuthorizationPolicy(
            poll.id,
            framing.authorization
          );
        await this.authorizationPolicyService.saveAll(
          updatedPollAuthorizations
        );
      } else {
        const contribution = await this.entityManager.findOne(
          CalloutContribution,
          {
            where: {
              poll: { id: poll.id },
            } as any,
            relations: {
              authorization: true,
            },
          }
        );
        if (contribution) {
          const contributionAuthorizations =
            await this.pollAuthService.applyAuthorizationPolicy(
              poll.id,
              contribution.authorization
            );
          await this.authorizationPolicyService.saveAll(
            contributionAuthorizations
          );
        }
      }
    }
    return await this.pollService.getPollOrFail(
      updatedPoll.id
    );
  }

  @Mutation(() => IPoll, {
    description: 'Deletes the specified Poll.',
  })
  async deletePoll(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('pollData') pollData: DeletePollInput
  ): Promise<IPoll> {
    const poll = await this.pollService.getPollOrFail(
      pollData.ID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      poll.authorization,
      AuthorizationPrivilege.DELETE,
      `delete Poll: ${poll.id}`
    );

    return await this.pollService.deletePoll(poll.id);
  }
}
