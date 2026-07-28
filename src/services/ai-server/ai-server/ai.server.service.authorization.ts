import {
  CREDENTIAL_RULE_AI_SERVER_AUTH_RESET,
  CREDENTIAL_RULE_AI_SERVER_GLOBAL_ADMINS,
  CREDENTIAL_RULE_AI_SERVER_PERSONA_CREATE,
} from '@common/constants/authorization/credential.rule.types.constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { AiPersonaAuthorizationService } from '../ai-persona/ai.persona.service.authorization';
import { AiServerService } from './ai.server.service';

@Injectable()
export class AiServerAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private aiServerService: AiServerService,
    private aiPersonaAuthorizationService: AiPersonaAuthorizationService
  ) {}

  async applyAuthorizationPolicy(): Promise<IAuthorizationPolicy[]> {
    const aiServer = await this.aiServerService.getAiServerOrFail({
      relations: {
        authorization: true,
        aiPersonas: true,
      },
    });

    if (!aiServer.authorization || !aiServer.aiPersonas) {
      throw new RelationshipNotFoundException(
        `Unable to load entities for aiServer: ${aiServer.id} `,
        LogContext.AI_SERVER
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    aiServer.authorization = this.authorizationPolicyService.reset(
      aiServer.authorization
    );

    aiServer.authorization = await this.appendCredentialRules(
      aiServer.authorization
    );
    updatedAuthorizations.push(aiServer.authorization);

    for (const aiPersona of aiServer.aiPersonas) {
      const updatedPersonaAuthorizations =
        await this.aiPersonaAuthorizationService.applyAuthorizationPolicy(
          aiPersona,
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
          // Kept here (and cascading) so Global Admin retains the inherited
          // AUTHORIZATION_RESET it has always had on aiServer child policies.
          AuthorizationPrivilege.AUTHORIZATION_RESET,
        ],
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_AI_SERVER_GLOBAL_ADMINS
      );
    credentialRules.push(globalAdmins);

    // Additive reset rule: PLATFORM_OPERATIONS_ADMIN must not gain CRUD/GRANT
    const authorizationReset =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.AUTHORIZATION_RESET],
        [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
        CREDENTIAL_RULE_AI_SERVER_AUTH_RESET
      );
    authorizationReset.cascade = false;
    credentialRules.push(authorizationReset);

    // Operational family (persona create): CREATE only, so the Platform
    // Operations Admin never gains the full CRUD/GRANT bundle above.
    // createAiPersona keeps its pre-existing CREATE gate — narrowing that gate
    // would strip the privilege from existing CREATE holders. GLOBAL_ADMIN is
    // not repeated here; it already holds CREATE via globalAdmins above.
    const platformOperations =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.CREATE],
        [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
        CREDENTIAL_RULE_AI_SERVER_PERSONA_CREATE
      );
    platformOperations.cascade = false;
    credentialRules.push(platformOperations);

    return credentialRules;
  }
}
