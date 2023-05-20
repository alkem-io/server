import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitationService } from './invitation.service';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Invitation } from './invitation.entity';
import { IInvitation } from './invitation.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_COMMUNITY_USER_INVITATION } from '@common/constants/authorization/credential.rule.constants';

@Injectable()
export class InvitationAuthorizationService {
  constructor(
    private invitationService: InvitationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>
  ) {}

  async applyAuthorizationPolicy(
    invitation: IInvitation,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IInvitation> {
    invitation.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        invitation.authorization,
        parentAuthorization
      );

    invitation.authorization = await this.extendAuthorizationPolicy(invitation);

    return await this.invitationRepository.save(invitation);
  }

  private async extendAuthorizationPolicy(
    invitation: IInvitation
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // get the user
    const user = await this.invitationService.getInvitedUser(invitation);

    // also grant the user privileges to manage their own invitation
    const userInvitationRule =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: user.id,
          },
        ],
        CREDENTIAL_RULE_COMMUNITY_USER_INVITATION
      );
    newRules.push(userInvitationRule);

    //
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        invitation.authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
