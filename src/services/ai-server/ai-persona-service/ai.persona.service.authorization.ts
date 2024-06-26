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

@Injectable()
export class AiPersonaServiceAuthorizationService {
  constructor(
    private aiPersonaServiceService: AiPersonaServiceService,
    private authorizationPolicy: AuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  async applyAuthorizationPolicy(
    aiPersonaServiceInput: IAiPersonaService,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAiPersonaService> {
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        aiPersonaServiceInput.id,
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
    aiPersonaService.authorization =
      await this.authorizationPolicyService.reset(
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

    return aiPersonaService;
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
