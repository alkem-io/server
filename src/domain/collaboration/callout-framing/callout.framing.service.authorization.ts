import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { MediaGalleryAuthorizationService } from '@domain/common/media-gallery/media.gallery.service.authorization';
import { MemoAuthorizationService } from '@domain/common/memo/memo.service.authorization';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { Injectable } from '@nestjs/common';
import { ICalloutFraming } from './callout.framing.interface';
import { CalloutFramingService } from './callout.framing.service';

@Injectable()
export class CalloutFramingAuthorizationService {
  constructor(
    private calloutFramingService: CalloutFramingService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService,
    private memoAuthorizationService: MemoAuthorizationService,
    private mediaGalleryAuthorizationService: MediaGalleryAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    calloutFramingInput: ICalloutFraming,
    parentAuthorization: IAuthorizationPolicy | undefined,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy[]> {
    const calloutFraming =
      await this.calloutFramingService.getCalloutFramingOrFail(
        calloutFramingInput.id,
        {
          loadEagerRelations: false,
          relations: {
            authorization: true,
            profile: true,
            whiteboard: true,
            memo: true,
            mediaGallery: {
              storageBucket: true,
            },
          },
          select: {
            id: true,
            authorization:
              this.authorizationPolicyService.authorizationSelectOptions,
            profile: {
              id: true,
            },
            whiteboard: {
              id: true,
            },
            memo: {
              id: true,
            },
            mediaGallery: {
              id: true,
              storageBucket: { id: true },
            },
          },
        }
      );

    if (!calloutFraming.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load Profile on calloutFraming:  ${calloutFraming.id} `,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    calloutFraming.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        calloutFraming.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(calloutFraming.authorization);

    const framingAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        calloutFraming.profile.id,
        calloutFraming.authorization
      );
    updatedAuthorizations.push(...framingAuthorizations);

    if (calloutFraming.whiteboard) {
      const whiteboardAuthorizations =
        await this.whiteboardAuthorizationService.applyAuthorizationPolicy(
          calloutFraming.whiteboard.id,
          calloutFraming.authorization,
          spaceSettings
        );
      updatedAuthorizations.push(...whiteboardAuthorizations);
    }

    if (calloutFraming.memo) {
      const memoAuthorizations =
        await this.memoAuthorizationService.applyAuthorizationPolicy(
          calloutFraming.memo.id,
          calloutFraming.authorization
        );
      updatedAuthorizations.push(...memoAuthorizations);
    }

    if (calloutFraming.mediaGallery) {
      const mediaGalleryAuthorizations =
        await this.mediaGalleryAuthorizationService.applyAuthorizationPolicy(
          calloutFraming.mediaGallery.id,
          calloutFraming.authorization
        );
      updatedAuthorizations.push(...mediaGalleryAuthorizations);
    }

    return updatedAuthorizations;
  }
}
