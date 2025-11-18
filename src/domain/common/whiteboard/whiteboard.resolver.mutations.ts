import { Inject, LoggerService } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WhiteboardService } from './whiteboard.service';
import { IWhiteboard } from './whiteboard.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateWhiteboardEntityInput } from './types';
import { DeleteWhiteboardInput } from './dto/whiteboard.dto.delete';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { WhiteboardAuthorizationService } from './whiteboard.service.authorization';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { InstrumentResolver } from '@src/apm/decorators';
import { WhiteboardGuestAccessService } from './whiteboard.guest-access.service';
import {
  UpdateWhiteboardGuestAccessInput,
  UpdateWhiteboardGuestAccessResult,
  WhiteboardGuestAccessError,
  WhiteboardGuestAccessErrorCode,
} from './dto/whiteboard.dto.guest-access.toggle';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ForbiddenAuthorizationPolicyException,
  ForbiddenException,
} from '@common/exceptions';

@InstrumentResolver()
@Resolver(() => IWhiteboard)
export class WhiteboardResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private whiteboardService: WhiteboardService,
    private whiteboardAuthService: WhiteboardAuthorizationService,
    private whiteboardGuestAccessService: WhiteboardGuestAccessService,
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => UpdateWhiteboardGuestAccessResult, {
    description:
      'Grants or revokes GLOBAL_GUEST permissions for a whiteboard using a single toggle.',
  })
  async updateWhiteboardGuestAccess(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('input') input: UpdateWhiteboardGuestAccessInput
  ): Promise<UpdateWhiteboardGuestAccessResult> {
    try {
      const whiteboard =
        await this.whiteboardGuestAccessService.updateGuestAccess(
          agentInfo,
          input.whiteboardId,
          input.guestAccessEnabled
        );

      return {
        success: true,
        whiteboard,
      };
    } catch (error) {
      const formattedError = this.buildGuestAccessError(error as Error);
      if (!formattedError) {
        throw error;
      }

      return {
        success: false,
        errors: [formattedError],
      };
    }
  }

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

  private buildGuestAccessError(
    error: Error
  ): WhiteboardGuestAccessError | null {
    if (error instanceof ForbiddenAuthorizationPolicyException) {
      return {
        code: WhiteboardGuestAccessErrorCode.NOT_AUTHORIZED,
        message: error.message,
      };
    }

    if (error instanceof ForbiddenException) {
      const message = error.message || 'Guest access toggle rejected.';
      const code = message.includes('Guest contributions are disabled')
        ? WhiteboardGuestAccessErrorCode.SPACE_GUEST_DISABLED
        : WhiteboardGuestAccessErrorCode.NOT_AUTHORIZED;

      return {
        code,
        message,
      };
    }

    if (
      error instanceof EntityNotFoundException ||
      error instanceof EntityNotInitializedException
    ) {
      return {
        code: WhiteboardGuestAccessErrorCode.WHITEBOARD_NOT_FOUND,
        message: error.message,
      };
    }

    return {
      code: WhiteboardGuestAccessErrorCode.UNKNOWN,
      message: error.message,
    };
  }
}
