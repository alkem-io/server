import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository, FindOneOptions } from 'typeorm';
import { FeatureFlag } from './feature.flag.entity';
import { ILicenseFeatureFlag } from './feature.flag.interface';
import { UpdateFeatureFlagInput } from './dto/feature.flag.dto.update';
import { CreateFeatureFlagInput } from './dto/feature.flag.dto.create';

@Injectable()
export class FeatureFlagService {
  constructor(
    @InjectRepository(FeatureFlag)
    private featureFlagRepository: Repository<FeatureFlag>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createFeatureFlag(
    createFeatureFlagInput: CreateFeatureFlagInput
  ): Promise<ILicenseFeatureFlag> {
    const featureFlag: ILicenseFeatureFlag = FeatureFlag.create();
    featureFlag.name = createFeatureFlagInput.name;
    featureFlag.enabled = createFeatureFlagInput.enabled;

    return await this.featureFlagRepository.save(featureFlag);
  }

  async delete(featureFlagID: string): Promise<ILicenseFeatureFlag> {
    const featureFlag = await this.getFeatureFlagOrFail(featureFlagID);

    return await this.featureFlagRepository.remove(featureFlag as FeatureFlag);
  }

  async getFeatureFlagOrFail(
    featureFlagID: string,
    options?: FindOneOptions<FeatureFlag>
  ): Promise<ILicenseFeatureFlag | never> {
    const featureFlag = await this.featureFlagRepository.findOne({
      where: { id: featureFlagID },
      ...options,
    });
    if (!featureFlag)
      throw new EntityNotFoundException(
        `Feature Flag  not found: ${featureFlagID}`,
        LogContext.LICENSE
      );
    return featureFlag;
  }

  async updateFeatureFlag(
    featureFlagID: string,
    licenseUpdateData: UpdateFeatureFlagInput
  ): Promise<ILicenseFeatureFlag> {
    const featureFlag = await this.getFeatureFlagOrFail(featureFlagID);
    featureFlag.enabled = licenseUpdateData.enabled;
    featureFlag.name = licenseUpdateData.name;
    return await this.save(featureFlag);
  }

  async save(featureFlag: ILicenseFeatureFlag): Promise<ILicenseFeatureFlag> {
    return await this.featureFlagRepository.save(featureFlag);
  }
}
