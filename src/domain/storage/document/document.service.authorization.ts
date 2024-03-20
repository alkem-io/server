import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IDocument } from './document.interface';
import { Document } from './document.entity';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_DOCUMENT_CREATED_BY } from '@common/constants/authorization/credential.rule.constants';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { DocumentService } from './document.service';
@Injectable()
export class DocumentAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private documentService: DocumentService,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>
  ) {}

  async applyAuthorizationPolicy(
    document: IDocument,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IDocument> {
    // Note: do not reload unless the tagset entity is missing
    if (!document.tagset) {
      const loadedDocument = await this.documentService.getDocumentOrFail(
        document.id,
        {
          relations: {
            tagset: true,
          },
        }
      );
      if (loadedDocument.tagset) {
        document.tagset = loadedDocument.tagset;
      }
    }
    if (!document.tagset) {
      throw new RelationshipNotFoundException(
        `Unable to find entities required to reset auth for Document ${document.id} `,
        LogContext.STORAGE_BUCKET
      );
    }

    document.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        document.authorization,
        parentAuthorization
      );

    // Extend to give the user creating the document more rights
    document.authorization = this.appendCredentialRules(document);

    if (document.tagset) {
      document.tagset.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          document.tagset.authorization,
          document.authorization
        );
    }

    return await this.documentRepository.save(document);
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
