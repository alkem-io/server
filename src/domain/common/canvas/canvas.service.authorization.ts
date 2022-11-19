import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CanvasService } from './canvas.service';
import { ICanvas } from './canvas.interface';
import { CanvasCheckoutAuthorizationService } from '../canvas-checkout/canvas.checkout.service.authorization';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

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

    canvas.authorization = this.appendCredentialRules(canvas);
    canvas.authorization = this.appendPrivilegeRules(canvas.authorization);

    if (canvas.checkout) {
      canvas.checkout.authorization =
        await this.canvasCheckoutAuthorizationService.applyAuthorizationPolicy(
          canvas.checkout,
          canvas.authorization
        );
    }

    if (canvas.preview) {
      canvas.preview.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          canvas.preview.authorization,
          canvas.authorization
        );
    }

    return await this.canvasService.save(canvas);
  }

  private appendCredentialRules(canvas: ICanvas): IAuthorizationPolicy {
    const authorization = canvas.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Canvas: ${canvas.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const manageCanvasCreatedByPolicy =
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
            resourceID: canvas.createdBy,
          },
        ]
      );
    newRules.push(manageCanvasCreatedByPolicy);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private extendAuthorizationPolicyForCheckoutOwner(
    checkout: ICanvasCheckout
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
        ]
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
      [AuthorizationPrivilege.UPDATE_CANVAS],
      AuthorizationPrivilege.UPDATE
    );
    privilegeRules.push(createPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
