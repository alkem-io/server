import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { CreateOrganizationVerificationInput } from './dto/organization.verification.dto.create';
import { OrganizationVerification } from './organization.verification.entity';
import { IOrganizationVerification } from './organization.verification.interface';

@Injectable()
export class OrganizationVerificationService {
  constructor(
    @InjectRepository(OrganizationVerification)
    private organizationVerificationRepository: Repository<OrganizationVerification>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private lifecycleService: LifecycleService
  ) {}

  async createOrganizationVerification(
    organizationVerificationData: CreateOrganizationVerificationInput
  ): Promise<IOrganizationVerification> {
    const organizationVerification: IOrganizationVerification =
      OrganizationVerification.create({ ...organizationVerificationData });

    organizationVerification.status = OrganizationVerificationEnum.NOT_VERIFIED;
    organizationVerification.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.ORGANIZATION_VERIFICATION
    );

    // save the user to get the id assigned
    await this.organizationVerificationRepository.save(
      organizationVerification
    );

    // Create the lifecycle
    organizationVerification.lifecycle =
      await this.lifecycleService.createLifecycle();

    return organizationVerification;
  }

  async delete(
    organizationVerificationID: string
  ): Promise<IOrganizationVerification> {
    const organizationVerification =
      await this.getOrganizationVerificationOrFail(organizationVerificationID, {
        relations: { lifecycle: true },
      });

    if (organizationVerification.authorization)
      await this.authorizationPolicyService.delete(
        organizationVerification.authorization
      );

    if (organizationVerification.lifecycle) {
      await this.lifecycleService.deleteLifecycle(
        organizationVerification.lifecycle.id
      );
    }

    const result = await this.organizationVerificationRepository.remove(
      organizationVerification as OrganizationVerification
    );
    result.id = organizationVerificationID;
    return result;
  }

  async save(
    organizationVerification: IOrganizationVerification
  ): Promise<IOrganizationVerification> {
    return await this.organizationVerificationRepository.save(
      organizationVerification
    );
  }
  async getOrganizationVerificationOrFail(
    organizationVerificationID: string,
    options?: FindOneOptions<OrganizationVerification>
  ): Promise<IOrganizationVerification | never> {
    const organizationVerification =
      await this.organizationVerificationRepository.findOne({
        where: { id: organizationVerificationID },
        ...options,
      });
    if (!organizationVerification)
      throw new EntityNotFoundException(
        `Unable to find organizationVerification with ID: ${organizationVerificationID}`,
        LogContext.COMMUNITY
      );
    return organizationVerification;
  }
}
