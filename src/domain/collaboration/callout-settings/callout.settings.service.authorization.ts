import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CalloutSettingsService } from './callout.settings.service';
import { ICalloutSettings } from './callout.settings.interface';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';

@Injectable()
export class CalloutSettingsAuthorizationService {
  constructor(
    private calloutSettingsService: CalloutSettingsService,
    private authorizationPolicyService: AuthorizationPolicyService
    /*private profileAuthorizationService: ProfileAuthorizationService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService
    */
  ) {}

  public async applyAuthorizationPolicy(
    calloutSettingsInput: ICalloutSettings,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const calloutSettings =
      await this.calloutSettingsService.getCalloutSettingsOrFail(
        calloutSettingsInput.id,
        {
          loadEagerRelations: false,
          relations: {
            authorization: true,
            /*profile: true,
            whiteboard: true,
            */
          },
          select: {
            id: true,
            authorization:
              this.authorizationPolicyService.authorizationSelectOptions,
            /*profile: {
              id: true,
            },
            whiteboard: {
              id: true,
            },
            */
          },
        }
      );

    /*if (!calloutSettings.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load Profile on calloutSettings:  ${calloutSettings.id} `,
        LogContext.COLLABORATION
      );
    }
      */
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    calloutSettings.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        calloutSettings.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(calloutSettings.authorization);

    /*
    const settingsAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        calloutSettings.profile.id,
        calloutSettings.authorization
      );
    updatedAuthorizations.push(...settingsAuthorizations);

    if (calloutSettings.whiteboard) {
      const whiteboardAuthorizations =
        await this.whiteboardAuthorizationService.applyAuthorizationPolicy(
          calloutSettings.whiteboard.id,
          calloutSettings.authorization
        );
      updatedAuthorizations.push(...whiteboardAuthorizations);
    }
      */

    return updatedAuthorizations;
  }
}
