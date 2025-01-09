import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { WingbackManager } from '@services/external/wingback/wingback.manager';
import {
  WingbackFeature,
  WingbackTypedFeature,
} from '@services/external/wingback/types/wingback.type.feature';
import {
  isWingbackFeaturePerUnit,
  WingbackFeatureDetailPerUnit,
} from '@services/external/wingback/types/entitlement-details/wingback.feature.detail.per.unit';
import {
  WingbackFeatureMapping,
  WingbackFeatureNames,
} from '@platform/licensing/wingback-subscription/wingback.constants';
import { CreateCustomer } from '@services/external/wingback/types/wingback.type.create.customer';
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
    this.logger.verbose?.(
      'Filtering only "per_unit" pricing strategy features',
      LogContext.WINGBACK
    );
    const supportedFeatures = features.filter(
      (
        feature
      ): feature is WingbackTypedFeature<WingbackFeatureDetailPerUnit> =>
        isWingbackFeaturePerUnit(feature)
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
