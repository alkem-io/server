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
    communityPolicy: ICommunityPolicy
  ): Promise<ICollaboration> {
    collaboration.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        collaboration.authorization,
        parentAuthorization
      );

    collaboration.authorization = this.appendCredentialRules(
      collaboration.authorization,
      collaboration.id
    );

    collaboration.authorization = this.appendPrivilegeRules(
      collaboration.authorization
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

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    collaborationID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Context: ${collaborationID}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const communityMemberNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.CREATE_RELATION],
        [AuthorizationCredential.USER_SELF_MANAGEMENT]
      );
    communityMemberNotInherited.inheritable = false;
    newRules.push(communityMemberNotInherited);

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
