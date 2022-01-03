import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { CanvasService } from './canvas.service';
import { ICanvas } from './canvas.interface';
import { CanvasCheckoutAuthorizationService } from '../canvas-checkout/canvas.checkout.service.authorization';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { ICredential } from '@domain/agent';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';

@Injectable()
export class CanvasAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private canvasService: CanvasService,
    private canvasCheckoutAuthorizationService: CanvasCheckoutAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    canvas: ICanvas,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityCredential?: ICredential
  ): Promise<ICanvas> {
    canvas.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        canvas.authorization,
        parentAuthorization
      );
    if (communityCredential) {
      canvas.authorization = this.appendCredentialRules(
        canvas.authorization,
        communityCredential
      );
    }
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

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    communityCredential: ICredential
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found for Canvas',
        LogContext.CONTEXT
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const communityMember = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.UPDATE],
      communityCredential.type,
      communityCredential.resourceID
    );
    communityMember.inheritable = false;
    newRules.push(communityMember);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
