import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InheritedCredentialRuleSetService } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.service';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { Injectable } from '@nestjs/common';
import { VisualAuthorizationService } from '../visual/visual.service.authorization';
import { ProfileService } from './profile.service';

@Injectable()
export class ProfileAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private inheritedCredentialRuleSetService: InheritedCredentialRuleSetService,
    private visualAuthorizationService: VisualAuthorizationService,
    private storageBucketAuthorizationService: StorageBucketAuthorizationService,
    private profileService: ProfileService
  ) {}

  async applyAuthorizationPolicy(
    profileID: string,
    parentAuthorization: IAuthorizationPolicy | undefined,
    credentialRulesFromParent: IAuthorizationPolicyRuleCredential[] = []
  ): Promise<IAuthorizationPolicy[]> {
    const profile = await this.profileService.getProfileOrFail(profileID, {
      loadEagerRelations: false,
      relations: {
        authorization: true,
        references: { authorization: true },
        tagsets: { authorization: true },
        visuals: { authorization: true },
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
        authorization:
          this.authorizationPolicyService.authorizationSelectOptions,
        references: {
          id: true,
          authorization:
            this.authorizationPolicyService.authorizationSelectOptions,
        },
        tagsets: {
          id: true,
          authorization:
            this.authorizationPolicyService.authorizationSelectOptions,
        },
        visuals: {
          id: true,
          authorization:
            this.authorizationPolicyService.authorizationSelectOptions,
        },
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
      },
    });
    if (
      !profile.references ||
      !profile.tagsets ||
      !profile.authorization ||
      !profile.visuals ||
      !profile.storageBucket
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

    await this.inheritedCredentialRuleSetService.resolveForParent(
      profile.authorization
    );

    for (const reference of profile.references) {
      reference.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          reference.authorization,
          profile.authorization
        );
      updatedAuthorizations.push(reference.authorization);
    }

    for (const tagset of profile.tagsets) {
      tagset.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          tagset.authorization,
          profile.authorization
        );
      updatedAuthorizations.push(tagset.authorization);
    }

    for (const visual of profile.visuals) {
      visual.authorization =
        this.visualAuthorizationService.applyAuthorizationPolicy(
          visual,
          profile.authorization
        );
      updatedAuthorizations.push(visual.authorization);
    }

    const storageBucketAuthorizations =
      await this.storageBucketAuthorizationService.applyAuthorizationPolicy(
        profile.storageBucket,
        profile.authorization
      );
    updatedAuthorizations.push(...storageBucketAuthorizations);

    return updatedAuthorizations;
  }
}
