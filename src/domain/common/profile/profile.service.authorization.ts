import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { Injectable } from '@nestjs/common';
import { VisualAuthorizationService } from '../visual/visual.service.authorization';
import { ProfileService } from './profile.service';

@Injectable()
export class ProfileAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private visualAuthorizationService: VisualAuthorizationService,
    private storageBucketAuthorizationService: StorageBucketAuthorizationService,
    private profileService: ProfileService
  ) {}

  async applyAuthorizationPolicy(
    profileID: string,
    parentAuthorization: IAuthorizationPolicy | undefined,
    credentialRulesFromParent: IAuthorizationPolicyRuleCredential[] = []
  ): Promise<IAuthorizationPolicy[]> {
    const authSelect =
      this.authorizationPolicyService.authorizationSelectOptions;

    // Query 1: Profile + its own authorization
    const profile = await this.profileService.getProfileOrFail(profileID, {
      loadEagerRelations: false,
      relations: { authorization: true },
      select: { id: true, authorization: authSelect },
    });

    if (!profile.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Profile with entities at start of auth reset: ${profileID} `,
        LogContext.ACCOUNT
      );
    }

    // Query 2: Shallow children — references, tagsets, visuals with authorization
    const profileWithChildren =
      await this.profileService.getProfileOrFail(profileID, {
        loadEagerRelations: false,
        relations: {
          references: { authorization: true },
          tagsets: { authorization: true },
          visuals: { authorization: true },
        },
        select: {
          id: true,
          references: { id: true, authorization: authSelect },
          tagsets: { id: true, authorization: authSelect },
          visuals: { id: true, authorization: authSelect },
        },
      });

    // Query 3: Deep children — storageBucket + documents + document.tagset with authorization
    const profileWithStorage =
      await this.profileService.getProfileOrFail(profileID, {
        loadEagerRelations: false,
        relations: {
          storageBucket: {
            authorization: true,
            documents: {
              authorization: true,
              tagset: { authorization: true },
            },
          },
        },
        select: {
          id: true,
          storageBucket: {
            id: true,
            authorization: authSelect,
            documents: {
              id: true,
              authorization: authSelect,
              tagset: { id: true, authorization: authSelect },
            },
          },
        },
      });

    if (
      !profileWithChildren.references ||
      !profileWithChildren.tagsets ||
      !profileWithChildren.visuals ||
      !profileWithStorage.storageBucket
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Profile with entities at start of auth reset: ${profileID} `,
        LogContext.ACCOUNT
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit from the parent
    profile.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        profile.authorization,
        parentAuthorization
      );
    profile.authorization.credentialRules.push(...credentialRulesFromParent);

    updatedAuthorizations.push(profile.authorization);

    for (const reference of profileWithChildren.references) {
      reference.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          reference.authorization,
          profile.authorization
        );
      updatedAuthorizations.push(reference.authorization);
    }

    for (const tagset of profileWithChildren.tagsets) {
      tagset.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          tagset.authorization,
          profile.authorization
        );
      updatedAuthorizations.push(tagset.authorization);
    }

    for (const visual of profileWithChildren.visuals) {
      visual.authorization =
        this.visualAuthorizationService.applyAuthorizationPolicy(
          visual,
          profile.authorization
        );
      updatedAuthorizations.push(visual.authorization);
    }

    const storageBucketAuthorizations =
      await this.storageBucketAuthorizationService.applyAuthorizationPolicy(
        profileWithStorage.storageBucket,
        profile.authorization
      );
    updatedAuthorizations.push(...storageBucketAuthorizations);

    return updatedAuthorizations;
  }
}
