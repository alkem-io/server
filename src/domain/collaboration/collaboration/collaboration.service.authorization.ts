import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
// import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
// import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
// import { LogContext } from '@common/enums/logging.context';
// import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
// import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
// import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CalloutAuthorizationService } from '@domain/collaboration/callout/callout.service.authorization';
// import { AuthorizationCredential } from '@common/enums';

@Injectable()
export class CollaborationAuthorizationService {
  constructor(
    private collaborationService: CollaborationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>
  ) {}

  async applyAuthorizationPolicy(
    collaboration: ICollaboration,
    parentAuthorization: IAuthorizationPolicy | undefined
    // communityCredential: CredentialDefinition
  ): Promise<ICollaboration> {
    collaboration.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        collaboration.authorization,
        parentAuthorization
      );

    // collaboration.authorization = this.appendCredentialRules(
    //   collaboration.authorization,
    //   collaboration.id,
    //   communityCredential
    // );

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

  // private appendCredentialRules(
  //   authorization: IAuthorizationPolicy | undefined,
  //   opportunityID: string
  // ): IAuthorizationPolicy {
  //   if (!authorization)
  //     throw new EntityNotInitializedException(
  //       `Authorization definition not found for: ${opportunityID}`,
  //       LogContext.OPPORTUNITY
  //     );

  //   this.authorizationPolicyService.appendCredentialAuthorizationRules(
  //     authorization,
  //     this.createCredentialRules(opportunityID)
  //   );

  //   return authorization;
  // }

  // private createCredentialRules(
  //   opportunityID: string
  // ): AuthorizationPolicyRuleCredential[] {
  //   const rules: AuthorizationPolicyRuleCredential[] = [];

  //   const opportunityAdmin = new AuthorizationPolicyRuleCredential(
  //     [
  //       AuthorizationPrivilege.CREATE,
  //       AuthorizationPrivilege.READ,
  //       AuthorizationPrivilege.UPDATE,
  //       AuthorizationPrivilege.GRANT,
  //       AuthorizationPrivilege.DELETE,
  //     ],
  //     AuthorizationCredential.OPPORTUNITY_ADMIN,
  //     opportunityID
  //   );
  //   rules.push(opportunityAdmin);

  //   const opportunityMember = new AuthorizationPolicyRuleCredential(
  //     [AuthorizationPrivilege.READ],
  //     AuthorizationCredential.OPPORTUNITY_MEMBER,
  //     opportunityID
  //   );
  //   rules.push(opportunityMember);

  //   return rules;
  // }
}
