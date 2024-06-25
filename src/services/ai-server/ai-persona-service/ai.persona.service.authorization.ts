import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AiPersonaServiceService } from './ai.persona.service.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_TYPES_ORGANIZATION_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_COMMUNITY_READ,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_ADMINS,
  CREDENTIAL_RULE_ORGANIZATION_ADMIN,
  CREDENTIAL_RULE_ORGANIZATION_READ,
  CREDENTIAL_RULE_ORGANIZATION_SELF_REMOVAL,
} from '@common/constants';
import { IAiPersonaService } from './ai.persona.service.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';

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

    // Allow global admins to reset authorization
    const globalAdminNotInherited =
      this.authorizationPolicy.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.AUTHORIZATION_RESET],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_AUTHORIZATION_RESET
      );
    globalAdminNotInherited.cascade = false;
    newRules.push(globalAdminNotInherited);

    const communityAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [AuthorizationCredential.GLOBAL_COMMUNITY_READ],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_COMMUNITY_READ
      );
    newRules.push(communityAdmin);

    // Allow Global admins + Global Space Admins to manage access to Spaces + contents
    const globalAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.GRANT],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_ADMINS
      );
    newRules.push(globalAdmin);

    const virtualAdmin = this.authorizationPolicyService.createCredentialRule(
      [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      [
        {
          type: AuthorizationCredential.ORGANIZATION_ADMIN,
          resourceID: virtualID,
        },
        {
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: virtualID,
        },
      ],
      CREDENTIAL_RULE_ORGANIZATION_ADMIN
    );

    newRules.push(virtualAdmin);

    const readPrivilege = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ],
      [
        {
          type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
          resourceID: virtualID,
        },
        {
          type: AuthorizationCredential.ORGANIZATION_ADMIN,
          resourceID: virtualID,
        },
        {
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: virtualID,
        },
        {
          type: AuthorizationCredential.GLOBAL_REGISTERED,
          resourceID: '',
        },
      ],
      CREDENTIAL_RULE_ORGANIZATION_READ
    );
    newRules.push(readPrivilege);

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  public extendAuthorizationPolicyForSelfRemoval(
    virtual: IAiPersonaService,
    userToBeRemovedID: string
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const userSelfRemovalRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.GRANT],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: userToBeRemovedID,
          },
        ],
        CREDENTIAL_RULE_ORGANIZATION_SELF_REMOVAL
      );
    newRules.push(userSelfRemovalRule);

    const clonedVirtualAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        virtual.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedVirtualAuthorization,
        newRules
      );

    return updatedAuthorization;
  }
}
