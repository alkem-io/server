import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IDocument } from './document.interface';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_DOCUMENT_CREATED_BY } from '@common/constants/authorization/credential.rule.constants';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { POLICY_RULE_READ_ABOUT } from '@common/constants/authorization/policy.rule.constants';
@Injectable()
export class DocumentAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  public async applyAuthorizationPolicy(
    document: IDocument,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    if (!document.tagset || !document.tagset.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to find entities required to reset auth for Document ${document.id} `,
        LogContext.STORAGE_BUCKET
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    document.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        document.authorization,
        parentAuthorization
      );
    // If can READ_ABOUT on Document, then also allow general READ
    document.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping(
        document.authorization,
        AuthorizationPrivilege.READ_ABOUT,
        [AuthorizationPrivilege.READ],
        POLICY_RULE_READ_ABOUT
      );

    // Extend to give the user creating the document more rights
    document.authorization = this.appendCredentialRules(document);
    updatedAuthorizations.push(document.authorization);

    document.tagset.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        document.tagset.authorization,
        document.authorization
      );
    updatedAuthorizations.push(document.tagset.authorization);

    await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    return [];
  }

  private appendCredentialRules(document: IDocument): IAuthorizationPolicy {
    const authorization = document.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Document: ${document.id}`,
        LogContext.STORAGE_ACCESS
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const manageCreatedDocumentPolicy =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: document.createdBy,
          },
        ],
        CREDENTIAL_RULE_DOCUMENT_CREATED_BY
      );
    newRules.push(manageCreatedDocumentPolicy);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
