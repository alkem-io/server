import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IStorageBucket } from './storage.bucket.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { DocumentAuthorizationService } from '../document/document.service.authorization';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import {
  POLICY_RULE_STORAGE_BUCKET_UPDATER_FILE_UPLOAD,
  POLICY_RULE_PLATFORM_DELETE,
  POLICY_RULE_STORAGE_BUCKET_CONTRIBUTOR_FILE_UPLOAD,
  POLICY_RULE_READ_ABOUT,
} from '@common/constants';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

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

    storageBucket.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping(
        storageBucket.authorization,
        AuthorizationPrivilege.READ_ABOUT,
        [AuthorizationPrivilege.READ],
        POLICY_RULE_READ_ABOUT
      );
    updatedAuthorizations.push(storageBucket.authorization);

    // Cascade down
    for (const document of storageBucket.documents) {
      const documentAuthorizations =
        await this.documentAuthorizationService.applyAuthorizationPolicy(
          document,
          storageBucket.authorization
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
