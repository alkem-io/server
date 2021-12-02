import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { ICanvasCheckout } from './canvas.checkout.interface';
import { CanvasCheckout } from './canvas.checkout.entity';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';

@Injectable()
export class CanvasCheckoutAuthorizationService {
  constructor(
    private authorizationPolicy: AuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(CanvasCheckout)
    private canvasCheckoutRepository: Repository<CanvasCheckout>
  ) {}

  async applyAuthorizationPolicy(
    canvasCheckout: ICanvasCheckout
  ): Promise<ICanvasCheckout> {
    canvasCheckout.authorization = await this.authorizationPolicyService.reset(
      canvasCheckout.authorization
    );
    canvasCheckout.authorization = this.appendCredentialRules(
      canvasCheckout.authorization,
      canvasCheckout.id
    );

    return await this.canvasCheckoutRepository.save(canvasCheckout);
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    canvasCheckoutID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for CanvasCheckout: ${canvasCheckoutID}`,
        LogContext.COMMUNITY
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const globalAdmin = {
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
    };
    newRules.push(globalAdmin);

    const communityAdmin = {
      type: AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
    };
    newRules.push(communityAdmin);

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
