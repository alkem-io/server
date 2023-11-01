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

@Injectable()
export class LicenseService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(License)
    private licenseRepository: Repository<License>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createLicense(): Promise<ILicense> {
    const license: ILicense = new License();
    license.authorization = new AuthorizationPolicy();
    // default to active space
    license.visibility = SpaceVisibility.ACTIVE;

    // Set the feature flags
    const whiteboardRtFeatureFlag: ILicenseFeatureFlag = {
      name: LicenseFeatureFlagName.WHITEBOART_RT,
      enabled: false,
    };
    const calloutToCalloutTemplateFeatureFlag: ILicenseFeatureFlag = {
      name: LicenseFeatureFlagName.CALLOUT_TO_CALLOUT_TEMPLATE,
      enabled: false,
    };
    const featureFlags: ILicenseFeatureFlag[] = [
      whiteboardRtFeatureFlag,
      calloutToCalloutTemplateFeatureFlag,
    ];
    license.featureFlags = this.serializeFeatureFlags(featureFlags);

    return await this.licenseRepository.save(license);
  }

  async delete(licenseID: string): Promise<ILicense> {
    const license = await this.getLicenseOrFail(licenseID, {
      relations: [],
    });

    if (license.authorization)
      await this.authorizationPolicyService.delete(license.authorization);

    return await this.licenseRepository.remove(license as License);
  }

  async getLicenseOrFail(
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
        LogContext.CALENDAR
      );
    return license;
  }

  updateLicense(
    license: ILicense,
    licenseUpdateData: UpdateLicenseInput
  ): ILicense {
    if (licenseUpdateData.visibility) {
      license.visibility = licenseUpdateData.visibility;
    }
    if (licenseUpdateData.featureFlags) {
      const featureFlags = this.getFeatureFlags(license);
      for (const flag of licenseUpdateData.featureFlags) {
        if (LicenseFeatureFlagName.hasOwnProperty(flag.name)) {
          const propName: string =
            LicenseFeatureFlagName[
              flag.name as keyof typeof LicenseFeatureFlagName
            ];
          const matchedFlag = featureFlags.find(f => f.name === propName);
          if (matchedFlag) matchedFlag.enabled = flag.enabled;
        }
      }
      license.featureFlags = this.serializeFeatureFlags(featureFlags);
    }
    return license;
  }

  async save(license: ILicense): Promise<ILicense> {
    return await this.licenseRepository.save(license);
  }

  getFeatureFlags(license: ILicense): ILicenseFeatureFlag[] {
    return this.deserializeFeatureFlags(license.featureFlags);
  }

  public isFeatureFlagEnabled(
    license: ILicense,
    flag: LicenseFeatureFlagName
  ): boolean {
    const featureFlags = this.getFeatureFlags(license);
    const requestedFlag = featureFlags.find(f => f.name === flag);
    if (requestedFlag) return requestedFlag.enabled;
    return false;
  }

  private deserializeFeatureFlags(
    featureFlagStr: string
  ): ILicenseFeatureFlag[] {
    return JSON.parse(featureFlagStr);
  }

  private serializeFeatureFlags(featureFlags: ILicenseFeatureFlag[]): string {
    return JSON.stringify(featureFlags);
  }
}
