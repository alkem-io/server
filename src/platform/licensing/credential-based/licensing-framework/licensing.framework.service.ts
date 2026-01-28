import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { LicensePlanService } from '@platform/licensing/credential-based/license-plan/license.plan.service';
import { ILicensePolicy } from '@platform/licensing/credential-based/license-policy/license.policy.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { CreateLicensePlanOnLicensingFrameworkInput } from './dto/licensing.framework.dto.create.license.plan';
import { LicensingFramework } from './licensing.framework.entity';
import { ILicensingFramework } from './licensing.framework.interface';

@Injectable()
export class LicensingFrameworkService {
  constructor(
    private licensePlanService: LicensePlanService,
    @InjectRepository(LicensingFramework)
    private licensingFrameworkRepository: Repository<LicensingFramework>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getLicensingOrFail(
    licensingID: string,
    options?: FindOneOptions<LicensingFramework>
  ): Promise<ILicensingFramework> {
    const licensing = await this.licensingFrameworkRepository.findOne({
      where: { id: licensingID },
      ...options,
    });

    if (!licensing) {
      throw new EntityNotFoundException(
        `Unable to retrieve the Licensing for the platform, licensingID: ${licensingID}`,
        LogContext.LICENSE
      );
    }
    return licensing;
  }

  async getDefaultLicensingOrFail(
    options?: FindOneOptions<LicensingFramework>
  ): Promise<ILicensingFramework | never> {
    const licensingFrameworks = await this.licensingFrameworkRepository.find({
      ...options,
    });

    if (licensingFrameworks.length !== 1) {
      throw new EntityNotFoundException(
        'Unable to retrieve the Default Licensing for the platform',
        LogContext.LICENSE
      );
    }
    return licensingFrameworks[0];
  }

  public async save(
    licensing: ILicensingFramework
  ): Promise<ILicensingFramework> {
    return this.licensingFrameworkRepository.save(licensing);
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
    await this.licensingFrameworkRepository.save(licensing);

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
