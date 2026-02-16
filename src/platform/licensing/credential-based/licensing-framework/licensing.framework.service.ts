import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { LicensePlanService } from '@platform/licensing/credential-based/license-plan/license.plan.service';
import { ILicensePolicy } from '@platform/licensing/credential-based/license-policy/license.policy.interface';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CreateLicensePlanOnLicensingFrameworkInput } from './dto/licensing.framework.dto.create.license.plan';
import { licensingFrameworks } from './licensing.framework.schema';
import { ILicensingFramework } from './licensing.framework.interface';

@Injectable()
export class LicensingFrameworkService {
  constructor(
    private licensePlanService: LicensePlanService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getLicensingOrFail(
    licensingID: string,
    options?: { relations?: Record<string, boolean | Record<string, any>> }
  ): Promise<ILicensingFramework> {
    const with_ = options?.relations
      ? Object.fromEntries(
          Object.entries(options.relations).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              return [key, { with: value }];
            }
            return [key, value];
          })
        )
      : undefined;

    const licensing = await this.db.query.licensingFrameworks.findFirst({
      where: eq(licensingFrameworks.id, licensingID),
      with: with_ as any,
    });

    if (!licensing) {
      throw new EntityNotFoundException(
        `Unable to retrieve the Licensing for the platform, licensingID: ${licensingID}`,
        LogContext.LICENSE
      );
    }
    return licensing as unknown as ILicensingFramework;
  }

  async getDefaultLicensingOrFail(
    options?: { relations?: Record<string, boolean> }
  ): Promise<ILicensingFramework | never> {
    const with_ = options?.relations
      ? Object.fromEntries(
          Object.entries(options.relations).map(([key, value]) => [key, value])
        )
      : undefined;

    const allFrameworks = await this.db.query.licensingFrameworks.findMany({
      with: with_ as any,
    });

    if (allFrameworks.length !== 1) {
      throw new EntityNotFoundException(
        'Unable to retrieve the Default Licensing for the platform',
        LogContext.LICENSE
      );
    }
    return allFrameworks[0] as unknown as ILicensingFramework;
  }

  public async save(
    licensing: ILicensingFramework
  ): Promise<ILicensingFramework> {
    const [saved] = await this.db
      .insert(licensingFrameworks)
      .values(licensing as any)
      .onConflictDoUpdate({
        target: licensingFrameworks.id,
        set: licensing as any,
      })
      .returning();
    return saved as unknown as ILicensingFramework;
  }

  public async getLicensePlansOrFail(
    licensingID: string
  ): Promise<ILicensePlan[] | never> {
    const licensing = await this.getLicensingOrFail(licensingID, {
      relations: {
        plans: true,
      },
    });
    if (!licensing.plans)
      throw new EntityNotFoundException(
        `Unable to load License Plans: ${licensing.id}`,
        LogContext.LICENSE
      );

    return licensing.plans;
  }

  public async getLicensePlanOrFail(
    licensingID: string,
    planID: string
  ): Promise<ILicensePlan> {
    const licensePlans = await this.getLicensePlansOrFail(licensingID);
    const plan = licensePlans.find(plan => plan.id === planID);
    if (!plan) {
      throw new EntityNotFoundException(
        `Licensing (${licensingID}): Unable to load License Plan of the provided ID: ${planID}`,
        LogContext.LICENSE
      );
    }

    return plan;
  }

  public async createLicensePlan(
    licensePlanData: CreateLicensePlanOnLicensingFrameworkInput
  ): Promise<ILicensePlan> {
    const licensing = await this.getLicensingOrFail(
      licensePlanData.licensingFrameworkID,
      {
        relations: {
          plans: true,
        },
      }
    );
    if (!licensing.plans)
      throw new EntityNotInitializedException(
        `Licensing (${licensing}) not initialised`,
        LogContext.LICENSE
      );

    const licensePlan =
      await this.licensePlanService.createLicensePlan(licensePlanData);
    licensing.plans.push(licensePlan);
    await this.save(licensing);

    return licensePlan;
  }

  async getLicensePolicy(licensingID: string): Promise<ILicensePolicy> {
    const licensing = await this.getLicensingOrFail(licensingID, {
      relations: {
        licensePolicy: true,
      },
    });
    const licensePolicy = licensing.licensePolicy;

    if (!licensePolicy) {
      throw new EntityNotFoundException(
        `Unable to find licensepolicy: ${licensing.id}`,
        LogContext.LICENSE
      );
    }

    return licensePolicy;
  }
}
