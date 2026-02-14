import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { eq } from 'drizzle-orm';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { calloutFramings } from '@domain/collaboration/callout-framing/callout.framing.schema';
import { calloutContributions } from '@domain/collaboration/callout-contribution/callout.contribution.schema';
import { DeleteWhiteboardInput } from './dto/whiteboard.dto.delete';
import {
  UpdateWhiteboardGuestAccessInput,
  UpdateWhiteboardGuestAccessResult,
} from './dto/whiteboard.dto.guest-access.toggle';
import { UpdateWhiteboardEntityInput } from './types';
import { WhiteboardGuestAccessService } from './whiteboard.guest-access.service';
import { IWhiteboard } from './whiteboard.interface';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardAuthorizationService } from './whiteboard.service.authorization';
import { whiteboards } from './whiteboard.schema';

@InstrumentResolver()
@Resolver(() => IWhiteboard)
export class WhiteboardResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private whiteboardService: WhiteboardService,
    private whiteboardAuthService: WhiteboardAuthorizationService,
    private whiteboardGuestAccessService: WhiteboardGuestAccessService,
    private communityResolverService: CommunityResolverService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
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
  }

  private async getSpaceSettingsForWhiteboard(
    whiteboardId: string
  ): Promise<ISpaceSettings | undefined> {
    try {
      const community =
        await this.communityResolverService.getCommunityFromWhiteboardOrFail(
          whiteboardId
        );
      const space =
        await this.communityResolverService.getSpaceForCommunityOrFail(
          community.id
        );
      return space.settings;
    } catch (error) {
      this.logger.warn?.(
        `Failed to resolve space settings for whiteboard ${whiteboardId}`,
        error
      );
      return undefined;
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
      const spaceSettings = await this.getSpaceSettingsForWhiteboard(
        whiteboard.id
      );

      const framing = await this.db.query.calloutFramings.findFirst({
        where: eq(calloutFramings.whiteboardId, whiteboard.id),
        with: {
          authorization: true,
        },
      });

      if (framing && framing.authorization) {
        const updatedWhiteboardAuthorizations =
          await this.whiteboardAuthService.applyAuthorizationPolicy(
            whiteboard.id,
            framing.authorization as any,
            spaceSettings
          );
        await this.authorizationPolicyService.saveAll(
          updatedWhiteboardAuthorizations
        );
      } else {
        const contribution = await this.db.query.calloutContributions.findFirst(
          {
            where: eq(calloutContributions.whiteboardId, whiteboard.id),
            with: {
              authorization: true,
            },
          }
        );
        if (contribution && contribution.authorization) {
          const contributionAuthorizations =
            await this.whiteboardAuthService.applyAuthorizationPolicy(
              whiteboard.id,
              contribution.authorization as any,
              spaceSettings
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
}
