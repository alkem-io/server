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
import { Injectable } from '@nestjs/common';
import { IDocument } from './document.interface';
@Injectable()
export class DocumentAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  public async applyAuthorizationPolicy(
    document: IDocument,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    // A tagset-less document is a VALID state, not a load failure (A2).
    // `file.tagsetId` is nullable (`onDelete: 'SET NULL'`) and file-service
    // models it as optional throughout its contract (`CreateDocumentMetadata`
    // /`CopyDocumentInput`.tagsetId are optional, `DeleteDocumentResult.tagsetId`
    // is `string | null`). Rows created by writers that do not go through
    // `StorageBucketService.persistDocumentWithPreparedAuth` therefore legitimately
    // have none — most notably feature 013's inbound Element media: the Synapse
    // media-storage provider creates the `matrix_media` staging row with no
    // tagsetId, and the re-home MOVE cannot add one (PATCH /internal/file/:id has
    // no `tagsetId` field, and the server never writes the `file` table directly).
    // That NULL tagset is an ACCEPTED + documented limitation of feature 013 —
    // see docs/conversation-media-attachments.md, "Known limitations" (1).
    //
    // Hard-throwing here made ONE such row abort the WHOLE parent cascade — for
    // 013 that meant any conversation membership change threw and left the entire
    // conversation (and its bucket + every other attachment) unauthorized. The
    // document's own policy does not depend on the tagset, so apply it and simply
    // skip the tagset leg. `authorization` is eager on every AuthorizableEntity,
    // so a LOADED tagset always carries its policy; a tagset present WITHOUT one
    // is a genuine relation/data defect and still throws.
    if (document.tagset && !document.tagset.authorization) {
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
    document.authorization = this.appendCredentialRules(document);
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

  private appendCredentialRules(document: IDocument): IAuthorizationPolicy {
    const authorization = document.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Document: ${document.id}`,
        LogContext.STORAGE_ACCESS
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (document.createdBy) {
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
