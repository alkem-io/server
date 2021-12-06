import { Injectable } from '@nestjs/common';
import { AuthorizationCredential } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { CanvasService } from './canvas.service';
import { ICanvas } from './canvas.interface';
import { CanvasCheckoutAuthorizationService } from '../canvas-checkout/canvas.checkout.service.authorization';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';

@Injectable()
export class CanvasAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private canvasService: CanvasService,
    private canvasCheckoutAuthorizationService: CanvasCheckoutAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    canvas: ICanvas,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICanvas> {
    canvas.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        canvas.authorization,
        parentAuthorization
      );
    if (canvas.checkout) {
      canvas.checkout =
        await this.canvasCheckoutAuthorizationService.applyAuthorizationPolicy(
          canvas.checkout,
          canvas.authorization
        );
    }
    return await this.canvasService.save(canvas);
  }

  private extendAuthorizationPolicyForCheckoutOwner(
    checkout: ICanvasCheckout
  ): IAuthorizationPolicy {
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    // Allow any member of this community to create messages on the discussion
    if (checkout.lockedBy && checkout.lockedBy.length > 0) {
      const lockedBy = {
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
        resourceID: checkout.lockedBy,
        grantedPrivileges: [AuthorizationPrivilege.UPDATE],
      };
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
