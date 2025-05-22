import { Injectable } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAiPersona } from './ai.persona.interface';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';

@Injectable()
export class AiPersonaAuthorizationService {
  constructor(
    private authorizationPolicy: AuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private aiServerAdapter: AiServerAdapter
  ) {}

  public async applyAuthorizationPolicy(
    aiPersona: IAiPersona,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    if (!aiPersona.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load entities for virtual persona: ${aiPersona.id} `,
        LogContext.COMMUNITY
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    aiPersona.authorization = this.authorizationPolicyService.reset(
      aiPersona.authorization
    );

    aiPersona.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        aiPersona.authorization,
        parentAuthorization
      );
    aiPersona.authorization = this.appendCredentialRules(
      aiPersona.authorization,
      aiPersona.id
    );

    // TODO: this is a hack to deal with the fact that the AI Persona Service has an authorization policy that uses the VC's account
    const aiPersonaServiceAuthorizations =
      await this.aiServerAdapter.resetAuthorizationOnAiPersonaService(
        aiPersona.aiPersonaServiceID
      );
    updatedAuthorizations.push(...aiPersonaServiceAuthorizations);
    updatedAuthorizations.push(aiPersona.authorization);

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    virtualID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for virtual: ${virtualID}`,
        LogContext.COMMUNITY
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
