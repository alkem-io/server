import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AiServerService } from './ai.server.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AiPersonaServiceAuthorizationService } from '../ai-persona-service/ai.persona.service.service.authorization';
import { CREDENTIAL_RULE_AI_SERVER_GLOBAL_ADMINS } from '@common/constants/authorization/credential.rule.types.constants';

@Injectable()
export class AiServerAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private aiServerService: AiServerService,
    private aiPersonaServiceAuthorizationService: AiPersonaServiceAuthorizationService
  ) {}

  async applyAuthorizationPolicy(): Promise<IAuthorizationPolicy[]> {
    const aiServer = await this.aiServerService.getAiServerOrFail({
      relations: {
        authorization: true,
        aiPersonaServices: true,
      },
    });

    if (!aiServer.authorization || !aiServer.aiPersonaServices) {
      throw new RelationshipNotFoundException(
        `Unable to load entities for aiServer: ${aiServer.id} `,
        LogContext.AI_SERVER
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    aiServer.authorization = this.authorizationPolicyService.reset(
      aiServer.authorization
    );

    aiServer.authorization.anonymousReadAccess = false;
    aiServer.authorization = await this.appendCredentialRules(
      aiServer.authorization
    );
    updatedAuthorizations.push(aiServer.authorization);

    for (const aiPersonaService of aiServer.aiPersonaServices) {
      const updatedPersonaAuthorizations =
        await this.aiPersonaServiceAuthorizationService.applyAuthorizationPolicy(
          aiPersonaService,
          aiServer.authorization
        );
      updatedAuthorizations.push(...updatedPersonaAuthorizations);
    }

    return updatedAuthorizations;
  }

  private async appendCredentialRules(
    authorization: IAuthorizationPolicy
  ): Promise<IAuthorizationPolicy> {
    const credentialRules = this.createRootCredentialRules();

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      credentialRules
    );
  }

  private createRootCredentialRules(): IAuthorizationPolicyRuleCredential[] {
    const credentialRules: IAuthorizationPolicyRuleCredential[] = [];
    const globalAdmins =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.AUTHORIZATION_RESET,
        ],
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_AI_SERVER_GLOBAL_ADMINS
      );
    credentialRules.push(globalAdmins);

    return credentialRules;
  }
}
