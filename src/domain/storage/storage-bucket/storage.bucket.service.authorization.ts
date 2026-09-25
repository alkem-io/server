import {
  POLICY_RULE_PLATFORM_DELETE,
  POLICY_RULE_STORAGE_BUCKET_CONTRIBUTOR_FILE_UPLOAD,
  POLICY_RULE_STORAGE_BUCKET_UPDATER_FILE_UPLOAD,
} from '@common/constants';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { DocumentAuthorizationService } from '../document/document.service.authorization';
import { IStorageBucket } from './storage.bucket.interface';

@Injectable()
export class StorageBucketAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private documentAuthorizationService: DocumentAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    storageBucket: IStorageBucket,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    if (!storageBucket.documents) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to reset auth for StorageBucket ${storageBucket.id} `,
        LogContext.STORAGE_BUCKET
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Derived from the bucket so no caller has to remember to ask for it.
    // See DocumentAuthorizationService.applyAuthorizationPolicy.
    const appendDocumentCreatorRule =
      storageBucket.storageAggregator?.type !==
      StorageAggregatorType.CONVERSATION;

    // Ensure always applying from a clean state
    storageBucket.authorization = this.authorizationPolicyService.reset(
      storageBucket.authorization
    );
    storageBucket.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        storageBucket.authorization,
        parentAuthorization
      );

    storageBucket.authorization = this.appendPrivilegeRules(
      storageBucket.authorization
    );

    updatedAuthorizations.push(storageBucket.authorization);

    // Cascade down
    for (const document of storageBucket.documents) {
      // Internal Yjs content snapshots (memo/whiteboard, written via
      // FileServiceAdapter.createSnapshotInBucket) are NULL-authz — their
      // access is governed by the owning memo/whiteboard, not a per-file
      // authorization policy. They live in the bucket purely for quota
      // accounting, so there is nothing to reset; skip them in the cascade.
      //
      // The test is NULL-authz (the same property DocumentService
      // .isUserFacingDocument keys on), NOT "has no tagset". Tagset-less is too
      // broad in both directions: a conversation attachment's own policy MUST
      // be reset+re-inherited here — that is what revokes a departing member's
      // READ, re-run on every membership change — and skipping such rows left
      // the stale policy in place, so a removed member kept access. It also
      // swallowed the "tagset relation not loaded" case that
      // DocumentAuthorizationService deliberately throws on, which would let a
      // caller that forgot `relations: { documents: { tagset: true } }` leave
      // every document's tagset policy stale platform-wide, silently.
      if (!document.authorization) {
        continue;
      }
      const documentAuthorizations =
        await this.documentAuthorizationService.applyAuthorizationPolicy(
          document,
          storageBucket.authorization,
          appendDocumentCreatorRule
        );
      updatedAuthorizations.push(...documentAuthorizations);
    }

    await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    return [];
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.FILE_UPLOAD],
      AuthorizationPrivilege.UPDATE,
      POLICY_RULE_STORAGE_BUCKET_UPDATER_FILE_UPLOAD
    );
    privilegeRules.push(createPrivilege);

    const fileUploadPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.FILE_UPLOAD],
      AuthorizationPrivilege.CONTRIBUTE,
      POLICY_RULE_STORAGE_BUCKET_CONTRIBUTOR_FILE_UPLOAD
    );
    privilegeRules.push(fileUploadPrivilege);

    const deletePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.FILE_DELETE],
      AuthorizationPrivilege.DELETE,
      POLICY_RULE_PLATFORM_DELETE
    );
    privilegeRules.push(deletePrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
