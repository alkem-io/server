import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LicensePlan } from './license.plan.entity';
import { ILicensePlan } from './license.plan.interface';
import { UpdateLicensePlanInput } from './dto/license.plan.dto.update';
import { CreateLicensePlanInput } from './dto/license.plan.dto.create';
import { DeleteLicensePlanInput } from './dto/license.plan.dto.delete';

@Injectable()
export class LicensePlanService {
  constructor(
    @InjectRepository(LicensePlan)
    private licensePlanRepository: Repository<LicensePlan>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createLicensePlan(
    licensePlanData: CreateLicensePlanInput
  ): Promise<ILicensePlan> {
    const licensePlan: ILicensePlan = LicensePlan.create();
    licensePlan.name = licensePlanData.name;

    return await this.save(licensePlan);
  }

  async save(licensePlan: ILicensePlan): Promise<ILicensePlan> {
    return await this.licensePlanRepository.save(licensePlan);
  }

  async update(licensePlanData: UpdateLicensePlanInput): Promise<ILicensePlan> {
    const licensePlan = await this.getLicensePlanOrFail(licensePlanData.ID);

    return await this.licensePlanRepository.save(licensePlan);
  }

  async deleteLicensePlan(
    deleteData: DeleteLicensePlanInput
  ): Promise<ILicensePlan> {
    const licensePlan = await this.getLicensePlanOrFail(deleteData.ID);

    const result = await this.licensePlanRepository.remove(
      licensePlan as LicensePlan
    );
    result.id = deleteData.ID;
    return result;
  }

  async getLicensePlanOrFail(
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
        LogContext.SPACES
      );
    }
    return licensePlan;
  }
}
