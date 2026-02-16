import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CreateLicensePlanInput } from './dto/license.plan.dto.create';
import { DeleteLicensePlanInput } from './dto/license.plan.dto.delete';
import { UpdateLicensePlanInput } from './dto/license.plan.dto.update';
import { LicensePlan } from './license.plan.entity';
import { licensePlans } from './license.plan.schema';
import { ILicensePlan } from './license.plan.interface';

@Injectable()
export class LicensePlanService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
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
    const [saved] = await this.db
      .insert(licensePlans)
      .values(licensePlan as any)
      .onConflictDoUpdate({
        target: licensePlans.id,
        set: licensePlan as any,
      })
      .returning();
    return saved as unknown as ILicensePlan;
  }

  public async update(
    licensePlanData: UpdateLicensePlanInput
  ): Promise<ILicensePlan> {
    const licensePlan = await this.getLicensePlanOrFail(licensePlanData.ID);

    return await this.save(licensePlan);
  }

  public async deleteLicensePlan(
    deleteData: DeleteLicensePlanInput
  ): Promise<ILicensePlan> {
    const licensePlan = await this.getLicensePlanOrFail(deleteData.ID);

    await this.db
      .delete(licensePlans)
      .where(eq(licensePlans.id, deleteData.ID));
    licensePlan.id = deleteData.ID;
    return licensePlan;
  }

  public async getLicensePlanOrFail(
    licensePlanID: string,
    options?: { relations?: Record<string, boolean> }
  ): Promise<ILicensePlan | never> {
    const with_ = options?.relations
      ? Object.fromEntries(
          Object.entries(options.relations).map(([key, value]) => [key, value])
        )
      : undefined;

    const licensePlan = await this.db.query.licensePlans.findFirst({
      where: eq(licensePlans.id, licensePlanID),
      with: with_ as any,
    });

    if (!licensePlan) {
      throw new EntityNotFoundException(
        `Unable to find LicensePlan with ID: ${licensePlanID}`,
        LogContext.LICENSE
      );
    }
    return licensePlan as unknown as ILicensePlan;
  }

  public async licensePlanByNameExists(name: string): Promise<boolean> {
    const licensePlan = await this.db.query.licensePlans.findFirst({
      where: eq(licensePlans.name, name),
    });

    if (!licensePlan) {
      return false;
    }
    return true;
  }
}
