import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILicense } from './license.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { License } from './license.entity';
import { CreateLicenseInput } from './dto/license.dto.create';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LicenseEntitlementService } from '../license-entitlement/license.entitlement.service';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ILicenseEntitlement } from '../license-entitlement/license.entitlement.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';

@Injectable()
export class LicenseService {
  constructor(
    private entitlementService: LicenseEntitlementService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(License)
    private licenseRepository: Repository<License>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createLicense(licenseData: CreateLicenseInput): Promise<ILicense> {
    const license: ILicense = License.create(licenseData);
    license.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.LICENSE
    );
    license.entitlements = [];

    for (const entitlementData of licenseData.entitlements) {
      const entitlement =
        this.entitlementService.createEntitlement(entitlementData);
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

  async removeLicense(licenseID: string): Promise<ILicense> {
    // Note need to load it in with all contained entities so can remove fully
    const license = await this.getLicenseOrFail(licenseID, {
      relations: {
        entitlements: true,
      },
    });
    const entitlements = this.getEntitlementsFromLicenseOrFail(license);

    for (const entitlement of entitlements) {
      await this.entitlementService.deleteEntitlement(entitlement.id);
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
      LogContext.AUTH
    );
    await this.licenseRepository.save(licenses, {
      chunk: 100,
    });
  }

  public async getEntitlements(
    license: ILicense
  ): Promise<ILicenseEntitlement[]> {
    let entitlements = license.entitlements;
    if (!entitlements) {
      const licenseWithEntitlements = await this.getLicenseOrFail(license.id, {
        relations: { entitlements: true },
      });
      entitlements = licenseWithEntitlements.entitlements;
    }
    return this.getEntitlementsFromLicenseOrFail(license);
  }

  public reset(license: ILicense): ILicense {
    const entitlements = this.getEntitlementsFromLicenseOrFail(license);
    for (const entitlement of entitlements) {
      this.entitlementService.reset(entitlement);
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

  public isEntitlementAvailable(
    license: ILicense | undefined,
    entitlementType: LicenseEntitlementType,
    entitlementsUsed: number
  ): boolean {
    const entitlements = this.getEntitlementsFromLicenseOrFail(license);
    const entitlement = this.getEntitlementFromEntitlementsOrFail(
      entitlements,
      entitlementType
    );
    const entitlementLimit = entitlement.limit;
    return entitlementsUsed < entitlementLimit;
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

  private getEntitlementsFromLicenseOrFail(
    license: ILicense | undefined
  ): ILicenseEntitlement[] {
    if (!license) {
      throw new RelationshipNotFoundException(
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
      throw new RelationshipNotFoundException(
        `Unable to find entitlement of type ${type} in Entitlements for License: ${JSON.stringify(entitlements)}`,
        LogContext.LICENSE
      );
    }
    return entitlement;
  }
}
