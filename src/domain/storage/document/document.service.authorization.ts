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
    //
    // "No tagset" and "tagset NOT LOADED" are distinguished by `null` vs
    // `undefined`, and that distinction is load-bearing: skipping BOTH would let
    // any caller that forgets `relations: { documents: { tagset: true } }` leave
    // every document's tagset policy stale platform-wide, with no error and no
    // log. TypeORM makes the two states unambiguous — a to-one relation that was
    // JOINED but matched no row is set to `null`
    // (RawSqlResultsToEntityTransformer.transformJoins: "this is needed to make
    // relations to return null when its joined but nothing was found in the
    // database"), while a relation that was never joined is never assigned at
    // all. The FK column is not mapped on the entity (`Document.tagset` is a
    // bare `@OneToOne` + `@JoinColumn()`, no `tagsetId` property), so this is
    // the available sound discriminator. Every cascade caller today requests
    // the relation explicitly, and `tagset` is additionally `eager: true` —
    // which TypeORM also applies to nested joined relations — so `undefined`
    // here really does mean the document was not loaded for auth work.
    //
    // The cast is deliberate: `IDocument.tagset` is declared non-nullable
    // because the GraphQL field is, but a loaded-and-absent relation is `null`
    // and an unloaded one is `undefined`, so the declared type cannot express
    // the state actually being discriminated.
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
