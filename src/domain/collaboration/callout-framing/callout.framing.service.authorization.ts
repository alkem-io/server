import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CalloutFramingService } from './callout.framing.service';
import { ICalloutFraming } from './callout.framing.interface';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard';
import { MemoAuthorizationService } from '@domain/common/memo';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';

@Injectable()
export class CalloutFramingAuthorizationService {
  constructor(
    private calloutFramingService: CalloutFramingService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService,
    private memoAuthorizationService: MemoAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    calloutFramingInput: ICalloutFraming,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const calloutFraming =
      await this.calloutFramingService.getCalloutFramingOrFail(
        calloutFramingInput.id,
        {
          loadEagerRelations: false,
          relations: {
            authorization: true,
            profile: true,
            whiteboard: true,
            memo: true,
          },
          select: {
            id: true,
            authorization:
              this.authorizationPolicyService.authorizationSelectOptions,
            profile: {
              id: true,
            },
            whiteboard: {
              id: true,
            },
            memo: {
              id: true,
            },
          },
        }
      );

    if (!calloutFraming.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load Profile on calloutFraming:  ${calloutFraming.id} `,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    calloutFraming.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        calloutFraming.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(calloutFraming.authorization);

    const framingAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        calloutFraming.profile.id,
        calloutFraming.authorization
      );
    updatedAuthorizations.push(...framingAuthorizations);

    if (calloutFraming.whiteboard) {
      const whiteboardAuthorizations =
        await this.whiteboardAuthorizationService.applyAuthorizationPolicy(
          calloutFraming.whiteboard.id,
          calloutFraming.authorization
        );
      updatedAuthorizations.push(...whiteboardAuthorizations);
    }

    if (calloutFraming.memo) {
      const memoAuthorizations =
        await this.memoAuthorizationService.applyAuthorizationPolicy(
          calloutFraming.memo.id,
          calloutFraming.authorization
        );
      updatedAuthorizations.push(...memoAuthorizations);
    }

    return updatedAuthorizations;
  }
}
