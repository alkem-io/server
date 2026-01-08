import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { POLICY_INVALIDATION_CLIENT } from './injection.token';
import { PolicyInvalidationMessage } from './policy.invalidation.types';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { POLICY_INVALIDATION_IDS_PER_MESSAGE } from './policy.invalidation.constants';

@Injectable()
export class PolicyInvalidationPublisher {
  private readonly subject: string;
  private readonly idsPerMessage: number;

  constructor(
    @Inject(POLICY_INVALIDATION_CLIENT) private readonly client: ClientProxy,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    // Resolve once at startup; this is config, not runtime state.
    this.subject = this.configService.get(
      'microservices.policy_invalidation.subject',
      {
        infer: true,
      }
    );

    this.idsPerMessage = POLICY_INVALIDATION_IDS_PER_MESSAGE;
  }

  public publishPolicyInvalidations(policyIds: string[]): void {
    if (!policyIds.length) {
      return;
    }

    // de-duplicate IDs
    const idSet = new Set<string>(policyIds);
    const uniqueIds = Array.from(idSet);

    for (let i = 0; i < uniqueIds.length; i += this.idsPerMessage) {
      const batch = uniqueIds.slice(i, i + this.idsPerMessage);
      const payload: PolicyInvalidationMessage = { policyIds: batch };

      try {
        this.client.emit(this.subject, payload);
      } catch (error: any) {
        // Don't block persistence flows on cache invalidation failures.
        this.logger.warn?.(
          {
            message: 'Failed to publish policy invalidation message',
            policyIds: batch,
            subject: this.subject,
            error: error?.message,
          },
          LogContext.AUTH
        );
      }
    }
  }
}
