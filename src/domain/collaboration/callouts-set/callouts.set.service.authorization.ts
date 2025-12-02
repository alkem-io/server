import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { CalloutAuthorizationService } from '../callout/callout.service.authorization';
import { CalloutsSetService } from './callouts.set.service';
import { ICalloutsSet } from './callouts.set.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import {
  CREDENTIAL_RULE_CALLOUTS_SET_TRANSFER_ACCEPT,
  CREDENTIAL_RULE_CALLOUTS_SET_TRANSFER_OFFER,
  POLICY_RULE_CALLOUT_CONTRIBUTE,
  POLICY_RULE_COLLABORATION_CREATE,
} from '@common/constants';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';

@Injectable()
export class CalloutsSetAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutsSetService: CalloutsSetService,
    private calloutAuthorizationService: CalloutAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    calloutsSetInput: ICalloutsSet,
    parentAuthorization: IAuthorizationPolicy | undefined,
    platformRolesAccess: IPlatformRolesAccess,
    credentialRulesFromParent: IAuthorizationPolicyRuleCredential[] = [],
    roleSet?: IRoleSet,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy[]> {
    const calloutsSet = await this.calloutsSetService.getCalloutsSetOrFail(
      calloutsSetInput.id,
      {
        relations: {
          callouts: true,
        },
      }
    );

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit from the parent
    calloutsSet.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        calloutsSet.authorization,
        parentAuthorization
      );
    calloutsSet.authorization = await this.appendPrivilegeRules(
      calloutsSet.authorization,
      spaceSettings
    );
    calloutsSet.authorization.credentialRules.push(
      ...this.createTransferCalloutCredentialRules()
    );
    calloutsSet.authorization.credentialRules.push(
      ...credentialRulesFromParent
    );

    updatedAuthorizations.push(calloutsSet.authorization);

    if (calloutsSet.callouts) {
      for (const callout of calloutsSet.callouts) {
        const calloutAuthorizations =
          await this.calloutAuthorizationService.applyAuthorizationPolicy(
            callout.id,
            parentAuthorization,
            platformRolesAccess,
            roleSet,
            spaceSettings
          );
        updatedAuthorizations.push(...calloutAuthorizations);
      }
    }

    return updatedAuthorizations;
  }

  private createTransferCalloutCredentialRules(): IAuthorizationPolicyRuleCredential[] {
    const credentialRules: IAuthorizationPolicyRuleCredential[] = [];

    // Two separate rules so can enforce different criterias moving forward.
    const globalAdminTransferCalloutOffer =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER],
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_CALLOUTS_SET_TRANSFER_OFFER
      );
    globalAdminTransferCalloutOffer.cascade = false;
    credentialRules.push(globalAdminTransferCalloutOffer);

    const globalAdminTransferCalloutAccept =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT],
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_CALLOUTS_SET_TRANSFER_ACCEPT
      );
    globalAdminTransferCalloutAccept.cascade = false;
    credentialRules.push(globalAdminTransferCalloutAccept);

    return credentialRules;
  }

  private async appendPrivilegeRules(
    authorization: IAuthorizationPolicy,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy> {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_CALLOUT],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_COLLABORATION_CREATE
    );
    privilegeRules.push(createPrivilege);

    if (spaceSettings) {
      const collaborationSettings = spaceSettings.collaboration;
      if (collaborationSettings.allowMembersToCreateCallouts) {
        const createCalloutPrivilege = new AuthorizationPolicyRulePrivilege(
          [AuthorizationPrivilege.CREATE_CALLOUT],
          AuthorizationPrivilege.CONTRIBUTE,
          POLICY_RULE_CALLOUT_CONTRIBUTE
        );
        privilegeRules.push(createCalloutPrivilege);
      }
    }

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
