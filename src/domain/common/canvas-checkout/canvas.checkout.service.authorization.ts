import { Injectable } from '@nestjs/common';
import { AuthorizationCredential } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ICanvasCheckout } from './canvas.checkout.interface';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';

@Injectable()
export class CanvasCheckoutAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  async applyAuthorizationPolicy(
    canvasCheckout: ICanvasCheckout,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    canvasCheckout.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        canvasCheckout.authorization,
        parentAuthorization
      );
    const extendedAuthPolicy =
      this.extendAuthorizationPolicyForCheckoutOwner(canvasCheckout);
    return await this.authorizationPolicyService.save(extendedAuthPolicy);
  }

  private extendAuthorizationPolicyForCheckoutOwner(
    checkout: ICanvasCheckout
  ): IAuthorizationPolicy {
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    // Allow any member of this community to create messages on the discussion
    if (checkout.lockedBy && checkout.lockedBy.length > 0) {
      const lockedBy = new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.UPDATE],
        AuthorizationCredential.USER_SELF_MANAGEMENT,
        checkout.lockedBy
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
}
