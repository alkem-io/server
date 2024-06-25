import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAiServer } from './ai.server.interface';
import { AiServer } from './ai.server.entity';
import { AiServerService } from './ai.server.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAiPersonaService } from '@services/ai-server/ai-persona-service';
import { AiPersonaServiceAuthorizationService } from '../ai-persona-service/ai.persona.service.authorization';
import { CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS } from '@common/constants/authorization/credential.rule.types.constants';

@Injectable()
export class AiServerAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private aiServerService: AiServerService,
    private aiPersonaServiceAuthorizationService: AiPersonaServiceAuthorizationService,

    @InjectRepository(AiServer)
    private aiServerRepository: Repository<AiServer>
  ) {}

  async applyAuthorizationPolicy(): Promise<IAiServer> {
    let aiServer = await this.aiServerService.getAiServerOrFail({
      relations: {
        authorization: true,
        aiPersonaServices: true,
      },
    });

    if (!aiServer.authorization || !aiServer.aiPersonaServices)
      throw new RelationshipNotFoundException(
        `Unable to load entities for aiServer: ${aiServer.id} `,
        LogContext.AI_SERVER
      );

    aiServer.authorization = await this.authorizationPolicyService.reset(
      aiServer.authorization
    );

    aiServer.authorization.anonymousReadAccess = false;
    aiServer.authorization = await this.appendCredentialRules(
      aiServer.authorization
    );

    const updatedPersonas: IAiPersonaService[] = [];
    for (const aiPersonaService of aiServer.aiPersonaServices) {
      const updatedPersona =
        await this.aiPersonaServiceAuthorizationService.applyAuthorizationPolicy(
          aiPersonaService,
          aiServer.authorization
        );
      updatedPersonas.push(updatedPersona);
    }
    aiServer.aiPersonaServices = updatedPersonas;

    aiServer = await this.aiServerRepository.save(aiServer);

    return aiServer;
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
        ],
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS
      );
    credentialRules.push(globalAdmins);

    return credentialRules;
  }
}
