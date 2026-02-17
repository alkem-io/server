import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { CreateOrganizationVerificationInput } from './dto/organization.verification.dto.create';
import { OrganizationVerification } from './organization.verification.entity';
import { IOrganizationVerification } from './organization.verification.interface';
import { organizationVerifications } from './organization.verification.schema';

@Injectable()
export class OrganizationVerificationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
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

    // save the entity to get the id assigned
    const saved = await this.save(organizationVerification);

    // Create the lifecycle
    saved.lifecycle =
      await this.lifecycleService.createLifecycle();

    return saved;
  }

  async delete(
    organizationVerificationID: string
  ): Promise<IOrganizationVerification> {
    const orgVerification =
      await this.getOrganizationVerificationOrFail(
        organizationVerificationID,
        { with: { lifecycle: true, authorization: true } }
      );

    if (orgVerification.authorization)
      await this.authorizationPolicyService.delete(
        orgVerification.authorization
      );

    if (orgVerification.lifecycle) {
      await this.lifecycleService.deleteLifecycle(
        orgVerification.lifecycle.id
      );
    }

    await this.db
      .delete(organizationVerifications)
      .where(eq(organizationVerifications.id, organizationVerificationID));
    return orgVerification;
  }

  async save(
    organizationVerification: IOrganizationVerification
  ): Promise<IOrganizationVerification> {
    if (organizationVerification.id) {
      const [updated] = await this.db
        .update(organizationVerifications)
        .set({
          status: organizationVerification.status,
          organizationID: organizationVerification.organizationID,
          lifecycleId: organizationVerification.lifecycle?.id ?? null,
          authorizationId: organizationVerification.authorization?.id ?? null,
        })
        .where(eq(organizationVerifications.id, organizationVerification.id))
        .returning();
      return { ...organizationVerification, ...updated } as unknown as IOrganizationVerification;
    }
    const [inserted] = await this.db
      .insert(organizationVerifications)
      .values({
        status: organizationVerification.status,
        organizationID: organizationVerification.organizationID,
        lifecycleId: organizationVerification.lifecycle?.id ?? null,
        authorizationId: organizationVerification.authorization?.id ?? null,
      })
      .returning();
    return { ...organizationVerification, ...inserted } as unknown as IOrganizationVerification;
  }
  async getOrganizationVerificationOrFail(
    organizationVerificationID: string,
    options?: { with?: Record<string, boolean | object> }
  ): Promise<IOrganizationVerification | never> {
    const result =
      await this.db.query.organizationVerifications.findFirst({
        where: eq(organizationVerifications.id, organizationVerificationID),
        with: options?.with,
      });
    if (!result)
      throw new EntityNotFoundException(
        `Unable to find organizationVerification with ID: ${organizationVerificationID}`,
        LogContext.COMMUNITY
      );
    return result as unknown as IOrganizationVerification;
  }
}
