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
import { UpdateLicenseInput } from './dto/license.dto.update';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { CreateLicenseInput } from './dto/license.dto.create';

@Injectable()
export class LicenseService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(License)
    private licenseRepository: Repository<License>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createLicense(
    licenseInput: CreateLicenseInput
  ): Promise<ILicense> {
    const license: ILicense = License.create();
    this.updateLicense(license, licenseInput);

    license.authorization = AuthorizationPolicy.create();
    // default to active space
    license.visibility = licenseInput.visibility || SpaceVisibility.ACTIVE;

    return await this.licenseRepository.save(license);
  }

  async delete(licenseID: string): Promise<ILicense> {
    const license = await this.getLicenseOrFail(licenseID);

    if (license.authorization)
      await this.authorizationPolicyService.delete(license.authorization);

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

    return await this.save(license);
  }

  async save(license: ILicense): Promise<ILicense> {
    return await this.licenseRepository.save(license);
  }
}
