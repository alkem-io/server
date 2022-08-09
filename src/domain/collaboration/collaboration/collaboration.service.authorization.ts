import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CalloutAuthorizationService } from '@domain/collaboration/callout/callout.service.authorization';

@Injectable()
export class CollaborationAuthorizationService {
  constructor(
    private collaborationService: CollaborationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>
  ) {}

  public async applyAuthorizationPolicy(
    collaboration: ICollaboration,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityCredential: CredentialDefinition
  ): Promise<ICollaboration> {
    collaboration.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        collaboration.authorization,
        parentAuthorization
      );

    collaboration.authorization = this.appendCredentialRules(
      collaboration.authorization,
      collaboration.id,
      communityCredential
    );

    collaboration.authorization = this.appendPrivilegeRules(
      collaboration.authorization
    );

    collaboration.callouts =
      await this.collaborationService.getCalloutsOnCollaboration(collaboration);
    for (const callout of collaboration.callouts) {
      callout.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          callout.authorization,
          collaboration.authorization
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

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    collaborationID: string,
    membershipCredential: CredentialDefinition
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Context: ${collaborationID}`,
        LogContext.COLLABORATION
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const communityMemberNotInherited = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE_CALLOUT,
        AuthorizationPrivilege.CREATE_RELATION,
        AuthorizationPrivilege.CREATE_ASPECT,
        AuthorizationPrivilege.CREATE_CANVAS,
      ],
      membershipCredential.type,
      membershipCredential.resourceID
    );
    // communityMemberNotInherited.inheritable = false;
    newRules.push(communityMemberNotInherited);

    // separate rule as do want the update canvas / ability to create a comment to cascade
    const communityMemberInherited = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.UPDATE_CANVAS,
        AuthorizationPrivilege.CREATE_COMMENT,
      ],
      membershipCredential.type,
      membershipCredential.resourceID
    );
    newRules.push(communityMemberInherited);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
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

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
