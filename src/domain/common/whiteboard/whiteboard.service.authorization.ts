import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { WhiteboardService } from './whiteboard.service';
import { IWhiteboard } from './whiteboard.interface';
import { WhiteboardCheckoutAuthorizationService } from '../whiteboard-checkout/whiteboard.checkout.service.authorization';
import { IWhiteboardCheckout } from '../whiteboard-checkout/whiteboard.checkout.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_WHITEBOARD_CREATED_BY,
  CREDENTIAL_RULE_WHITEBOARD_LOCKED_BY,
  POLICY_RULE_WHITEBOARD_CONTENT_UPDATE,
  POLICY_RULE_WHITEBOARD_CONTRIBUTE,
} from '@common/constants';
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

@Injectable()
export class WhiteboardAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private whiteboardService: WhiteboardService,
    private whiteboardCheckoutAuthorizationService: WhiteboardCheckoutAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    whiteboardInput: IWhiteboard,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardInput.id,
      {
        relations: {
          checkout: true,
          profile: true,
        },
      }
    );
    if (!whiteboard.checkout || !whiteboard.profile)
      throw new RelationshipNotFoundException(
        `Unable to load checkout or profile for whiteboard ${whiteboard.id} `,
        LogContext.COLLABORATION
      );
    whiteboard.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        whiteboard.authorization,
        parentAuthorization
      );

    whiteboard.authorization = this.appendCredentialRules(whiteboard);
    whiteboard.authorization = this.appendPrivilegeRules(
      whiteboard.authorization
    );

    whiteboard.checkout.authorization =
      await this.whiteboardCheckoutAuthorizationService.applyAuthorizationPolicy(
        whiteboard.checkout,
        whiteboard.authorization
      );

    whiteboard.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        whiteboard.profile,
        whiteboard.authorization
      );

    return await this.whiteboardService.save(whiteboard);
  }

  private appendCredentialRules(whiteboard: IWhiteboard): IAuthorizationPolicy {
    const authorization = whiteboard.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Whiteboard: ${whiteboard.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (whiteboard.createdBy) {
      const manageWhiteboardCreatedByPolicy =
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
              resourceID: whiteboard.createdBy,
            },
          ],
          CREDENTIAL_RULE_WHITEBOARD_CREATED_BY
        );
      newRules.push(manageWhiteboardCreatedByPolicy);
    }

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private extendAuthorizationPolicyForCheckoutOwner(
    checkout: IWhiteboardCheckout
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (checkout.lockedBy && checkout.lockedBy.length > 0) {
      const lockedBy = this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.UPDATE],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: checkout.lockedBy,
          },
        ],
        CREDENTIAL_RULE_WHITEBOARD_LOCKED_BY
      );

      newRules.push(lockedBy);
    }

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        checkout.authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.UPDATE_WHITEBOARD],
      AuthorizationPrivilege.UPDATE,
      POLICY_RULE_WHITEBOARD_CONTENT_UPDATE
    );
    privilegeRules.push(createPrivilege);

    const contributePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.UPDATE_WHITEBOARD],
      AuthorizationPrivilege.CONTRIBUTE,
      POLICY_RULE_WHITEBOARD_CONTRIBUTE
    );
    privilegeRules.push(contributePrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
