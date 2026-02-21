import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { ClassificationService } from './classification.service';

@Injectable()
export class ClassificationAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private classificationService: ClassificationService
  ) {}

  async applyAuthorizationPolicy(
    classificationID: string,
    parentAuthorization: IAuthorizationPolicy | undefined,
    credentialRulesFromParent: IAuthorizationPolicyRuleCredential[] = []
  ): Promise<IAuthorizationPolicy[]> {
    const classification =
      await this.classificationService.getClassificationOrFail(
        classificationID,
        {
          loadEagerRelations: false,
          relations: {
            authorization: true,
            tagsets: { authorization: true },
          },
          select: {
            id: true,
            authorization:
              this.authorizationPolicyService.authorizationSelectOptions,
            tagsets: {
              id: true,
              authorization:
                this.authorizationPolicyService.authorizationSelectOptions,
            },
          },
        }
      );
    if (!classification.tagsets || !classification.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Classification with entities at start of auth reset: ${classificationID} `,
        LogContext.CLASSIFICATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit from the parent
    classification.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        classification.authorization,
        parentAuthorization
      );

    classification.authorization.credentialRules.push(
      ...credentialRulesFromParent
    );

    updatedAuthorizations.push(classification.authorization);

    for (const tagset of classification.tagsets) {
      tagset.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          tagset.authorization,
          classification.authorization
        );
      updatedAuthorizations.push(tagset.authorization);
    }

    return updatedAuthorizations;
  }
}
