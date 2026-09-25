import { CREDENTIAL_RULE_DOCUMENT_CREATED_BY } from '@common/constants/authorization/credential.rule.constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Injectable } from '@nestjs/common';
import { IDocument } from './document.interface';
@Injectable()
export class DocumentAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  /**
   * `appendCreatorRule` (default TRUE) controls the `createdBy` self-management
   * rule. CONVERSATION attachments pass FALSE: their access derives solely from
   * the conversation policy, so appending it would re-grant
   * READ/UPDATE/DELETE to an uploader the membership cascade just removed.
   * Everywhere else the creator rule is the intended platform behaviour.
   */
  public async applyAuthorizationPolicy(
    document: IDocument,
    parentAuthorization: IAuthorizationPolicy | undefined,
    appendCreatorRule = true
  ): Promise<IAuthorizationPolicy[]> {
    // A loaded NULL tagset is valid for file-service rows. An undefined relation
    // or a loaded tagset without its policy cannot be safely cascaded.
    const tagset = document.tagset as ITagset | null | undefined;
    if (tagset === undefined) {
      throw new RelationshipNotFoundException(
        `Unable to find entities required to reset auth for Document ${document.id}: tagset relation not loaded`,
        LogContext.STORAGE_BUCKET
      );
    }
    if (tagset && !tagset.authorization) {
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

    // Extend to give the user creating the document more rights
    document.authorization = this.appendCredentialRules(
      document,
      appendCreatorRule
    );
    updatedAuthorizations.push(document.authorization);

    if (document.tagset?.authorization) {
      document.tagset.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          document.tagset.authorization,
          document.authorization
        );
      updatedAuthorizations.push(document.tagset.authorization);
    }

    await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    return [];
  }

  private appendCredentialRules(
    document: IDocument,
    appendCreatorRule: boolean
  ): IAuthorizationPolicy {
    const authorization = document.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Document: ${document.id}`,
        LogContext.STORAGE_ACCESS
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (appendCreatorRule && document.createdBy) {
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
    }

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
