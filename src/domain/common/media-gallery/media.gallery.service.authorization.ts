import { CREDENTIAL_RULE_MEDIA_GALLERY_CREATED_BY } from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { Injectable } from '@nestjs/common';
import { VisualAuthorizationService } from '../visual/visual.service.authorization';
import { IMediaGallery } from './media.gallery.interface';
import { MediaGalleryService } from './media.gallery.service';

@Injectable()
export class MediaGalleryAuthorizationService {
  constructor(
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly mediaGalleryService: MediaGalleryService,
    private readonly storageBucketAuthorizationService: StorageBucketAuthorizationService,
    private readonly visualAuthorizationService: VisualAuthorizationService
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
          visuals: {
            authorization: true,
          },
          storageBucket: {
            authorization: true,
            documents: {
              authorization: true,
              tagset: {
                authorization: true,
              },
            },
          },
        },
        select: {
          id: true,
          createdBy: true,
          authorization:
            this.authorizationPolicyService.authorizationSelectOptions,
          storageBucket: {
            id: true,
            authorization:
              this.authorizationPolicyService.authorizationSelectOptions,
            documents: {
              id: true,
              authorization:
                this.authorizationPolicyService.authorizationSelectOptions,
              tagset: {
                id: true,
                authorization:
                  this.authorizationPolicyService.authorizationSelectOptions,
              },
            },
          },
          visuals: {
            id: true,
            authorization:
              this.authorizationPolicyService.authorizationSelectOptions,
          },
        },
      }
    );

    if (!mediaGallery.storageBucket) {
      throw new RelationshipNotFoundException(
        `Unable to load MediaGallery StorageBucket for auth reset: ${mediaGalleryID}`,
        LogContext.COLLABORATION
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    mediaGallery.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        mediaGallery.authorization,
        parentAuthorization
      );

    mediaGallery.authorization = this.appendCredentialRules(mediaGallery);
    updatedAuthorizations.push(mediaGallery.authorization);

    const storageBucketAuthorizationPolicies =
      await this.storageBucketAuthorizationService.applyAuthorizationPolicy(
        mediaGallery.storageBucket,
        mediaGallery.authorization
      );

    updatedAuthorizations.push(...storageBucketAuthorizationPolicies);

    for (const visual of mediaGallery.visuals ?? []) {
      visual.authorization =
        await this.visualAuthorizationService.applyAuthorizationPolicy(
          visual,
          mediaGallery.authorization
        );
      updatedAuthorizations.push(visual.authorization);
    }

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
