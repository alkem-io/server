import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AssignLicensePlanToSpace } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { LicensingService } from '@platform/licensing/licensing.service';
import { LicenseIssuerService } from '@platform/license-issuer/license.issuer.service';
import { RevokeLicensePlanFromSpace } from './dto/admin.licensing.dto.revoke.license.plan.from.account';
import { SpaceService } from '@domain/space/space/space.service';
import { ISpace } from '@domain/space/space/space.interface';

@Injectable()
export class AdminLicensingService {
  constructor(
    private licensingService: LicensingService,
    private licenseIssuerService: LicenseIssuerService,
    private spaceService: SpaceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async assignLicensePlanToSpace(
    licensePlanData: AssignLicensePlanToSpace,
    licensingID: string
  ): Promise<ISpace> {
    const licensePlan = await this.licensingService.getLicensePlanOrFail(
      licensingID,
      licensePlanData.licensePlanID
    );

    // Todo: assign the actual credential for the license plan
    const space = await this.spaceService.getSpaceOrFail(
      licensePlanData.spaceID,
      {
        relations: {
          agent: true,
        },
      }
    );
    if (!space.agent) {
      throw new EntityNotInitializedException(
        `Space (${space}) does not have an agent`,
        LogContext.LICENSE
      );
    }
    space.agent = await this.licenseIssuerService.assignLicensePlan(
      space.agent,
      licensePlan,
      space.id
    );

    return space;
  }

  public async revokeLicensePlanFromSpace(
    licensePlanData: RevokeLicensePlanFromSpace,
    licensingID: string
  ): Promise<ISpace> {
    const licensePlan = await this.licensingService.getLicensePlanOrFail(
      licensingID,
      licensePlanData.licensePlanID
    );

    // Todo: assign the actual credential for the license plan
    const space = await this.spaceService.getSpaceOrFail(
      licensePlanData.spaceID,
      {
        relations: {
          agent: true,
        },
      }
    );
    if (!space.agent) {
      throw new EntityNotInitializedException(
        `Account (${space}) does not have an agent`,
        LogContext.LICENSE
      );
    }
    space.agent = await this.licenseIssuerService.revokeLicensePlan(
      space.agent,
      licensePlan,
      space.id
    );

    return space;
  }
}
