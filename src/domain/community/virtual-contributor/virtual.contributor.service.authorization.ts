import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { VirtualContributorService } from './virtual.contributor.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_TYPES_VC_GLOBAL_COMMUNITY_READ,
  CREDENTIAL_RULE_TYPES_VC_GLOBAL_SUPPORT_MANAGE,
} from '@common/constants';
import { IVirtualContributor } from './virtual.contributor.interface';
import { AgentAuthorizationService } from '@domain/agent/agent/agent.service.authorization';
import { AiPersonaAuthorizationService } from '../ai-persona/ai.persona.service.authorization';

@Injectable()
export class VirtualContributorAuthorizationService {
  constructor(
    private virtualService: VirtualContributorService,
    private agentAuthorizationService: AgentAuthorizationService,
    private authorizationPolicy: AuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private aiPersonaAuthorizationService: AiPersonaAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    virtualInput: IVirtualContributor,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const virtual = await this.virtualService.getVirtualContributorOrFail(
      virtualInput.id,
      {
        relations: {
          profile: true,
          agent: true,
          aiPersona: true,
        },
      }
    );
    if (!virtual.profile || !virtual.agent || !virtual.aiPersona)
      throw new RelationshipNotFoundException(
        `Unable to load entities for virtual: ${virtual.id} `,
        LogContext.COMMUNITY
      );
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    virtual.authorization = this.authorizationPolicyService.reset(
      virtual.authorization
    );
    virtual.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        virtual.authorization,
        parentAuthorization
      );
    virtual.authorization = this.appendCredentialRules(
      virtual.authorization,
      virtual.id
    );
    updatedAuthorizations.push(virtual.authorization);

    // NOTE: Clone the authorization policy to ensure the changes are local to profile
    const clonedVirtualAuthorizationAnonymousAccess =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        virtual.authorization
      );
    // To ensure that profile on an virtual is always publicly visible, even for non-authenticated users
    clonedVirtualAuthorizationAnonymousAccess.anonymousReadAccess = true;
    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        virtual.profile,
        clonedVirtualAuthorizationAnonymousAccess
      );
    updatedAuthorizations.push(...profileAuthorizations);

    const agentAuthorization =
      this.agentAuthorizationService.applyAuthorizationPolicy(
        virtual.agent,
        virtual.authorization
      );
    updatedAuthorizations.push(agentAuthorization);

    const aiPersonaAuthorization =
      this.aiPersonaAuthorizationService.applyAuthorizationPolicy(
        virtual.aiPersona,
        virtual.authorization
      );
    updatedAuthorizations.push(aiPersonaAuthorization);

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    accountID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for virtual: ${accountID}`,
        LogContext.COMMUNITY
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const globalCommunityRead =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [
          AuthorizationCredential.GLOBAL_REGISTERED,
          AuthorizationCredential.GLOBAL_COMMUNITY_READ,
        ],
        CREDENTIAL_RULE_TYPES_VC_GLOBAL_COMMUNITY_READ
      );
    newRules.push(globalCommunityRead);

    // TODO: rule that for now allows global support ability to manage VCs, this to be removed later
    const globalSupportManage =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [AuthorizationCredential.GLOBAL_SUPPORT],
        CREDENTIAL_RULE_TYPES_VC_GLOBAL_SUPPORT_MANAGE
      );
    newRules.push(globalSupportManage);

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
