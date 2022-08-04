import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { CalloutService } from './callout.service';
import { ICallout, Callout } from '@domain/collaboration/callout';
import { CanvasAuthorizationService } from '@domain/common/canvas/canvas.service.authorization';
import { AspectAuthorizationService } from '@domain/collaboration/aspect/aspect.service.authorization';
import { AuthorizationCredential } from '@common/enums/authorization.credential';

@Injectable()
export class CalloutAuthorizationService {
  constructor(
    private calloutService: CalloutService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    private aspectAuthorizationService: AspectAuthorizationService,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
  ) {}

  public async applyAuthorizationPolicy(
    callout: ICallout,
    parentAuthorization: IAuthorizationPolicy | undefined,
    userID: string
  ): Promise<ICallout> {
    callout.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        callout.authorization,
        parentAuthorization
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];
    // Allow users to update their own created callout
    const selfCreatedCallout = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      AuthorizationCredential.USER_SELF_MANAGEMENT,
      userID
    );
    newRules.push(selfCreatedCallout);

    // callout.authorization = this.appendCredentialRules(
    //   callout.authorization,
    //   callout.id,
    //   communityCredential
    // );
    callout.authorization = this.appendPrivilegeRules(callout.authorization);

    callout.aspects = await this.calloutService.getAspectsFromCallout(callout);
    for (const aspect of callout.aspects) {
      await this.aspectAuthorizationService.applyAuthorizationPolicy(
        aspect,
        callout.authorization
      );
    }

    callout.canvases = await this.calloutService.getCanvasesFromCallout(
      callout
    );
    for (const canvas of callout.canvases) {
      await this.canvasAuthorizationService.applyAuthorizationPolicy(
        canvas,
        callout.authorization
      );
    }

    return await this.calloutRepository.save(callout);
  }

  // private appendCredentialRules(
  //   authorization: IAuthorizationPolicy | undefined,
  //   calloutID: string,
  //   membershipCredential: CredentialDefinition
  // ): IAuthorizationPolicy {
  //   if (!authorization)
  //     throw new EntityNotInitializedException(
  //       `Authorization definition not found for Callout: ${calloutID}`,
  //       LogContext.COLLABORATION
  //     );

  //   const newRules: AuthorizationPolicyRuleCredential[] = [];

  //   const communityMemberNotInherited = new AuthorizationPolicyRuleCredential(
  //     [
  //       AuthorizationPrivilege.CREATE_ASPECT,
  //       AuthorizationPrivilege.CREATE_CANVAS,
  //     ],
  //     membershipCredential.type,
  //     membershipCredential.resourceID
  //   );
  //   communityMemberNotInherited.inheritable = false;
  //   newRules.push(communityMemberNotInherited);

  //   // separate rule as do want the update canvas / ability to create a comment to cascade
  //   const communityMemberInherited = new AuthorizationPolicyRuleCredential(
  //     [
  //       AuthorizationPrivilege.UPDATE_CANVAS,
  //       AuthorizationPrivilege.CREATE_COMMENT,
  //     ],
  //     membershipCredential.type,
  //     membershipCredential.resourceID
  //   );
  //   newRules.push(communityMemberInherited);

  //   const updatedAuthorization =
  //     this.authorizationPolicyService.appendCredentialAuthorizationRules(
  //       authorization,
  //       newRules
  //     );

  //   return updatedAuthorization;
  // }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [
        AuthorizationPrivilege.CREATE_CANVAS,
        AuthorizationPrivilege.CREATE_ASPECT,
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
