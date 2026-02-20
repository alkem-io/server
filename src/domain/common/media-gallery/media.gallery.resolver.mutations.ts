import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IVisual } from '@domain/common/visual';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
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
    private mediaGalleryService: MediaGalleryService
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

    return visual;
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
