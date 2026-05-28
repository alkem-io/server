import {
  CREDENTIAL_RULE_COLLABORA_DOCUMENT_CREATED_BY,
  POLICY_RULE_COLLABORA_DOCUMENT_CONTENT_UPDATE,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Injectable } from '@nestjs/common';
import { ICollaboraDocument } from './collabora.document.interface';
import { CollaboraDocumentService } from './collabora.document.service';

@Injectable()
export class CollaboraDocumentAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private collaboraDocumentService: CollaboraDocumentService
  ) {}

  async applyAuthorizationPolicy(
    collaboraDocumentID: string,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const collaboraDocument =
      await this.collaboraDocumentService.getCollaboraDocumentOrFail(
        collaboraDocumentID,
        {
          loadEagerRelations: false,
          relations: {
            authorization: true,
            profile: {
              authorization: true,
            },
            document: {
              authorization: true,
            },
          },
          select: {
            id: true,
            createdBy: true,
            authorization:
              this.authorizationPolicyService.authorizationSelectOptions,
            profile: {
              id: true,
            },
            document: {
              id: true,
              authorization:
                this.authorizationPolicyService.authorizationSelectOptions,
            },
          },
        }
      );

    if (!collaboraDocument.profile) {
      throw new RelationshipNotFoundException(
        'Unable to load Profile on CollaboraDocument auth reset',
        LogContext.COLLABORATION,
        { collaboraDocumentID }
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    collaboraDocument.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        collaboraDocument.authorization,
        parentAuthorization
      );

    collaboraDocument.authorization =
      this.appendCredentialRules(collaboraDocument);
    collaboraDocument.authorization = this.appendPrivilegeRules(
      collaboraDocument.authorization
    );
    updatedAuthorizations.push(collaboraDocument.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        collaboraDocument.profile.id,
        collaboraDocument.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    // Cascade authorization to the underlying Document entity so that
    // external services (WOPI, file-service-go) can evaluate access
    // using the document's own authorizationPolicyId.
    if (collaboraDocument.document?.authorization) {
      collaboraDocument.document.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          collaboraDocument.document.authorization,
          collaboraDocument.authorization
        );
      // Also copy privilege rules (inheritParentAuthorization only copies
      // credential rules); the WOPI service needs the contribute→update-content
      // mapping on the document's own policy.
      collaboraDocument.document.authorization =
        this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
          collaboraDocument.document.authorization,
          this.authorizationPolicyService.getPrivilegeRules(
            collaboraDocument.authorization
          )
        );
      updatedAuthorizations.push(collaboraDocument.document.authorization);
    }

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    collaboraDocument: ICollaboraDocument
  ): IAuthorizationPolicy {
    const authorization = collaboraDocument.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for CollaboraDocument`,
        LogContext.COLLABORATION,
        { collaboraDocumentId: collaboraDocument.id }
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (collaboraDocument.createdBy) {
      const createdByPolicy =
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
              resourceID: collaboraDocument.createdBy,
            },
          ],
          CREDENTIAL_RULE_COLLABORA_DOCUMENT_CREATED_BY
        );
      newRules.push(createdByPolicy);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    // Grant UPDATE_CONTENT from CONTRIBUTE privilege
    const updateContentPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.UPDATE_CONTENT],
      AuthorizationPrivilege.CONTRIBUTE,
      POLICY_RULE_COLLABORA_DOCUMENT_CONTENT_UPDATE
    );
    privilegeRules.push(updateContentPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
