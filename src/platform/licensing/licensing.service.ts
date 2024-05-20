import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { CreateLicensePlanOnLicensingInput } from './dto/license.manager.dto.create.license.plan';
import { Licensing } from './licensing.entity';
import { ILicensing } from './licensing.interface';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';
import { LicensePlanService } from '@platform/license-plan/license.plan.service';
import { ILicensePolicy } from '@platform/license-policy/license.policy.interface';

@Injectable()
export class LicensingService {
  constructor(
    private licensePlanService: LicensePlanService,
    @InjectRepository(Licensing)
    private licensingRepository: Repository<Licensing>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getLicensingOrFail(
    licensingID: string,
    options?: FindOneOptions<Licensing>
  ): Promise<ILicensing> {
    const licensing = await this.licensingRepository.findOne({
      where: { id: licensingID },
      ...options,
    });

    if (!licensing) {
      throw new EntityNotFoundException(
        'No License Manager found!',
        LogContext.LICENSE
      );
    }
    return licensing;
  }

  public async save(licensing: ILicensing): Promise<ILicensing> {
    return this.licensingRepository.save(licensing);
  }

  public async getLicensePlans(licensingID: string): Promise<ILicensePlan[]> {
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

  public async createLicensePlan(
    licensePlanData: CreateLicensePlanOnLicensingInput
  ): Promise<ILicensePlan> {
    const licensing = await this.getLicensingOrFail(
      licensePlanData.licensingID,
      {
        relations: {
          plans: true,
        },
      }
    );
    if (!licensing.plans)
      throw new EntityNotInitializedException(
        `Licensing (${licensing}) not initialised`,
        LogContext.LIBRARY
      );

    const licensePlan = await this.licensePlanService.createLicensePlan(
      licensePlanData
    );
    licensing.plans.push(licensePlan);
    await this.licensingRepository.save(licensing);

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
