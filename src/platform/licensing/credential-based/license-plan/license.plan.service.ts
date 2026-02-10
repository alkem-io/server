import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { CreateLicensePlanInput } from './dto/license.plan.dto.create';
import { DeleteLicensePlanInput } from './dto/license.plan.dto.delete';
import { UpdateLicensePlanInput } from './dto/license.plan.dto.update';
import { LicensePlan } from './license.plan.entity';
import { ILicensePlan } from './license.plan.interface';

@Injectable()
export class LicensePlanService {
  constructor(
    @InjectRepository(LicensePlan)
    private licensePlanRepository: Repository<LicensePlan>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createLicensePlan(
    licensePlanData: CreateLicensePlanInput
  ): Promise<ILicensePlan> {
    const licensePlan: ILicensePlan = LicensePlan.create();
    licensePlan.name = licensePlanData.name;
    licensePlan.assignToNewOrganizationAccounts =
      licensePlanData.assignToNewOrganizationAccounts;
    licensePlan.assignToNewUserAccounts =
      licensePlanData.assignToNewUserAccounts;
    licensePlan.enabled = licensePlanData.enabled;
    licensePlan.isFree = licensePlanData.isFree;
    licensePlan.licenseCredential = licensePlanData.licenseCredential;
    licensePlan.pricePerMonth = licensePlanData.pricePerMonth;
    licensePlan.requiresContactSupport = licensePlanData.requiresContactSupport;
    licensePlan.requiresPaymentMethod = licensePlanData.requiresPaymentMethod;
    licensePlan.sortOrder = licensePlanData.sortOrder;
    licensePlan.trialEnabled = licensePlanData.trialEnabled;
    licensePlan.type = licensePlanData.type;

    return await this.save(licensePlan);
  }

  public async save(licensePlan: ILicensePlan): Promise<ILicensePlan> {
    return await this.licensePlanRepository.save(licensePlan);
  }

  public async update(
    licensePlanData: UpdateLicensePlanInput
  ): Promise<ILicensePlan> {
    const licensePlan = await this.getLicensePlanOrFail(licensePlanData.ID);

    return await this.licensePlanRepository.save(licensePlan);
  }

  public async deleteLicensePlan(
    deleteData: DeleteLicensePlanInput
  ): Promise<ILicensePlan> {
    const licensePlan = await this.getLicensePlanOrFail(deleteData.ID);

    const result = await this.licensePlanRepository.remove(
      licensePlan as LicensePlan
    );
    result.id = deleteData.ID;
    return result;
  }

  public async getLicensePlanOrFail(
    licensePlanID: string,
    options?: FindOneOptions<LicensePlan>
  ): Promise<ILicensePlan | never> {
    const licensePlan = await this.licensePlanRepository.findOne({
      where: { id: licensePlanID },
      ...options,
    });

    if (!licensePlan) {
      throw new EntityNotFoundException(
        `Unable to find LicensePlan with ID: ${licensePlanID}`,
        LogContext.LICENSE
      );
    }
    return licensePlan;
  }

  public async licensePlanByNameExists(name: string): Promise<boolean> {
    const licensePlan = await this.licensePlanRepository.findOne({
      where: { name },
    });

    if (!licensePlan) {
      return false;
    }
    return true;
  }
}
