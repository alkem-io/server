import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
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
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => UpdateWhiteboardGuestAccessResult, {
    description:
      'Grants or revokes GLOBAL_GUEST permissions for a whiteboard using a single toggle.',
  })
  async updateWhiteboardGuestAccess(
    @CurrentActor() actorContext: ActorContext,
    @Args('input') input: UpdateWhiteboardGuestAccessInput
  ): Promise<UpdateWhiteboardGuestAccessResult> {
    const whiteboard =
      await this.whiteboardGuestAccessService.updateGuestAccess(
        actorContext,
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
    @CurrentActor() actorContext: ActorContext,
    @Args('whiteboardData') whiteboardData: UpdateWhiteboardEntityInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    const originalContentPolicy = whiteboard.contentUpdatePolicy;
    this.authorizationService.grantAccessOrFail(
      actorContext,
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
            framing.authorization,
            spaceSettings
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
              contribution.authorization,
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
    @CurrentActor() actorContext: ActorContext,
    @Args('whiteboardData') whiteboardData: DeleteWhiteboardInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      whiteboard.authorization,
      AuthorizationPrivilege.DELETE,
      `delete Whiteboard: ${whiteboard.id}`
    );

    return await this.whiteboardService.deleteWhiteboard(whiteboard.id);
  }
}
