import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  WingbackFeatureMapping,
  WingbackFeatureNames,
} from '@platform/licensing/wingback-subscription/wingback.constants';
import {
  isWingbackFeaturePerUnit,
  WingbackFeatureDetailPerUnit,
} from '@services/external/wingback/types/entitlement-details/wingback.feature.detail.per.unit';
import { CreateWingbackCustomer } from '@services/external/wingback/types/wingback.type.create.customer';
import {
  WingbackFeature,
  WingbackTypedFeature,
} from '@services/external/wingback/types/wingback.type.feature';
import { WingbackManager } from '@services/external/wingback/wingback.manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LicensingGrantedEntitlement } from '../dto/licensing.dto.granted.entitlement';

@Injectable()
export class LicensingWingbackSubscriptionService {
  constructor(
    private readonly wingbackManager: WingbackManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public isEnabled(): boolean {
    return this.wingbackManager.isEnabled();
  }

  /**
   * Create a new customer
   * @param data
   * @throws {Error} if the request fails
   */
  public createCustomer(
    data: CreateWingbackCustomer
  ): Promise<{ id: string } | never> {
    return this.wingbackManager.createCustomer(data);
  }

  /**
   * Returns the supported by Alkemio entitlements for the customer
   * @param customerId
   * @throws {Error}
   */
  public async getEntitlements(
    customerId: string
  ): Promise<LicensingGrantedEntitlement[]> {
    const wingbackFeatures =
      await this.wingbackManager.getEntitlements(customerId);

    this.logger.verbose?.(
      `Wingback returned with ${wingbackFeatures.length} features for customer: '${customerId}'`,
      LogContext.WINGBACK
    );

    return this.toLicensingGrantedEntitlements(wingbackFeatures);
  }

  /**
   * Maps Wingback features to LicensingGrantedEntitlements.
   * Supports only PER-UNIT pricing strategy
   * @param features
   */
  private toLicensingGrantedEntitlements = (
    features: WingbackFeature[]
  ): LicensingGrantedEntitlement[] => {
    const supportedFeatures = features.filter(
      (
        feature
      ): feature is WingbackTypedFeature<WingbackFeatureDetailPerUnit> =>
        isWingbackFeaturePerUnit(feature)
    );
    this.logger.verbose?.(
      `Filtering only "per_unit" pricing strategy features - found ${supportedFeatures.length}.`,
      LogContext.WINGBACK
    );

    const entitlements: (LicensingGrantedEntitlement | undefined)[] =
      supportedFeatures.map(({ slug, entitlement_details }) => {
        const licenseEntitlementType =
          WingbackFeatureMapping[slug as WingbackFeatureNames];
        if (!licenseEntitlementType) {
          // if the entitlement name is not recognized return undefined
          this.logger.warn?.(
            `Unsupported mapping between the Wingback feature: "${slug}" and Alkemio`
          );
          return undefined;
        }

        return {
          type: licenseEntitlementType,
          limit: Number(entitlement_details.contracted_unit_count),
        };
      });

    return entitlements.filter(
      (entitlement): entitlement is LicensingGrantedEntitlement => !!entitlement
    );
  };
}
