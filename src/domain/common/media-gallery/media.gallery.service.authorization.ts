import { Injectable } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_MEDIA_GALLERY_CREATED_BY } from '@common/constants';
import { IMediaGallery } from './media.gallery.interface';
import { MediaGalleryService } from './media.gallery.service';

@Injectable()
export class MediaGalleryAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private mediaGalleryService: MediaGalleryService
  ) {}

  async applyAuthorizationPolicy(
    mediaGalleryID: string,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const mediaGallery = await this.mediaGalleryService.getMediaGalleryOrFail(
      mediaGalleryID,
      {
        loadEagerRelations: false,
        relations: {
          authorization: true,
        },
        select: {
          id: true,
          createdBy: true,
          authorization:
            this.authorizationPolicyService.authorizationSelectOptions,
        },
      }
    );

    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    mediaGallery.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        mediaGallery.authorization,
        parentAuthorization
      );

    mediaGallery.authorization = this.appendCredentialRules(mediaGallery);
    updatedAuthorizations.push(mediaGallery.authorization);

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    mediaGallery: IMediaGallery
  ): IAuthorizationPolicy {
    const authorization = mediaGallery.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for MediaGallery: ${mediaGallery.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (mediaGallery.createdBy) {
      const manageMediaGalleryCreatedByPolicy =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.UPDATE, AuthorizationPrivilege.DELETE],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: mediaGallery.createdBy,
            },
          ],
          CREDENTIAL_RULE_MEDIA_GALLERY_CREATED_BY
        );
      newRules.push(manageMediaGalleryCreatedByPolicy);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }
}
