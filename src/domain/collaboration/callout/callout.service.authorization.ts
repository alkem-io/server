import {
  CREDENTIAL_RULE_CALLOUT_CREATED_BY,
  CREDENTIAL_RULE_TYPES_CALLOUT_UPDATE_PUBLISHER_ADMINS,
  POLICY_RULE_CALLOUT_CONTRIBUTE,
  POLICY_RULE_CALLOUT_CREATE,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { RoleName } from '@common/enums/role.name';
import { EntityNotInitializedException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ClassificationAuthorizationService } from '@domain/common/classification/classification.service.authorization';
import { InheritedCredentialRuleSetService } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.service';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { Injectable } from '@nestjs/common';
import { CalloutContributionAuthorizationService } from '../callout-contribution/callout.contribution.service.authorization';
import { CalloutFramingAuthorizationService } from '../callout-framing/callout.framing.service.authorization';
import { CalloutService } from './callout.service';

@Injectable()
export class CalloutAuthorizationService {
  constructor(
    private calloutService: CalloutService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private classificationAuthorizationService: ClassificationAuthorizationService,
    private contributionAuthorizationService: CalloutContributionAuthorizationService,
    private calloutFramingAuthorizationService: CalloutFramingAuthorizationService,
    private roomAuthorizationService: RoomAuthorizationService,
    private roleSetService: RoleSetService,
    private inheritedCredentialRuleSetService: InheritedCredentialRuleSetService
  ) {}

  public async applyAuthorizationPolicy(
    calloutID: string,
    parentAuthorization: IAuthorizationPolicy | undefined,
    platformRolesAccess: IPlatformRolesAccess,
    roleSet?: IRoleSet,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy[]> {
    const callout = await this.calloutService.getCalloutOrFail(calloutID, {
      relations: {
        authorization: true,
        comments: true,
        contributions: true,
        contributionDefaults: true,
        classification: true,
        calloutsSet: {
          collaboration: {
            space: {
              community: {
                roleSet: true,
              },
            },
          },
        },
        framing: {
          profile: true,
          whiteboard: {
            profile: true,
          },
          memo: {
            profile: true,
          },
        },
      },
    });

    if (
      !callout.contributions ||
      !callout.contributionDefaults ||
      !callout.settings ||
      !callout.settings.contribution ||
      !callout.framing
    ) {
      throw new EntityNotInitializedException(
        `authorization: Unable to load callout entities for auth reset: ${callout.id}`,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // We must use this instead of the raw parentAuthorization because callouts in DRAFT visibility
    // require stricter access control: only global admins, space admins, global support, and the creator
    // should have READ privileges. The parent policy may grant broader access, so we need to filter it here.
    const parentAuthorizationAdjusted =
      await this.getParentAuthorizationPolicyForCalloutVisibility(
        callout,
        parentAuthorization
      );

    callout.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        callout.authorization,
        parentAuthorizationAdjusted
      );

    callout.authorization = this.appendPrivilegeRules(
      callout.authorization,
      callout.settings.contribution.allowedTypes
    );

    callout.authorization = this.appendCredentialRules(callout);
    updatedAuthorizations.push(callout.authorization);

    await this.inheritedCredentialRuleSetService.resolveForParent(
      callout.authorization
    );

    for (const contribution of callout.contributions) {
      const updatedContributionAuthorizations =
        await this.contributionAuthorizationService.applyAuthorizationPolicy(
          contribution.id,
          callout.authorization,
          platformRolesAccess,
          roleSet,
          spaceSettings
        );
      updatedAuthorizations.push(...updatedContributionAuthorizations);
    }

    const framingAuthorizations =
      await this.calloutFramingAuthorizationService.applyAuthorizationPolicy(
        callout.framing,
        callout.authorization,
        spaceSettings
      );
    updatedAuthorizations.push(...framingAuthorizations);

    if (callout.comments) {
      let commentsAuthorization =
        this.roomAuthorizationService.applyAuthorizationPolicy(
          callout.comments,
          callout.authorization
        );
      commentsAuthorization =
        this.roomAuthorizationService.allowContributorsToCreateMessages(
          commentsAuthorization
        );
      commentsAuthorization =
        this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
          commentsAuthorization
        );
      updatedAuthorizations.push(commentsAuthorization);
    }

    if (callout.classification) {
      const classificationAuthorizations =
        await this.classificationAuthorizationService.applyAuthorizationPolicy(
          callout.classification.id,
          callout.authorization
        );
      updatedAuthorizations.push(...classificationAuthorizations);
    }

    return updatedAuthorizations;
  }

  /**
   * Returns a modified parent authorization policy for callout visibility.
   * If the callout is in DRAFT visibility, strips all READ privileges from the parent policy,
   * then grants READ access only to global admins, space admins, global support, and the callout creator.
   * Otherwise, returns the parent policy unchanged.
   *
   * @param callout The callout entity for which visibility is being checked.
   * @param parentAuthorization The parent authorization policy to modify.
   * @returns The modified authorization policy, or undefined if no parent policy is provided.
   */
  private async getParentAuthorizationPolicyForCalloutVisibility(
    callout: ICallout,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy | undefined> {
    // If there is no parent authorization, or the Callout is a Template, or the Callout is not in DRAFT visibility
    // then return the parent unchanged. Templates should always be readable when surfaced (issue #8804).
    if (!parentAuthorization) return parentAuthorization;
    if (callout.isTemplate) return parentAuthorization;
    if (callout.settings.visibility !== CalloutVisibility.DRAFT) {
      return parentAuthorization;
    }

    // Clone the parent authorization and strip out all rules that grant the READ privilege.
    const clonedParent =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        parentAuthorization
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    for (const rule of clonedParent.credentialRules) {
      const grantedPrivileges = rule.grantedPrivileges;
      const filteredPrivileges = grantedPrivileges.filter(
        privilege => privilege !== AuthorizationPrivilege.READ
      );

      if (filteredPrivileges.length > 0) {
        newRules.push({
          ...rule,
          grantedPrivileges: filteredPrivileges,
        });
      }
    }

    clonedParent.credentialRules = newRules;

    // Add in who should READ
    const criteriasWithReadAccess: ICredentialDefinition[] = [
      { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
      { type: AuthorizationCredential.GLOBAL_SUPPORT, resourceID: '' },
    ];

    if (callout.calloutsSet?.collaboration?.space) {
      const space = callout.calloutsSet.collaboration.space;
      if (space.community?.roleSet) {
        // Get space admin credentials including parent space admins for hierarchical access
        const spaceAdminCredentials =
          await this.roleSetService.getCredentialsForRoleWithParents(
            space.community.roleSet,
            RoleName.ADMIN
          );
        criteriasWithReadAccess.push(...spaceAdminCredentials);
      } else {
        // Fallback to just the current space admin if roleSet is not available
        criteriasWithReadAccess.push({
          type: AuthorizationCredential.SPACE_ADMIN,
          resourceID: space.id,
        });
      }
    }
    if (callout.createdBy) {
      criteriasWithReadAccess.push({
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
        resourceID: callout.createdBy,
      });
    }
    if (criteriasWithReadAccess.length > 0) {
      const draftCalloutReadAccess =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.READ],
          criteriasWithReadAccess,
          'Callout read access for draft callouts'
        );
      clonedParent.credentialRules.push(draftCalloutReadAccess);
    }

    return clonedParent;
  }

  private appendCredentialRules(callout: ICallout): IAuthorizationPolicy {
    const authorization = callout.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found for Callout',
        LogContext.COLLABORATION
      );
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (callout.createdBy) {
      const manageCreatedCalloutPolicy =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
          ],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: callout.createdBy,
            },
          ],
          CREDENTIAL_RULE_CALLOUT_CREATED_BY
        );
      newRules.push(manageCreatedCalloutPolicy);
    }

    const calloutPublishUpdate =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_CALLOUT_UPDATE_PUBLISHER_ADMINS
      );
    calloutPublishUpdate.cascade = false;
    newRules.push(calloutPublishUpdate);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy,
    allowedContributions: CalloutContributionType[] | undefined
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const privilegesToGrant =
      this.getPrivilegesForCalloutAllowedContributions(allowedContributions);
    for (const privilegeToGrant of privilegesToGrant) {
      const createPrivilege = new AuthorizationPolicyRulePrivilege(
        [privilegeToGrant],
        AuthorizationPrivilege.CREATE,
        POLICY_RULE_CALLOUT_CREATE
      );
      privilegeRules.push(createPrivilege);

      const contributorsPrivilege = new AuthorizationPolicyRulePrivilege(
        [privilegeToGrant],
        AuthorizationPrivilege.CONTRIBUTE,
        POLICY_RULE_CALLOUT_CONTRIBUTE
      );
      privilegeRules.push(contributorsPrivilege);
    }

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }

  private getPrivilegesForCalloutAllowedContributions(
    allowedContributions: CalloutContributionType[] | undefined
  ): AuthorizationPrivilege[] {
    const privilegesToGrant: AuthorizationPrivilege[] = [];
    if (!allowedContributions || allowedContributions.length === 0) {
      return privilegesToGrant;
    } else {
      if (allowedContributions.includes(CalloutContributionType.LINK)) {
        privilegesToGrant.push(AuthorizationPrivilege.CONTRIBUTE);
      }
      if (allowedContributions.includes(CalloutContributionType.POST)) {
        privilegesToGrant.push(AuthorizationPrivilege.CREATE_POST);
      }
      if (allowedContributions.includes(CalloutContributionType.WHITEBOARD)) {
        privilegesToGrant.push(AuthorizationPrivilege.CREATE_WHITEBOARD);
      }
      return privilegesToGrant;
    }
  }
}
