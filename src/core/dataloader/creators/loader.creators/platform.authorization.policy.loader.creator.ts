import {
  DataLoaderCreator,
  DataLoaderCreatorOptions,
} from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Injectable } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import DataLoader from 'dataloader';

/**
 * Per-request access to the platform authorization policy, for field
 * resolvers that check a platform-anchored privilege once per row (e.g. the
 * gated `promote` fields on admin lists). Without it each row would re-run
 * the platform `findOne`; with it a list of N rows costs one lookup.
 */
@Injectable()
export class PlatformAuthorizationPolicyLoaderCreator
  implements DataLoaderCreator<IAuthorizationPolicy>
{
  /** The single key every caller loads: there is exactly one platform
   * policy. A static rather than a module export, because every export of
   * the creators barrel is registered as a provider. */
  public static readonly KEY = 'platform';

  constructor(
    private readonly platformAuthorizationPolicyService: PlatformAuthorizationPolicyService
  ) {}

  public create(
    options?: DataLoaderCreatorOptions<IAuthorizationPolicy>
  ): ILoader<IAuthorizationPolicy> {
    return new DataLoader<string, IAuthorizationPolicy>(
      async keys => {
        const policy =
          await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
        return keys.map(() => policy);
      },
      { cache: options?.cache, name: this.constructor.name }
    );
  }
}
