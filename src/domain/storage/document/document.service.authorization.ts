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
import { DocumentService } from './document.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_DOCUMENT_CREATED_BY } from '@common/constants/authorization/credential.rule.constants';
@Injectable()
export class DocumentAuthorizationService {
  constructor(
    private documentService: DocumentService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>
  ) {}

  async applyAuthorizationPolicy(
    documentInput: IDocument,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IDocument> {
    const document = await this.documentService.getDocumentOrFail(
      documentInput.id,
      {
        relations: ['tagset'],
      }
    );
    document.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        document.authorization,
        parentAuthorization
      );

    // Extend to give the user creating the document more rights
    document.authorization = this.appendCredentialRules(document);

    if (document.anonymousReadAccess)
      document.authorization.anonymousReadAccess = document.anonymousReadAccess;
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
