import { CurrentActor } from '@common/decorators';
import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { IVisual } from '@domain/common/visual';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter/contribution.reporter.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { IAuthorizationPolicy } from '../authorization-policy';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { VisualAuthorizationService } from '../visual/visual.service.authorization';
import { AddVisualToMediaGalleryInput } from './dto/media.gallery.dto.add.visual';
import { DeleteVisualFromMediaGalleryInput } from './dto/media.gallery.dto.delete.visual';
import { MediaGalleryService } from './media.gallery.service';

@InstrumentResolver()
@Resolver()
export class MediaGalleryResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private visualAuthorizationService: VisualAuthorizationService,
    private mediaGalleryService: MediaGalleryService,
    private contributionReporterService: ContributionReporterService,
    private communityResolverService: CommunityResolverService,
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Mutation(() => IVisual, {
    description: 'Adds a new visual to the specified media gallery.',
  })
  async addVisualToMediaGallery(
    @CurrentActor() actorContext: ActorContext,
    @Args('addData') addData: AddVisualToMediaGalleryInput
  ): Promise<IVisual> {
    const mediaGallery = await this.mediaGalleryService.getMediaGalleryOrFail(
      addData.mediaGalleryID,
      {
        relations: { authorization: true },
      }
    );

    await this.authorizationService.grantAccessOrFail(
      actorContext,
      mediaGallery.authorization,
      AuthorizationPrivilege.UPDATE,
      `add visual to media gallery: ${mediaGallery.id}`
    );

    const visual = await this.mediaGalleryService.addVisualToMediaGallery(
      addData.mediaGalleryID,
      addData.visualType,
      addData.sortOrder
    );

    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    visual.authorization =
      this.visualAuthorizationService.applyAuthorizationPolicy(
        visual,
        mediaGallery.authorization
      );

    updatedAuthorizations.push(visual.authorization);

    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    void this.reportMediaGalleryContribution(addData.mediaGalleryID, actorContext);

    return visual;
  }

  private async reportMediaGalleryContribution(
    mediaGalleryID: string,
    actorContext: ActorContext
  ): Promise<void> {
    try {
      const levelZeroSpaceID =
        await this.communityResolverService.getLevelZeroSpaceIdForMediaGallery(
          mediaGalleryID
        );

      const calloutFraming = await this.entityManager.findOne(CalloutFraming, {
        where: { mediaGallery: { id: mediaGalleryID } },
        relations: { profile: true },
      });

      const displayName = calloutFraming?.profile?.displayName
        ? `Media Gallery of ${calloutFraming.profile.displayName}`
        : 'Media Gallery';

      this.contributionReporterService.mediaGalleryContribution(
        {
          id: mediaGalleryID,
          name: displayName,
          space: levelZeroSpaceID,
        },
        actorContext
      );
    } catch (error: unknown) {
      this.logger.error?.(
        'Failed to report media gallery contribution',
        error instanceof Error ? error.stack : undefined,
        LogContext.CONTRIBUTION_REPORTER
      );
    }
  }

  @Mutation(() => IVisual, {
    description: 'Deletes a visual from the specified media gallery.',
  })
  async deleteVisualFromMediaGallery(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteVisualFromMediaGalleryInput
  ): Promise<IVisual> {
    const mediaGallery = await this.mediaGalleryService.getMediaGalleryOrFail(
      deleteData.mediaGalleryID,
      {
        relations: { authorization: true },
      }
    );

    await this.authorizationService.grantAccessOrFail(
      actorContext,
      mediaGallery.authorization,
      AuthorizationPrivilege.UPDATE,
      `delete visual from media gallery: ${mediaGallery.id}`
    );

    return await this.mediaGalleryService.deleteVisualFromMediaGallery(
      deleteData.mediaGalleryID,
      deleteData.visualID
    );
  }
}
