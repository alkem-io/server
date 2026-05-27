import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { VisualAuthorizationService } from '../visual/visual.service.authorization';
import { ProfileService } from './profile.service';

@Injectable()
export class ProfileAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private visualAuthorizationService: VisualAuthorizationService,
    private storageBucketAuthorizationService: StorageBucketAuthorizationService,
    private profileService: ProfileService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async applyAuthorizationPolicy(
    profileID: string,
    parentAuthorization: IAuthorizationPolicy | undefined,
    credentialRulesFromParent: IAuthorizationPolicyRuleCredential[] = []
  ): Promise<IAuthorizationPolicy[]> {
    // [DIAG-credrules] temporary diagnostic — remove after root-cause.
    this.logger.error(
      `[DIAG-credrules] profile.apply ENTER: profileID=${profileID}, parentAuthId=${parentAuthorization?.id ?? 'undefined'}, parentRules=${parentAuthorization?.credentialRules?.length ?? 'undefined'}, parentCascading=${parentAuthorization?.credentialRules?.filter(r => r.cascade).length ?? 'undefined'}, credentialRulesFromParent=${credentialRulesFromParent.length}`,
      undefined,
      LogContext.AUTH
    );
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
    // [DIAG-credrules] after load — verify relations + current auth state.
    this.logger.error(
      `[DIAG-credrules] profile.apply LOADED: profileID=${profileID}, authId=${profile.authorization?.id ?? 'undefined'}, authRules=${profile.authorization?.credentialRules?.length ?? 'undefined'}, refs=${profile.references?.length ?? 'undefined'}, tagsets=${profile.tagsets?.length ?? 'undefined'}, visuals=${profile.visuals?.length ?? 'undefined'}, storageBucket=${profile.storageBucket?.id ?? 'undefined'}`,
      undefined,
      LogContext.AUTH
    );
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

    // [DIAG-credrules] after inheritance — what credentialRules ended up on
    // the profile's in-memory authorization just before push.
    this.logger.error(
      `[DIAG-credrules] profile.apply INHERITED: profileID=${profileID}, authId=${profile.authorization.id}, rulesAfterInherit=${profile.authorization.credentialRules.length}`,
      undefined,
      LogContext.AUTH
    );

    updatedAuthorizations.push(profile.authorization);

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

    // [DIAG-credrules] before return — final state of profile's auth.
    this.logger.error(
      `[DIAG-credrules] profile.apply RETURN: profileID=${profileID}, authId=${profile.authorization.id}, finalRules=${profile.authorization.credentialRules.length}, returnedCount=${updatedAuthorizations.length}`,
      undefined,
      LogContext.AUTH
    );

    return updatedAuthorizations;
  }
}
