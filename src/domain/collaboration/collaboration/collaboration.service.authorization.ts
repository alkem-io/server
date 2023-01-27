import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CalloutAuthorizationService } from '@domain/collaboration/callout/callout.service.authorization';
import { AuthorizationCredential } from '@common/enums';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';

@Injectable()
export class CollaborationAuthorizationService {
  constructor(
    private collaborationService: CollaborationService,
    private communityPolicyService: CommunityPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>
  ) {}

  public async applyAuthorizationPolicy(
    collaboration: ICollaboration,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityPolicy: ICommunityPolicy
  ): Promise<ICollaboration> {
    collaboration.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        collaboration.authorization,
        parentAuthorization
      );

    collaboration.authorization = this.appendCredentialRules(
      collaboration.authorization,
      communityPolicy
    );

    collaboration.authorization = this.appendPrivilegeRules(
      collaboration.authorization,
      communityPolicy
    );

    collaboration.callouts =
      await this.collaborationService.getCalloutsOnCollaboration(collaboration);
    for (const callout of collaboration.callouts) {
      await this.calloutAuthorizationService.applyAuthorizationPolicy(
        callout,
        collaboration.authorization,
        communityPolicy
      );
    }

    collaboration.relations =
      await this.collaborationService.getRelationsOnCollaboration(
        collaboration
      );
    if (collaboration.relations) {
      for (const relation of collaboration.relations) {
        relation.authorization =
          this.authorizationPolicyService.inheritParentAuthorization(
            relation.authorization,
            collaboration.authorization
          );
      }
    }

    return await this.collaborationRepository.save(collaboration);
  }

  private getContributorCredentials(
    policy: ICommunityPolicy
  ): ICredentialDefinition[] {
    // add challenge members
    const contributors = [
      this.communityPolicyService.getMembershipCredential(policy),
    ];
    // optionally add hub members
    if (
      this.communityPolicyService.getFlag(
        policy,
        CommunityPolicyFlag.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE
      )
    ) {
      const parentCredentials =
        this.communityPolicyService.getParentMembershipCredentials(policy);
      contributors.push(...parentCredentials);
    }

    contributors.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });
    contributors.push({
      type: AuthorizationCredential.GLOBAL_ADMIN_HUBS,
      resourceID: '',
    });
    return contributors;
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Context: ${JSON.stringify(
          policy
        )}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const communityMemberNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.CREATE_RELATION],
        [AuthorizationCredential.USER_SELF_MANAGEMENT],
        'collaborationCreateRelationRegistered'
      );
    communityMemberNotInherited.inheritable = false;
    newRules.push(communityMemberNotInherited);

    // Who is able to contribute
    const contributors = this.getContributorCredentials(policy);
    const contributorsRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.CONTRIBUTE],
        contributors,
        'collaborationContributors'
      );
    newRules.push(contributorsRule);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [
        AuthorizationPrivilege.CREATE_CALLOUT,
        AuthorizationPrivilege.CREATE_RELATION,
      ],
      AuthorizationPrivilege.CREATE
    );
    privilegeRules.push(createPrivilege);

    if (
      this.communityPolicyService.getFlag(
        policy,
        CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS
      )
    ) {
      const createCalloutPrivilege = new AuthorizationPolicyRulePrivilege(
        [AuthorizationPrivilege.CREATE_CALLOUT],
        AuthorizationPrivilege.CONTRIBUTE
      );
      privilegeRules.push(createCalloutPrivilege);
    }

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
