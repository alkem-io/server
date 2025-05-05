import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AiPersonaServiceService } from './ai.persona.service.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

import { IAiPersonaService } from './ai.persona.service.interface';
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
    aiPersonaServiceInput: IAiPersonaService,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        aiPersonaServiceInput.id,
        {
          relations: {
            authorization: true,
          },
        }
      );

    const VC = await this.entityManager.findOne(VirtualContributor, {
      where: {
        aiPersona: {
          aiPersonaServiceID: aiPersonaServiceInput.id,
        },
      },
      relations: {
        account: true,
      },
    });

    const aiPersonaAccountID: string | undefined = VC?.account?.id;

    if (!aiPersonaService.authorization)
      throw new RelationshipNotFoundException(
        `Unable to load entities for AI Persona Service: ${aiPersonaService.id} `,
        LogContext.COMMUNITY
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
      aiPersonaService.id
    );

    if (aiPersonaAccountID) {
      const accountAdminCredential: ICredentialDefinition = {
        type: AuthorizationCredential.ACCOUNT_ADMIN,
        resourceID: aiPersonaAccountID,
      };

      aiPersonaService.authorization = await this.extendAuthorizationPolicy(
        aiPersonaService.authorization,
        accountAdminCredential
      );
    }

    updatedAuthorizations.push(aiPersonaService.authorization);

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    virtualID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for virtual: ${virtualID}`,
        LogContext.AI_PERSONA_SERVICE
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private async extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    accountAdminCredential: ICredentialDefinition
  ): Promise<IAuthorizationPolicy> {
    if (!authorization) {
      throw new EntityNotInitializedException(
        'Authorization definition not found for account',
        LogContext.AI_PERSONA_SERVICE
      );
    }

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

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

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }
}
