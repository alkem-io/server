import { ActorService } from '@domain/actor/actor/actor.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class LicenseIssuerService {
  constructor(
    private actorService: ActorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  /**
   * Assign a license plan credential to an actor.
   * @param actorId - The ID of the actor (Space, Account, etc.)
   * @param licensePlan - The license plan to assign
   * @param resourceID - The resource ID for the credential
   */
  public async assignLicensePlan(
    actorId: string,
    licensePlan: ILicensePlan,
    resourceID: string
  ): Promise<void> {
    let expires: Date | undefined;
    if (licensePlan.trialEnabled) {
      const now = new Date();
      const oneMonthFromNow = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        0,
        0,
        0
      );
      expires = oneMonthFromNow;
    }
    try {
      await this.actorService.grantCredentialOrFail(actorId, {
        type: licensePlan.licenseCredential,
        resourceID: resourceID,
        expires: expires,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to assign license credential ${licensePlan.licenseCredential} ${licensePlan.id} to actor ${actorId}: ${error}`
      );
    }
  }

  /**
   * Revoke a license plan credential from an actor.
   * @param actorId - The ID of the actor (Space, Account, etc.)
   * @param licensePlan - The license plan to revoke
   * @param resourceID - The resource ID for the credential
   */
  public async revokeLicensePlan(
    actorId: string,
    licensePlan: ILicensePlan,
    resourceID: string
  ): Promise<void> {
    await this.actorService.revokeCredential(actorId, {
      type: licensePlan.licenseCredential,
      resourceID: resourceID,
    });
  }
}
