import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { KnowledgeBaseService } from './knowledge.base.service';
import { IKnowledgeBase } from './knowledge.base.interface';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { CalloutsSetAuthorizationService } from '@domain/collaboration/callouts-set/callouts.set.service.authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { POLICY_RULE_READ_ABOUT } from '@common/constants';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

@Injectable()
export class KnowledgeBaseAuthorizationService {
  constructor(
    private knowledgeBaseService: KnowledgeBaseService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private calloutsSetAuthorizationService: CalloutsSetAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    knowledgeBaseInput: IKnowledgeBase,
    parentAuthorization: IAuthorizationPolicy | undefined,
    credentialCriteriasWithAccessToVC: ICredentialDefinition[],
    knowledgeBaseContentsVisible: boolean
  ): Promise<IAuthorizationPolicy[]> {
    const knowledgeBase =
      await this.knowledgeBaseService.getKnowledgeBaseOrFail(
        knowledgeBaseInput.id,
        {
          relations: {
            authorization: true,
            profile: true,
            calloutsSet: true,
          },
        }
      );

    if (!knowledgeBase.profile || !knowledgeBase.calloutsSet) {
      throw new RelationshipNotFoundException(
        `Unable to load Profile of CalloutsSet on knowledgeBase:  ${knowledgeBase.id} `,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    knowledgeBase.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        knowledgeBase.authorization,
        parentAuthorization
      );
    if (credentialCriteriasWithAccessToVC.length > 0) {
      if (knowledgeBaseContentsVisible) {
        const rule = this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.READ],
          credentialCriteriasWithAccessToVC,
          'KnowledgeBase contents visible'
        );
        rule.cascade = true;
        knowledgeBase.authorization.credentialRules.push(rule);
      } else {
        const rule = this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.READ_ABOUT],
          credentialCriteriasWithAccessToVC,
          'KnowledgeBase contents not visible'
        );
        rule.cascade = false; // need to separately give access to Profile (About)
        knowledgeBase.authorization.credentialRules.push(rule);
      }
    }
    updatedAuthorizations.push(knowledgeBase.authorization);

    const calloutsSetAuthorizations =
      await this.calloutsSetAuthorizationService.applyAuthorizationPolicy(
        knowledgeBase.calloutsSet,
        knowledgeBase.authorization
      );
    updatedAuthorizations.push(...calloutsSetAuthorizations);

    // And extra rules to allow the Profile to be always READ for the criterias that give access to the VC
    const profileExtraCredentialRules: IAuthorizationPolicyRuleCredential[] =
      [];
    if (credentialCriteriasWithAccessToVC.length > 0) {
      const rule = this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ],
        credentialCriteriasWithAccessToVC,
        'KnowledgeBase About visible'
      );
      rule.cascade = true;
      profileExtraCredentialRules.push(rule);
    }

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        knowledgeBase.profile.id,
        knowledgeBase.authorization,
        profileExtraCredentialRules
      );
    updatedAuthorizations.push(...profileAuthorizations);

    // If have READ, then have READ_ABOUT
    knowledgeBase.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping(
        knowledgeBase.authorization,
        AuthorizationPrivilege.READ,
        [AuthorizationPrivilege.READ_ABOUT],
        POLICY_RULE_READ_ABOUT
      );
    updatedAuthorizations.push(knowledgeBase.authorization);

    return updatedAuthorizations;
  }
}
