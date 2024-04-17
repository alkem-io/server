import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { License } from './license.entity';
import { ILicense } from './license.interface';
import { ILicenseFeatureFlag } from '../feature-flag/feature.flag.interface';
import { LicenseFeatureFlagName } from '@common/enums/license.feature.flag.name';
import { UpdateLicenseInput } from './dto/license.dto.update';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { CreateFeatureFlagInput } from '../feature-flag/dto/feature.flag.dto.create';
import { FeatureFlagService } from '../feature-flag/feature.flag.service';
import { FeatureFlag } from '../feature-flag/feature.flag.entity';
import { matchEnumString } from '@common/utils/match.enum';

@Injectable()
export class LicenseService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private featureFlagService: FeatureFlagService,
    @InjectRepository(License)
    private licenseRepository: Repository<License>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createLicense(): Promise<ILicense> {
    const license: ILicense = License.create();
    license.authorization = AuthorizationPolicy.create();
    // default to active space
    license.visibility = SpaceVisibility.ACTIVE;

    // Set the feature flags
    const whiteboardRtFeatureFlag: CreateFeatureFlagInput = {
      name: LicenseFeatureFlagName.WHITEBOARD_MULTI_USER,
      enabled: false,
    };
    const calloutToCalloutTemplateFeatureFlag: CreateFeatureFlagInput = {
      name: LicenseFeatureFlagName.CALLOUT_TO_CALLOUT_TEMPLATE,
      enabled: false,
    };
    const vcFeatureFlag: CreateFeatureFlagInput = {
      name: LicenseFeatureFlagName.VIRTUAL_CONTRIBUTORS,
      enabled: false,
    };

    const featureFlagInputs: ILicenseFeatureFlag[] = [
      whiteboardRtFeatureFlag,
      calloutToCalloutTemplateFeatureFlag,
      vcFeatureFlag,
    ];
    license.featureFlags = [];
    for (const featureFlagInput of featureFlagInputs) {
      const featureFlag = await this.featureFlagService.createFeatureFlag(
        featureFlagInput
      );
      license.featureFlags.push(featureFlag);
    }

    return await this.licenseRepository.save(license);
  }

  async delete(licenseID: string): Promise<ILicense> {
    const license = await this.getLicenseOrFail(licenseID, {
      relations: {
        featureFlags: true,
      },
    });

    if (license.authorization)
      await this.authorizationPolicyService.delete(license.authorization);

    if (license.featureFlags) {
      for (const featureFlag of license.featureFlags) {
        await this.featureFlagService.delete((featureFlag as FeatureFlag).id);
      }
    }

    return await this.licenseRepository.remove(license as License);
  }

  public async getLicenseOrFail(
    licenseID: string,
    options?: FindOneOptions<License>
  ): Promise<ILicense | never> {
    const license = await this.licenseRepository.findOne({
      where: { id: licenseID },
      ...options,
    });
    if (!license)
      throw new EntityNotFoundException(
        `License not found: ${licenseID}`,
        LogContext.LICENSE
      );
    return license;
  }

  public async updateLicense(
    license: ILicense,
    licenseUpdateData: UpdateLicenseInput
  ): Promise<ILicense> {
    if (licenseUpdateData.visibility) {
      license.visibility = licenseUpdateData.visibility;
    }
    if (licenseUpdateData.featureFlags) {
      const featureFlags = await this.getFeatureFlags(license.id);
      for (const featureFlag of featureFlags) {
        const { name } = featureFlag;
        const matchResult = matchEnumString(LicenseFeatureFlagName, name);

        const featureFlagInput = licenseUpdateData.featureFlags.find(
          f => f.name === matchResult?.key
        );
        if (featureFlagInput) {
          const { enabled } = featureFlagInput;
          await this.featureFlagService.updateFeatureFlag(
            (featureFlag as FeatureFlag).id,
            { name, enabled }
          );
        }
      }
    }
    return license;
  }

  async save(license: ILicense): Promise<ILicense> {
    return await this.licenseRepository.save(license);
  }

  async getFeatureFlags(licenseID: string): Promise<ILicenseFeatureFlag[]> {
    const license = await this.getLicenseOrFail(licenseID, {
      relations: { featureFlags: true },
    });

    if (!license || !license.featureFlags)
      throw new EntityNotFoundException(
        `Feature flags for license with id: ${license.id} not found!`,
        LogContext.LICENSE
      );

    return license.featureFlags;
  }

  public async isFeatureFlagEnabled(
    license: ILicense,
    flag: LicenseFeatureFlagName
  ): Promise<boolean> {
    const featureFlags = await this.getFeatureFlags(license.id);
    const requestedFlag = featureFlags.find(f => f.name === flag);
    if (requestedFlag) return requestedFlag.enabled;
    return false;
  }
}
