import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AiPersonaServiceService } from './ai.persona.service.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { LogContext } from '@common/enums/logging.context';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { CREDENTIAL_RULE_TYPES_ACCOUNT_MANAGE } from '@common/constants';

@Injectable()
export class AiPersonaServiceAuthorizationService {
  constructor(
    private aiPersonaServiceService: AiPersonaServiceService,
    private authorizationPolicy: AuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  async applyAuthorizationPolicy(
    aiPersonaServiceID: string,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        aiPersonaServiceID,
        {
          relations: {
            authorization: true,
          },
        }
      );

    if (!aiPersonaService.authorization)
      throw new RelationshipNotFoundException(
        `Unable to load entities for AI Persona Service: ${aiPersonaService.id} `,
        LogContext.COMMUNITY
      );

    const accountID =
      await this.getAccountIdForVirtualContributorUsingAiPersonaService(
        aiPersonaServiceID
      );
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    aiPersonaService.authorization = this.authorizationPolicyService.reset(
      aiPersonaService.authorization
    );
    aiPersonaService.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        aiPersonaService.authorization,
        parentAuthorization
      );
    aiPersonaService.authorization = this.appendCredentialRules(
      aiPersonaService.authorization,
      aiPersonaService.id,
      accountID
    );

    updatedAuthorizations.push(aiPersonaService.authorization);

    return updatedAuthorizations;
  }

  private async getAccountIdForVirtualContributorUsingAiPersonaService(
    aiPersonaServiceID: string
  ): Promise<string> {
    const virtualContributor = await this.entityManager.findOne(
      VirtualContributor,
      {
        where: {
          aiPersona: {
            aiPersonaServiceID: aiPersonaServiceID,
          },
        },
        relations: {
          account: true,
        },
      }
    );
    if (!virtualContributor || !virtualContributor.account) {
      throw new RelationshipNotFoundException(
        `Virtual contributor not found for AI Persona Service with account: ${aiPersonaServiceID}`,
        LogContext.AI_PERSONA_SERVICE
      );
    }
    return virtualContributor.account.id;
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    virtualID: string,
    accountID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for virtual: ${virtualID}`,
        LogContext.AI_PERSONA_SERVICE
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const accountAdminCredential: ICredentialDefinition = {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: accountID,
    };

    // Allow hosts (users = self mgmt, org = org admin) to manage resources in their account in a way that cascades
    const accountHostManage =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [accountAdminCredential],
        CREDENTIAL_RULE_TYPES_ACCOUNT_MANAGE
      );
    accountHostManage.cascade = true;
    newRules.push(accountHostManage);

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
