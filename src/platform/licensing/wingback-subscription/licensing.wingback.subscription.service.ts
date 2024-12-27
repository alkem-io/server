import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CreateCustomer } from '../../../services/external/wingback/types/wingback.type.create.customer';
import { WingbackManager } from '@services/external/wingback/wingback.manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { LicensingGrantedEntitlement } from '../dto/licensing.dto.granted.entitlement';

@Injectable()
export class LicensingWingbackSubscriptionService {
  constructor(
    private readonly wingbackManager: WingbackManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Create a new customer
   * @param data
   * @throws {Error} if the request fails
   */
  public createCustomer(data: CreateCustomer): Promise<{ id: string } | never> {
    return this.wingbackManager.createCustomer(data);
  }

  public async getEntitlements(
    customerId: string
  ): Promise<LicensingGrantedEntitlement[]> {
    const entitlements: LicensingGrantedEntitlement[] = [];
    const wingbackEntitlements =
      await this.wingbackManager.getEntitlements(customerId);
    // Todo: map the wingback entitlements to the entitlements that are understood within Alkemio Licensing
    this.logger.verbose?.(
      `Wingback entitlements: ${JSON.stringify(wingbackEntitlements)}`,
      LogContext.LICENSE
    );
    return entitlements;
  }
}
