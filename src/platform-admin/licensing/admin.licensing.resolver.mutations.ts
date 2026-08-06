import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { LicenseService } from '@domain/common/license/license.service';
import { IAccount } from '@domain/space/account/account.interface';
import { AccountService } from '@domain/space/account/account.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceLicenseService } from '@domain/space/space/space.service.license';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ILicensingFramework } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.interface';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
import { AdminLicensingService } from './admin.licensing.service';
import { AssignLicensePlanToAccount } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { AssignLicensePlanToSpace } from './dto/admin.licensing.dto.assign.license.plan.to.space';
import { RevokeLicensePlanFromAccount } from './dto/admin.licensing.dto.revoke.license.plan.from.account';
import { RevokeLicensePlanFromSpace } from './dto/admin.licensing.dto.revoke.license.plan.from.space';

/** T058 — A12's declared owner/legacy-reachers (T037/T040's grant). */
const A12_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_LICENSE_MANAGER,
];
const A12_LEGACY_REACHERS: readonly AuthorizationCredential[] = [];

@InstrumentResolver()
@Resolver()
export class AdminLicensingResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private spaceService: SpaceService,
    private spaceLicenseService: SpaceLicenseService,
    private accountService: AccountService,
    private accountLicenseService: AccountLicenseService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licenseService: LicenseService,
    private adminLicensingService: AdminLicensingService,
    private platformOperationsAuditService: PlatformOperationsAuditService,
    private readonly platformResourceAuditService: PlatformResourceAuditService
  ) {}

  // 027-platform-role-redesign (T079, Slice B, FR-021): `createWingbackAccount`
  // is deleted with the rest of the Wingback integration. It was the third of
  // the three admin mutations FR-021 removes — the other two lived in the
  // deleted `wingback-subscription` resolver. Accounts keep their
  // `externalSubscriptionID` column: no DDL is budgeted for this feature, and
  // the stored values are the only record of which accounts were ever
  // externally billed.

  @Mutation(() => IAccount, {
    description: 'Assign the specified LicensePlan to an Account.',
  })
  async assignLicensePlanToAccount(
    @CurrentActor() actorContext: ActorContext,
    @Args('planData') planData: AssignLicensePlanToAccount
  ): Promise<IAccount> {
    let licensing: ILicensingFramework | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingFrameworkService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing =
        await this.licensingFrameworkService.getDefaultLicensingOrFail();
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `assign licensePlan (${planData.licensePlanID}) on account (${planData.accountID})`
    );

    const account = await this.adminLicensingService.assignLicensePlanToAccount(
      planData,
      licensing.id
    );

    const updatedLicenses = await this.accountLicenseService.applyLicensePolicy(
      account.id
    );
    await this.licenseService.saveAll(updatedLicenses);

    // T058 — A12, single-path surface: gated on GRANT held on the
    // licensing-framework tree, which only PLATFORM_LICENSE_MANAGER (∪
    // legacy) holds.
    await this.platformResourceAuditService.recordEventForActor(
      actorContext,
      A12_INTENDED_OWNERS,
      A12_LEGACY_REACHERS,
      {
        resourceKind: 'account-license-plan',
        resourceId: account.id,
        licensePlan: planData.licensePlanID,
        outcome: 'license_assigned',
      }
    );

    return this.accountService.getAccountOrFail(account.id);
  }

  @Mutation(() => ISpace, {
    description: 'Assign the specified LicensePlan to a Space.',
  })
  @Profiling.api
  async assignLicensePlanToSpace(
    @CurrentActor() actorContext: ActorContext,
    @Args('planData') planData: AssignLicensePlanToSpace
  ): Promise<ISpace> {
    let licensing: ILicensingFramework | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingFrameworkService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing =
        await this.licensingFrameworkService.getDefaultLicensingOrFail();
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `assign licensePlan (${planData.licensePlanID}) on account (${planData.spaceID})`
    );

    const space = await this.adminLicensingService.assignLicensePlanToSpace(
      planData,
      licensing.id
    );

    const updatedLicenses = await this.spaceLicenseService.applyLicensePolicy(
      space.id
    );
    await this.licenseService.saveAll(updatedLicenses);

    await this.platformResourceAuditService.recordEventForActor(
      actorContext,
      A12_INTENDED_OWNERS,
      A12_LEGACY_REACHERS,
      {
        resourceKind: 'space-license-plan',
        resourceId: space.id,
        licensePlan: planData.licensePlanID,
        outcome: 'license_assigned',
      }
    );

    return this.spaceService.getSpaceOrFail(space.id);
  }

  @Mutation(() => IAccount, {
    description: 'Revokes the specified LicensePlan on an Account.',
  })
  @Profiling.api
  async revokeLicensePlanFromAccount(
    @CurrentActor() actorContext: ActorContext,
    @Args('planData') planData: RevokeLicensePlanFromAccount
  ): Promise<IAccount> {
    let licensing: ILicensingFramework | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingFrameworkService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing =
        await this.licensingFrameworkService.getDefaultLicensingOrFail();
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `revoke licensePlan (${planData.licensePlanID}) on account (${planData.accountID})`
    );

    const account =
      await this.adminLicensingService.revokeLicensePlanFromAccount(
        planData,
        licensing.id
      );

    const updatedLicenses = await this.accountLicenseService.applyLicensePolicy(
      account.id
    );
    await this.licenseService.saveAll(updatedLicenses);

    await this.platformResourceAuditService.recordEventForActor(
      actorContext,
      A12_INTENDED_OWNERS,
      A12_LEGACY_REACHERS,
      {
        resourceKind: 'account-license-plan',
        resourceId: account.id,
        licensePlan: planData.licensePlanID,
        outcome: 'license_revoked',
      }
    );

    return this.accountService.getAccountOrFail(account.id);
  }

  @Mutation(() => ISpace, {
    description: 'Revokes the specified LicensePlan on a Space.',
  })
  @Profiling.api
  async revokeLicensePlanFromSpace(
    @CurrentActor() actorContext: ActorContext,
    @Args('planData') planData: RevokeLicensePlanFromSpace
  ): Promise<ISpace> {
    let licensing: ILicensingFramework | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingFrameworkService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing =
        await this.licensingFrameworkService.getDefaultLicensingOrFail();
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `revoke licensePlan (${planData.licensePlanID}) on account (${planData.spaceID})`
    );

    const space = await this.adminLicensingService.revokeLicensePlanFromSpace(
      planData,
      licensing.id
    );

    const updatedLicenses = await this.spaceLicenseService.applyLicensePolicy(
      space.id
    );
    await this.licenseService.saveAll(updatedLicenses);

    await this.platformResourceAuditService.recordEventForActor(
      actorContext,
      A12_INTENDED_OWNERS,
      A12_LEGACY_REACHERS,
      {
        resourceKind: 'space-license-plan',
        resourceId: space.id,
        licensePlan: planData.licensePlanID,
        outcome: 'license_revoked',
      }
    );

    return this.spaceService.getSpaceOrFail(space.id);
  }

  @Mutation(() => Boolean, {
    description: 'Reset all license plans on Accounts',
  })
  @Profiling.api
  async resetLicenseOnAccounts(
    @CurrentActor() actorContext: ActorContext
  ): Promise<boolean> {
    const licensing =
      await this.licensingFrameworkService.getDefaultLicensingOrFail();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      licensing.authorization,
      AuthorizationPrivilege.LICENSE_RESET,
      'reset licenses on accounts'
    );

    try {
      const accounts = await this.adminLicensingService.getAllAccounts();
      for (const account of accounts) {
        const updatedLicenses =
          await this.accountLicenseService.applyLicensePolicy(account.id);
        await this.licenseService.saveAll(updatedLicenses);
      }
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'resetLicenseOnAccounts',
        outcome: 'success',
      });
      return true;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'resetLicenseOnAccounts',
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }
}
