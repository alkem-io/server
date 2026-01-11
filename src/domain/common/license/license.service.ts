import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILicense } from './license.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { License } from './license.entity';
import { CreateLicenseInput } from './dto/license.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LicenseEntitlementService } from '../license-entitlement/license.entitlement.service';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ILicenseEntitlement } from '../license-entitlement/license.entitlement.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseEntitlementNotAvailableException } from '@common/exceptions/license.entitlement.not.available.exception';

@Injectable()
export class LicenseService {
  constructor(
    private licenseEntitlementService: LicenseEntitlementService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(License)
    private licenseRepository: Repository<License>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  createLicense(licenseData: CreateLicenseInput): ILicense {
    const license: ILicense = License.create(licenseData);
    license.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.LICENSE
    );
    license.entitlements = [];

    for (const entitlementData of licenseData.entitlements) {
      const entitlement =
        this.licenseEntitlementService.createEntitlement(entitlementData);
      license.entitlements.push(entitlement);
    }

    return license;
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
        `Unable to find License with ID: ${licenseID}`,
        LogContext.LICENSE
      );
    return license;
  }

  async removeLicenseOrFail(licenseID: string): Promise<ILicense | never> {
    // Note need to load it in with all contained entities so can remove fully
    const license = await this.getLicenseOrFail(licenseID, {
      relations: {
        entitlements: true,
      },
    });
    const entitlements = this.getEntitlementsFromLicenseOrFail(license);

    for (const entitlement of entitlements) {
      await this.licenseEntitlementService.deleteEntitlementOrFail(
        entitlement.id
      );
    }

    if (license.authorization)
      await this.authorizationPolicyService.delete(license.authorization);

    const deletedLicense = await this.licenseRepository.remove(
      license as License
    );
    deletedLicense.id = license.id;
    return deletedLicense;
  }

  async save(license: ILicense): Promise<ILicense> {
    return this.licenseRepository.save(license);
  }

  async saveAll(licenses: ILicense[]): Promise<void> {
    this.logger.verbose?.(
      `Saving ${licenses.length} licenses`,
      LogContext.LICENSE
    );
    await this.licenseRepository.save(licenses, {
      chunk: 100,
    });
  }

  public async getEntitlements(
    licenseInput: ILicense
  ): Promise<ILicenseEntitlement[]> {
    let license = licenseInput;
    if (!license.entitlements) {
      license = await this.getLicenseOrFail(licenseInput.id, {
        relations: {
          entitlements: true,
        },
      });
    }
    return this.getEntitlementsFromLicenseOrFail(license);
  }

  public async getMyLicensePrivilegesOrFail(
    licenseInput: ILicense
  ): Promise<LicenseEntitlementType[] | never> {
    let license = licenseInput;
    if (!license.entitlements) {
      license = await this.getLicenseOrFail(licenseInput.id, {
        relations: {
          entitlements: true,
        },
      });
    }
    const entitlements = this.getEntitlementsFromLicenseOrFail(license);
    const availableEntitlements = (
      await Promise.all(
        entitlements.map(async entitlement => ({
          entitlement,
          isAvailable:
            await this.licenseEntitlementService.isEntitlementAvailable(
              entitlement.id
            ),
        }))
      )
    )
      .filter(({ isAvailable }) => isAvailable)
      .map(({ entitlement }) => entitlement.type);

    return availableEntitlements;
  }

  public reset(license: ILicense): ILicense {
    const entitlements = this.getEntitlementsFromLicenseOrFail(license);
    for (const entitlement of entitlements) {
      this.licenseEntitlementService.reset(entitlement);
    }
    return license;
  }

  public getEntitlementLimit(
    license: ILicense | undefined,
    entitlementType: LicenseEntitlementType
  ): number {
    const entitlements = this.getEntitlementsFromLicenseOrFail(license);
    const entitlement = this.getEntitlementFromEntitlementsOrFail(
      entitlements,
      entitlementType
    );
    return entitlement.limit;
  }

  public async isEntitlementAvailable(
    license: ILicense,
    entitlementType: LicenseEntitlementType
  ): Promise<boolean> {
    const entitlements = this.getEntitlementsFromLicenseOrFail(license);
    const entitlement = this.getEntitlementFromEntitlementsOrFail(
      entitlements,
      entitlementType
    );
    return await this.licenseEntitlementService.isEntitlementAvailableUsingEntities(
      license,
      entitlement
    );
  }

  public isEntitlementEnabled(
    license: ILicense | undefined,
    entitlementType: LicenseEntitlementType
  ): boolean {
    const entitlements = this.getEntitlementsFromLicenseOrFail(license);
    const entitlement = this.getEntitlementFromEntitlementsOrFail(
      entitlements,
      entitlementType
    );
    return entitlement.enabled;
  }

  public isEntitlementEnabledOrFail(
    license: ILicense | undefined,
    entitlementType: LicenseEntitlementType
  ): void {
    const enabled = this.isEntitlementEnabled(license, entitlementType);
    if (!enabled) {
      throw new LicenseEntitlementNotAvailableException(
        `Entitlement ${entitlementType} is not available for License: ${license?.id}`,
        LogContext.LICENSE
      );
    }
  }

  public findAndCopyParentEntitlement(
    childEntitlement: ILicenseEntitlement,
    parentEntitlements: ILicenseEntitlement[]
  ): void {
    const parentEntitlement = parentEntitlements.find(
      e => e.type === childEntitlement.type
    );
    if (!parentEntitlement) {
      throw new EntityNotFoundException(
        `Parent entitlement not found: ${childEntitlement.type}`,
        LogContext.LICENSE
      );
    }
    childEntitlement.limit = parentEntitlement.limit;
    childEntitlement.enabled = parentEntitlement.enabled;
    childEntitlement.dataType = parentEntitlement.dataType;
  }

  private getEntitlementsFromLicenseOrFail(
    license: ILicense | undefined
  ): ILicenseEntitlement[] | never {
    if (!license) {
      throw new EntityNotFoundException(
        'Unable to load Entitlements for License',
        LogContext.LICENSE
      );
    }
    if (!license.entitlements) {
      throw new RelationshipNotFoundException(
        `Unable to load Entitlements for License: ${license.id}`,
        LogContext.LICENSE
      );
    }
    return license.entitlements;
  }

  private getEntitlementFromEntitlementsOrFail(
    entitlements: ILicenseEntitlement[],
    type: LicenseEntitlementType
  ): ILicenseEntitlement {
    const entitlement = entitlements.find(
      entitlement => entitlement.type === type
    );
    if (!entitlement) {
      throw new EntityNotFoundException(
        `Unable to find entitlement of type ${type} in Entitlements for License: ${JSON.stringify(entitlements)}`,
        LogContext.LICENSE
      );
    }
    return entitlement;
  }
}
