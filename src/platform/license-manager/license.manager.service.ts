import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { CreateLicensePlanOnLicenseManagerInput } from './dto/license.manager.dto.create.license.plan';
import { LicenseManager } from './license.manager.entity';
import { ILicenseManager } from './license.manager.interface';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';
import { LicensePlanService } from '@platform/license-plan/license.plan.service';
import { ILicensePolicy } from '@platform/license-policy/license.policy.interface';

@Injectable()
export class LicenseManagerService {
  constructor(
    private licensePlanService: LicensePlanService,
    @InjectRepository(LicenseManager)
    private licenseManagerRepository: Repository<LicenseManager>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getLicenseManagerOrFail(
    licenseManagerID: string,
    options?: FindOneOptions<LicenseManager>
  ): Promise<ILicenseManager> {
    const licenseManager = await this.licenseManagerRepository.findOne({
      where: { id: licenseManagerID },
      ...options,
    });

    if (!licenseManager) {
      throw new EntityNotFoundException(
        'No License Manager found!',
        LogContext.LICENSE
      );
    }
    return licenseManager;
  }

  public async save(licenseManager: ILicenseManager): Promise<ILicenseManager> {
    return this.licenseManagerRepository.save(licenseManager);
  }

  public async getLicensePlans(
    licenseManagerID: string
  ): Promise<ILicensePlan[]> {
    const licenseManager = await this.getLicenseManagerOrFail(
      licenseManagerID,
      {
        relations: {
          plans: true,
        },
      }
    );
    if (!licenseManager.plans)
      throw new EntityNotFoundException(
        `Unable to load License Plans: ${licenseManager.id}`,
        LogContext.LICENSE
      );

    return licenseManager.plans;
  }

  public async createLicensePlan(
    licensePlanData: CreateLicensePlanOnLicenseManagerInput
  ): Promise<ILicensePlan> {
    const licenseManager = await this.getLicenseManagerOrFail(
      licensePlanData.licenseManagerID,
      {
        relations: {
          plans: true,
        },
      }
    );
    if (!licenseManager.plans)
      throw new EntityNotInitializedException(
        `LicenseManager (${licenseManager}) not initialised`,
        LogContext.LIBRARY
      );

    const licensePlan = await this.licensePlanService.createLicensePlan(
      licensePlanData
    );
    licenseManager.plans.push(licensePlan);
    await this.licenseManagerRepository.save(licenseManager);

    return licensePlan;
  }

  async getLicensePolicy(licenseManagerID: string): Promise<ILicensePolicy> {
    const licenseManager = await this.getLicenseManagerOrFail(
      licenseManagerID,
      {
        relations: {
          licensePolicy: true,
        },
      }
    );
    const licensePolicy = licenseManager.licensePolicy;

    if (!licensePolicy) {
      throw new EntityNotFoundException(
        `Unable to find licensepolicy: ${licenseManager.id}`,
        LogContext.LICENSE
      );
    }

    return licensePolicy;
  }
}
