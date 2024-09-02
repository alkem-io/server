import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WhiteboardService } from './whiteboard.service';
import { IWhiteboard } from './whiteboard.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  UpdateWhiteboardContentInput,
  UpdateWhiteboardEntityInput,
} from './types';
import { DeleteWhiteboardInput } from './dto/whiteboard.dto.delete';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { WhiteboardAuthorizationService } from './whiteboard.service.authorization';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';

@Resolver(() => IWhiteboard)
export class WhiteboardResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private whiteboardService: WhiteboardService,
    private whiteboardAuthService: WhiteboardAuthorizationService,
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboard, {
    description: 'Updates the specified Whiteboard.',
  })
  async updateWhiteboard(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: UpdateWhiteboardEntityInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    const originalContentPolicy = whiteboard.contentUpdatePolicy;
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.UPDATE,
      `update Whiteboard: ${whiteboard.id}`
    );

    const updatedWhiteboard = await this.whiteboardService.updateWhiteboard(
      whiteboard,
      whiteboardData
    );
    if (updatedWhiteboard.contentUpdatePolicy !== originalContentPolicy) {
      const framing = await this.entityManager.findOne(CalloutFraming, {
        where: {
          whiteboard: { id: whiteboard.id },
        },
        relations: {
          authorization: true,
        },
      });

      if (framing) {
        const updatedWhiteboardAuthorizations =
          await this.whiteboardAuthService.applyAuthorizationPolicy(
            whiteboard.id,
            framing.authorization
          );
        await this.authorizationPolicyService.saveAll(
          updatedWhiteboardAuthorizations
        );
      } else {
        const contribution = await this.entityManager.findOne(
          CalloutContribution,
          {
            where: {
              whiteboard: { id: whiteboard.id },
            },
            relations: {
              authorization: true,
            },
          }
        );
        if (contribution) {
          const contributionAuthorizations =
            await this.whiteboardAuthService.applyAuthorizationPolicy(
              whiteboard.id,
              contribution.authorization
            );
          await this.authorizationPolicyService.saveAll(
            contributionAuthorizations
          );
        }
      }
    }
    return await this.whiteboardService.getWhiteboardOrFail(
      updatedWhiteboard.id
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboard, {
    description: 'Updates the specified Whiteboard content.',
  })
  async updateWhiteboardContent(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: UpdateWhiteboardContentInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.UPDATE_CONTENT,
      `update content of Whiteboard: ${whiteboard.id}`
    );
    return this.whiteboardService.updateWhiteboardContent(
      whiteboard,
      whiteboardData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboard, {
    description: 'Deletes the specified Whiteboard.',
  })
  async deleteWhiteboard(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: DeleteWhiteboardInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.DELETE,
      `delete Whiteboard: ${whiteboard.id}`
    );

    return await this.whiteboardService.deleteWhiteboard(whiteboard.id);
  }
}
