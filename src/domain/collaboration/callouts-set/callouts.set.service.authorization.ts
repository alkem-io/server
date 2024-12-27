import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { CalloutAuthorizationService } from '../callout/callout.service.authorization';
import { CalloutsSetService } from './callouts.set.service';
import { ICalloutsSet } from './callouts.set.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';

@Injectable()
export class CalloutsSetAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutsSetService: CalloutsSetService,
    private calloutAuthorizationService: CalloutAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    calloutsSetInput: ICalloutsSet,
    parentAuthorization: IAuthorizationPolicy | undefined,
    roleSet?: IRoleSet,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy[]> {
    const calloutsSet = await this.calloutsSetService.getCalloutsSetOrFail(
      calloutsSetInput.id,
      {
        relations: {
          callouts: true,
        },
      }
    );

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit from the parent
    calloutsSet.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        calloutsSet.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(calloutsSet.authorization);

    if (calloutsSet.callouts) {
      for (const callout of calloutsSet.callouts) {
        const calloutAuthorizations =
          await this.calloutAuthorizationService.applyAuthorizationPolicy(
            callout.id,
            parentAuthorization,
            roleSet,
            spaceSettings
          );
        updatedAuthorizations.push(...calloutAuthorizations);
      }
    }

    return updatedAuthorizations;
  }
}
